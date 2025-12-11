export interface User {
  id: string;
  username: string;
  avatar: string; // Emoji or URL
  isGuest: boolean;
  progress: Record<string, TopicProgress>; // Map TEKS ID to progress
  badges: string[];
  settings: {
    soundEnabled: boolean;
    voiceEnabled: boolean;
    highContrast: boolean;
  };
}

export interface TopicProgress {
  masteryScore: number; // 0-100
  completedLessons: string[]; // IDs
  quizScores: Record<string, number>;
}

export interface TeksTopic {
  id: string;
  code: string; // e.g., "5.2.A"
  title: string;
  description: string;
  category: 'Number' | 'Algebra' | 'Geometry' | 'Data';
}

export interface Slide {
  id: string;
  type: 'text' | 'diagram' | 'interactive';
  content: string; // Markdown or instruction
  diagramType?: 'fraction-circles' | 'number-line' | 'blocks' | 'none';
  narration?: string; // Text to be spoken
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  slides: Slide[];
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'open-response';
  options?: string[]; // For MCQ
  correctAnswer?: string; // For MCQ
  modelAnswer?: string; // For Open Response (used for AI grading comparison)
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  feedback: string;
}
