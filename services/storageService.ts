
import { PredictionRecord } from "../types";

const STORAGE_KEY = 'ashare_ai_scientific_v3';

export const StorageService = {
  saveHistory: (history: PredictionRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },
  loadHistory: (): PredictionRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  // 未来可以轻松扩展为远程数据库调用
  syncToCloud: async (data: PredictionRecord[]) => {
    console.log("Cloud sync placeholder - Ready for Supabase/Firebase integration");
  }
};
