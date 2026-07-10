// ========== 核心数据模型 ==========

export interface Plan {
  id: string;
  title: string;
  description: string;
  goal: string;
  color: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanItem {
  id: string;
  planId: string;
  title: string;
  description: string;
  type: 'study' | 'practice' | 'review' | 'output' | 'other';
  estimatedMinutes: number;
  order: number;
  dependencies: string[]; // 前置依赖的 PlanItem id 列表
  reviewConfig: ReviewConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewConfig {
  enabled: boolean;
  strategy: 'sm2' | 'fixed';
  intervals: number[]; // 固定间隔天数，如 [1, 3, 7, 15, 30]
}

export interface ScheduleEntry {
  id: string;
  planItemId: string;
  planId: string;
  date: string; // YYYY-MM-DD 格式
  startTime: string; // HH:mm 格式
  endTime: string; // HH:mm 格式
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  isCompleted: boolean;
  completedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewCard {
  id: string;
  planItemId: string;
  planId: string;
  nextReviewDate: string; // YYYY-MM-DD
  interval: number; // 当前间隔天数
  easeFactor: number; // SM-2 简易因子
  reps: number; // 复习次数
  status: 'due' | 'upcoming' | 'completed';
  reviewHistory: ReviewRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewRecord {
  date: string; // YYYY-MM-DD
  score: ReviewScore;
}

export type ReviewScore = 0 | 1 | 2 | 3 | 4 | 5; // SM-2 评分：0=完全忘记, 5=完美回忆

export interface PlanOutput {
  id: string;
  planId: string;
  planItemId: string | null;
  title: string;
  content: string; // Markdown 内容
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ========== 设置模型 ==========

export interface AppSettings {
  id: string;
  aiProvider: 'openai' | 'tongyi' | 'deepseek' | 'custom';
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string; // 自定义 API Base URL
  notificationsEnabled: boolean;
  notificationAdvanceMinutes: number;
  defaultReviewStrategy: 'sm2' | 'fixed';
  defaultReviewIntervals: number[];
}

// ========== 视图模型 ==========

export type CalendarView = 'day' | 'week' | 'month';

export interface AIGenerateRequest {
  goal: string;
  availableHoursPerDay: number;
  availableDays: string[]; // ['monday', 'tuesday', ...]
  startDate: string;
  endDate: string;
  preferences: string;
}

export interface AIGenerateResponse {
  planTitle: string;
  planDescription: string;
  planItems: AIPlanItem[];
}

export interface AIPlanItem {
  title: string;
  description: string;
  type: PlanItem['type'];
  estimatedMinutes: number;
  suggestedDate: string;
  suggestedStartTime: string;
  reviewEnabled: boolean;
}
