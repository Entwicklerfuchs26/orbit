import type { PlatformInfo } from './types';

export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent.toLowerCase();

  let os: PlatformInfo['os'] = 'unknown';
  if (ua.includes('android')) os = 'android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('win')) os = 'windows';

  const isMobile = os === 'android' || os === 'ios';

  // Tauri injects __TAURI__ on the window object
  const isTauri = '__TAURI__' in window;
  const type: PlatformInfo['type'] = isMobile
    ? 'mobile'
    : isTauri
      ? 'desktop'
      : 'web';

  return { type, os, isMobile, isDesktop: type === 'desktop' };
}
