import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Lesson, Question, QuizResult, Slide, TeksTopic } from "../types";

let aiClient: GoogleGenAI | null = null;

// Helper to get client securely
const getAiClient = () => {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      console.error("API_KEY is missing from environment variables");
      throw new Error("API Key missing");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

/**
 * Generates audio narration for a given text using Gemini TTS.
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = getAiClient();
    // Using a friendly system instruction to guide tone
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Friendly female voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * Generates a full lesson plan if one doesn't exist locally.
 */
export const generateLessonContent = async (topic: TeksTopic): Promise<Lesson> => {
  const ai = getAiClient();
  const prompt = `
    Create a 5th-grade math lesson for Texas TEKS topic: ${topic.code} - ${topic.title}.
    Description: ${topic.description}.
    
    The lesson should have 4 slides:
    1. Introduction/Hook (real world example)
    2. Concept Explanation (clear simple terms)
    3. Step-by-Step Example
    4. Summary
    
    Return a JSON object matching this schema:
    {
      "title": "Fun lesson title",
      "slides": [
        {
          "id": "slide-1",
          "type": "text",
          "content": "Markdown content for slide",
          "narration": "Text specific for speech synthesis that sounds conversational",
          "diagramType": "none"
        }
      ]
    }
    For diagramType, use 'fraction-circles' if fractions involved, 'number-line' for ordering, or 'blocks' for counting. Otherwise 'none'.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["text", "diagram", "interactive"] },
                content: { type: Type.STRING },
                narration: { type: Type.STRING },
                diagramType: { type: Type.STRING, enum: ["fraction-circles", "number-line", "blocks", "none"] }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);
  
  return {
    id: `lesson-${Date.now()}`,
    topicId: topic.id,
    title: data.title,
    slides: data.slides
  };
};

/**
 * Generates quiz questions based on difficulty.
 */
export const generateQuiz = async (topic: TeksTopic, difficulty: 'easy' | 'medium' | 'hard'): Promise<Question[]> => {
  const ai = getAiClient();
  const prompt = `
    Create 3 ${difficulty} difficulty practice questions for 5th grade math topic ${topic.code}: ${topic.title}.
    Mix Multiple Choice and Open Response.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["multiple-choice", "open-response"] },
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            modelAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          }
        }
      }
    }
  });

  const text = response.text || "[]";
  return JSON.parse(text);
};

/**
 * Grades an open response question.
 */
export const gradeOpenResponse = async (question: Question, userAnswer: string): Promise<{isCorrect: boolean, feedback: string}> => {
  const ai = getAiClient();
  const prompt = `
    You are a 5th grade math teacher. Grade this answer.
    Question: ${question.text}
    Model Answer: ${question.modelAnswer}
    Student Answer: ${userAnswer}
    
    Is the student correct? (True/False). Provide short, encouraging feedback.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING }
        }
      }
    }
  });

   const text = response.text || "{}";
   return JSON.parse(text);
};
