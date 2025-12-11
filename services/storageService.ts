import { User, TopicProgress } from "../types";
import { INITIAL_USER } from "../constants";

const STORAGE_KEY = 'sparky_math_user';

export const saveUser = (user: User) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const loadUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearUser = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const updateProgress = (user: User, topicId: string, score: number): User => {
  const currentProgress = user.progress[topicId] || { masteryScore: 0, completedLessons: [], quizScores: {} };
  
  // Simple mastery calculation: average of last few scores, capped at 100
  const newMastery = Math.min(100, Math.max(currentProgress.masteryScore, score));
  
  const updatedUser = {
    ...user,
    progress: {
      ...user.progress,
      [topicId]: {
        ...currentProgress,
        masteryScore: newMastery,
      }
    }
  };
  
  saveUser(updatedUser);
  return updatedUser;
};
