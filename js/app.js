import { isNativeApp, isDesktopApp, platform } from './native.js';

// Things that close on Android back before the page itself goes back, newest first:
// an open Settings panel, for one (#131). onBack(fn) returns a function that removes it.
const backHandlers = [];
export function onBack(fn) {
  backHandlers.push(fn);
  return () => {
    const i = backHandlers.lastIndexOf(fn);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

// Native-app behaviour shared by every page. No-op on the website.
//   home: true on the technique list, false on practice pages.
export function initAppShell({ home }) {
  if (isDesktopApp) document.documentElement.classList.add('desktop-app');
  if (!isNativeApp) return;
  const root = document.documentElement;
  root.classList.add('native-app');
  root.dataset.platform = platform;

  // Android back: closes whatever is open (Settings); otherwise practice page → the
  // list, and the list → leave the app.
  const cap = window.Capacitor;
  if (platform === 'android' && typeof cap.nativeCallback === 'function') {
    cap.nativeCallback('App', 'addListener', { eventName: 'backButton' }, () => {
      const handler = backHandlers.at(-1);
      if (handler) handler();
      else if (home) cap.nativePromise('App', 'exitApp', {});
      else window.location.href = './';
    });
  }
}
