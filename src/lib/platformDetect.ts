import { Capacitor } from '@capacitor/core';

/**
 * Detect if running in a native environment (Capacitor or WebView APK).
 * In these environments, CORS is not restricted, so streams can play directly.
 */
export const isNativeOrWebView = (): boolean => {
  // Capacitor native app
  if (Capacitor.isNativePlatform()) return true;
  
  // WebView APK detection via user agent
  const ua = navigator.userAgent || '';
  if (ua.includes('ArabiaTV')) return true;
  
  // Android WebView detection
  if (ua.includes('wv') && ua.includes('Android')) return true;
  
  // Generic WebView indicators
  if (typeof (window as any).Android !== 'undefined') return true;
  if ((window as any).webkit?.messageHandlers) return true;
  
  return false;
};
