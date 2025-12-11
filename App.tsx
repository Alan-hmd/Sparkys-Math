import React, { useState, useEffect, useCallback } from 'react';
import { User, TeksTopic, Lesson, Question } from './types';
import { CURRICULUM, INITIAL_USER, BADGES } from './constants';
import { loadUser, saveUser, updateProgress, clearUser } from './services/storageService';
import { generateLessonContent, generateQuiz, generateSpeech, gradeOpenResponse } from './services/geminiService';
import { audioPlayer } from './services/audioService';
import { FractionCircle, NumberLine, Blocks } from './components/Visuals';

// Icons
const IconStar = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconVolume = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IconVolumeOff = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const IconArrowRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconUser = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

type ViewState = 'login' | 'dashboard' | 'lesson' | 'quiz' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [activeTopic, setActiveTopic] = useState<TeksTopic | null>(null);
  
  // Lesson State
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string>("");

  useEffect(() => {
    const saved = loadUser();
    if (saved) {
      setUser(saved);
      setView('dashboard');
    }
  }, []);

  // --- Auth Handlers ---
  const handleLogin = (username: string, isGuest: boolean) => {
    const newUser: User = { ...INITIAL_USER, id: isGuest ? 'guest' : username, username, isGuest };
    setUser(newUser);
    saveUser(newUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    clearUser();
    setUser(null);
    setView('login');
  };

  // --- Navigation ---
  const startTopic = async (topic: TeksTopic) => {
    setActiveTopic(topic);
    setIsLoadingContent(true);
    setView('lesson');
    
    try {
      // 1. Generate Lesson Content
      const lesson = await generateLessonContent(topic);
      setActiveLesson(lesson);
      setCurrentSlideIndex(0);
      
      // Auto-play TTS for first slide if enabled
      if (user?.settings.voiceEnabled) {
         playNarration(lesson.slides[0].narration || lesson.slides[0].content);
      }
    } catch (e) {
      console.error(e);
      alert("Oops! Sparky couldn't fetch the lesson. Check your internet or API key.");
      setView('dashboard');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // --- Lesson Logic ---
  const playNarration = async (text?: string) => {
    if (!text || !user?.settings.voiceEnabled) return;
    setIsPlayingAudio(true);
    try {
      const audioData = await generateSpeech(text);
      if (audioData) {
        await audioPlayer.playBase64(audioData);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const handleNextSlide = () => {
    if (!activeLesson) return;
    audioPlayer.stop();
    if (currentSlideIndex < activeLesson.slides.length - 1) {
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);
      if (user?.settings.voiceEnabled) {
        playNarration(activeLesson.slides[nextIndex].narration || activeLesson.slides[nextIndex].content);
      }
    } else {
      // End of lesson, start quiz
      startQuiz();
    }
  };

  // --- Quiz Logic ---
  const startQuiz = async () => {
    if (!activeTopic) return;
    setIsLoadingContent(true);
    setView('quiz');
    try {
      const questions = await generateQuiz(activeTopic, 'medium'); // Default to medium
      setQuizQuestions(questions);
      setCurrentQuestionIndex(0);
      setQuizScore(0);
      setQuizCompleted(false);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleAnswerSubmit = async (answer: string) => {
    const question = quizQuestions[currentQuestionIndex];
    let isCorrect = false;
    let feedback = "";

    if (question.type === 'multiple-choice') {
      isCorrect = answer === question.correctAnswer;
      feedback = isCorrect ? "Awesome job!" : `Not quite. The correct answer was ${question.correctAnswer}. ${question.explanation}`;
    } else {
      // AI Grading for open response
      const grading = await gradeOpenResponse(question, answer);
      isCorrect = grading.isCorrect;
      feedback = grading.feedback;
    }

    if (isCorrect) setQuizScore(prev => prev + 1);
    setQuizFeedback(feedback);

    // Wait a moment then go next
    setTimeout(() => {
      setQuizFeedback("");
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        finishQuiz(isCorrect ? quizScore + 1 : quizScore); // Pass updated score
      }
    }, isCorrect ? 1500 : 4000); // Longer delay for wrong answers to read feedback
  };

  const finishQuiz = (finalScore: number) => {
    setQuizCompleted(true);
    if (user && activeTopic) {
      const scorePercentage = (finalScore / quizQuestions.length) * 100;
      const updatedUser = updateProgress(user, activeTopic.id, scorePercentage);
      setUser(updatedUser);
    }
  };

  // --- Rendering Sub-Components ---

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-b-8 border-brand-200">
          <div className="text-6xl mb-4 animate-bounce">🐿️</div>
          <h1 className="text-4xl font-bold text-brand-700 mb-2">Sparky's Math Academy</h1>
          <p className="text-gray-600 mb-8">Ready to master 5th Grade Math?</p>
          
          <form onSubmit={(e) => { e.preventDefault(); const name = (e.target as any).username.value; handleLogin(name, false); }} className="space-y-4">
            <input name="username" type="text" placeholder="What's your name?" className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-brand-500 outline-none text-lg" required />
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl transition shadow-lg transform hover:-translate-y-1">
              Let's Go!
            </button>
          </form>
          <button onClick={() => handleLogin('Guest', true)} className="mt-4 text-gray-500 underline text-sm">
            Just visiting? Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  if (view === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🐿️</span>
            <span className="font-bold text-xl text-brand-800 hidden sm:block">Sparky's Academy</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
              <span className="text-brand-700 font-bold mr-2">{user.username}</span>
              <IconUser />
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500">Sign Out</button>
          </div>
        </header>

        <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Progress Map 🗺️</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CURRICULUM.map(topic => {
                const progress = user.progress[topic.id];
                const score = progress?.masteryScore || 0;
                let color = 'bg-white';
                let border = 'border-gray-200';
                
                if (score >= 80) { color = 'bg-brand-50'; border = 'border-brand-300'; }
                else if (score > 0) { color = 'bg-yellow-50'; border = 'border-yellow-300'; }

                return (
                  <button 
                    key={topic.id}
                    onClick={() => startTopic(topic)}
                    className={`${color} border-2 ${border} p-6 rounded-2xl text-left hover:shadow-lg transition transform hover:-translate-y-1 relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-20 text-6xl font-bold text-gray-900">{topic.code.split('.')[0]}</div>
                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded mb-2 inline-block">{topic.category}</span>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">{topic.title}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{topic.description}</p>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-brand-500 h-2.5 rounded-full" style={{ width: `${score}%` }}></div>
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-1">{score}% Mastered</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Trophy Case 🏆</h3>
            <div className="flex gap-4 flex-wrap">
              {user.badges.length === 0 ? (
                <p className="text-gray-400 italic">Complete lessons to earn badges!</p>
              ) : (
                user.badges.map((b, i) => (
                  <span key={i} className="bg-fun-yellow text-yellow-900 px-3 py-1 rounded-full font-bold shadow-sm">{b}</span>
                ))
              )}
              {Object.keys(user.progress).length > 0 && <span className="bg-fun-yellow text-yellow-900 px-3 py-1 rounded-full font-bold shadow-sm">🌟 Good Start!</span>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Loading Screen ---
  if (isLoadingContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50">
        <div className="text-6xl animate-spin mb-4">⚙️</div>
        <h2 className="text-2xl font-bold text-brand-800">Sparky is thinking...</h2>
        <p className="text-gray-600">Building your custom lesson!</p>
      </div>
    );
  }

  // --- Lesson View ---
  if (view === 'lesson' && activeLesson) {
    const slide = activeLesson.slides[currentSlideIndex];
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col">
        <header className="p-4 flex justify-between items-center bg-white shadow-sm z-20">
          <button onClick={() => { audioPlayer.stop(); setView('dashboard'); }} className="text-gray-500 hover:text-gray-800 font-bold flex items-center gap-1">
             ← Back
          </button>
          <h1 className="font-bold text-brand-800 text-lg">{activeLesson.title}</h1>
          <button onClick={() => {
              if (isPlayingAudio) { audioPlayer.stop(); setIsPlayingAudio(false); }
              else { playNarration(slide.narration || slide.content); }
            }} 
            className={`p-2 rounded-full ${isPlayingAudio ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>
            {isPlayingAudio ? <IconVolume /> : <IconVolumeOff />}
          </button>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-1 bg-brand-200 w-full">
            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${((currentSlideIndex + 1) / activeLesson.slides.length) * 100}%` }} />
          </div>

          <div className={`w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl transition-all duration-500 border-b-8 border-gray-200 ${isPlayingAudio ? 'ring-4 ring-brand-300' : ''}`}>
             
             {/* Dynamic Content Rendering */}
             <div className="prose prose-lg mb-8 text-gray-700">
               {/* Simple Markdown-ish Rendering */}
               {slide.content.split('\n').map((line, i) => {
                 if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-bold text-brand-800 mb-4">{line.replace('# ', '')}</h2>;
                 if (line.startsWith('## ')) return <h3 key={i} className="text-xl font-bold text-brand-700 mb-3">{line.replace('## ', '')}</h3>;
                 if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.replace('- ', '')}</li>;
                 return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
               })}
             </div>

             {/* Diagram Area */}
             <div className="flex justify-center my-6 bg-gray-50 rounded-xl p-4 min-h-[150px] items-center">
                {slide.diagramType === 'fraction-circles' && <div className="flex gap-4"><FractionCircle value={0.5} /><FractionCircle value={0.25} /></div>}
                {slide.diagramType === 'number-line' && <NumberLine highlight={0.5} />}
                {slide.diagramType === 'blocks' && <Blocks count={5} />}
                {slide.diagramType === 'none' && <div className="text-gray-400 text-sm">✨ Imagine this concept ✨</div>}
             </div>

             <div className="flex justify-end mt-8">
               <button onClick={handleNextSlide} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition">
                 {currentSlideIndex === activeLesson.slides.length - 1 ? 'Start Practice' : 'Next'} <IconArrowRight />
               </button>
             </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Quiz View ---
  if (view === 'quiz') {
    if (quizCompleted) {
      return (
        <div className="min-h-screen bg-fun-yellow/10 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Great Effort!</h2>
            <p className="text-xl mb-6">You scored <span className="font-bold text-brand-600">{Math.round((quizScore / quizQuestions.length) * 100)}%</span></p>
            <button onClick={() => setView('dashboard')} className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition">
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const currentQ = quizQuestions[currentQuestionIndex];
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="p-4 border-b">
           <div className="flex justify-between text-gray-500 text-sm font-bold uppercase tracking-wider">
             <span>Practice Mode</span>
             <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
           </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-xl font-medium text-gray-800 leading-relaxed mb-6">{currentQ.text}</h3>
            
            {currentQ.type === 'multiple-choice' && (
              <div className="grid gap-3">
                {currentQ.options?.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleAnswerSubmit(opt)}
                    disabled={!!quizFeedback}
                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition font-medium text-gray-700 disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === 'open-response' && !quizFeedback && (
              <form onSubmit={(e) => { e.preventDefault(); handleAnswerSubmit((e.target as any).ans.value); }}>
                <textarea name="ans" className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-brand-500 outline-none mb-4" rows={4} placeholder="Type your explanation here..." required></textarea>
                <button type="submit" className="bg-brand-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-600">Submit Answer</button>
              </form>
            )}

            {quizFeedback && (
              <div className={`mt-6 p-4 rounded-xl ${quizFeedback.includes('Awesome') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                <p className="font-bold mb-1">{quizFeedback.includes('Awesome') ? 'Correct!' : 'Check this:'}</p>
                <p>{quizFeedback}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return <div>Loading...</div>;
}