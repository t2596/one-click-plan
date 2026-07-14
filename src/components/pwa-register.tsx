'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    // 只在生产环境注册 Service Worker（开发模式会干扰 HMR 热更新）
    if (process.env.NODE_ENV !== 'production') {
      // 开发模式下主动卸载之前可能遗留的 SW
      navigator.serviceWorker?.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker 注册成功:', reg.scope);

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
