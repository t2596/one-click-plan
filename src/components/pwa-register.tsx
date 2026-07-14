'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker 注册成功:', reg.scope);

          // 监听更新
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] 有新版本可用，刷新页面即可更新');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker 注册失败:', err);
        });
    }
  }, []);

  return null;
}
