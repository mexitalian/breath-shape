import { isNativeApp, platform } from './native.js';

// Native-app behaviour shared by every page. No-op on the website.
//   home: true on the technique list, false on practice pages.
export function initAppShell({ home }) {
  if (!isNativeApp) return;
  const root = document.documentElement;
  root.classList.add('native-app');
  root.dataset.platform = platform;

  // Android back: practice page → the list; the list → leave the app.
  const cap = window.Capacitor;
  if (platform === 'android' && typeof cap.nativeCallback === 'function') {
    cap.nativeCallback('App', 'addListener', { eventName: 'backButton' }, () => {
      if (home) cap.nativePromise('App', 'exitApp', {});
      else window.location.href = './';
    });
  }
}
