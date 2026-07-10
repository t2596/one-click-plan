'use client';

import { useEffect } from 'react';
import { usePlanStore } from '@/lib/store';
import { todayStr } from '@/lib/db';

/**
 * 定期检查复习任务并发送桌面通知
 */
export function NotificationService() {
  const { dueReviews, loadDueReviews } = usePlanStore();

  useEffect(() => {
    // 请求通知权限
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // 初始加载
    loadDueReviews();

    // 每小时检查一次待复习任务
    const interval = setInterval(async () => {
      await loadDueReviews();
      const reviews = usePlanStore.getState().dueReviews;

      if (reviews.length > 0 && Notification.permission === 'granted') {
        new Notification('一键计划 - 复习提醒', {
          body: `你今天有 ${reviews.length} 项内容需要复习`,
          icon: '/icon-192.png',
          tag: 'review-reminder',
        });
      }
    }, 60 * 60 * 1000); // 每小时

    return () => clearInterval(interval);
  }, [loadDueReviews]);

  // 当复习列表更新时，如果数量 > 0 发送通知
  useEffect(() => {
    if (dueReviews.length > 0 && typeof window !== 'undefined' && Notification.permission === 'granted') {
      // 避免频繁通知，仅在页面加载和切换时检查
    }
  }, [dueReviews]);

  return null;
}
