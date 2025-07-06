// Device Fingerprinting Utility
// Generates a unique fingerprint for device recognition

const generateDeviceFingerprint = () => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    window.screen.width + 'x' + window.screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
    navigator.maxTouchPoints || '',
    'ontouchstart' in window ? 'touch' : 'no-touch',
    window.devicePixelRatio || '',
    navigator.cookieEnabled ? 'cookies' : 'no-cookies',
    navigator.doNotTrack || 'unknown',
    navigator.onLine ? 'online' : 'offline'
  ];

  // Create a simple hash from components
  const fingerprint = components.join('|');
  return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

// Get stored device fingerprint or generate new one
const getDeviceFingerprint = () => {
  let fingerprint = localStorage.getItem('device_fingerprint');
  
  if (!fingerprint) {
    fingerprint = generateDeviceFingerprint();
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  
  return fingerprint;
};

// Clear device fingerprint (for testing)
const clearDeviceFingerprint = () => {
  localStorage.removeItem('device_fingerprint');
};

export { generateDeviceFingerprint, getDeviceFingerprint, clearDeviceFingerprint }; 