import type { ReviewScore } from './types';
import { formatDate, shiftDate } from './db';

/**
 * SM-2 间隔复习算法实现
 * 基于 SuperMemo 2 算法的简化版本
 */

export interface SM2Result {
  interval: number;
  easeFactor: number;
  reps: number;
  nextReviewDate: string;
}

/**
 * 计算下次复习参数
 * @param quality 用户评分 0-5 (0=完全忘记, 5=完美回忆)
 * @param prevInterval 上次间隔天数
 * @param prevEaseFactor 上次简易因子 (最小 1.3)
 * @param prevReps 已复习次数
 * @param today 今天的日期字符串
 */
export function sm2Calculate(
  quality: ReviewScore,
  prevInterval: number,
  prevEaseFactor: number = 2.5,
  prevReps: number = 0,
  today: string = formatDate(new Date())
): SM2Result {
  let newEaseFactor = prevEaseFactor;
  let newInterval: number;
  let newReps = prevReps;

  if (quality >= 3) {
    // 回答正确
    newReps = prevReps + 1;

    switch (newReps) {
      case 1:
        newInterval = 1;
        break;
      case 2:
        newInterval = 6;
        break;
      default:
        newInterval = Math.round(prevInterval * prevEaseFactor);
    }
  } else {
    // 回答错误，重置
    newReps = 0;
    newInterval = 1;
  }

  // 更新简易因子
  newEaseFactor = prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  const nextReviewDate = shiftDate(today, newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    reps: newReps,
    nextReviewDate,
  };
}

/**
 * 根据固定间隔策略计算下次复习日期
 */
export function fixedIntervalCalculate(
  currentIntervalIndex: number,
  intervals: number[],
  today: string = formatDate(new Date())
): { interval: number; nextIndex: number; nextReviewDate: string } {
  const nextIndex = Math.min(currentIntervalIndex + 1, intervals.length - 1);
  const interval = intervals[nextIndex];
  const nextReviewDate = shiftDate(today, interval);

  return { interval, nextIndex, nextReviewDate };
}
