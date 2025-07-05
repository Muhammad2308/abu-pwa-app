// Device fingerprinting utility for session management
export const generateDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL(),
    webgl: getWebGLFingerprint(),
    fonts: getFontList(),
    plugins: getPluginList(),
    timestamp: Date.now()
  };
  
  return btoa(JSON.stringify(fingerprint));
};

const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    return gl.getParameter(gl.VENDOR) + '~' + gl.getParameter(gl.RENDERER);
  } catch (e) {
    return 'error';
  }
};

const getFontList = () => {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const fontList = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New'];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const baseFontWidth = {};
  baseFonts.forEach(baseFont => {
    ctx.font = testSize + ' ' + baseFont;
    baseFontWidth[baseFont] = ctx.measureText(testString).width;
  });
  
  const detectedFonts = fontList.filter(font => {
    let detected = false;
    baseFonts.forEach(baseFont => {
      ctx.font = testSize + ' ' + font + ',' + baseFont;
      const width = ctx.measureText(testString).width;
      if (width !== baseFontWidth[baseFont]) {
        detected = true;
      }
    });
    return detected;
  });
  
  return detectedFonts.join(',');
};

const getPluginList = () => {
  const plugins = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins.join(',');
};

export const getDeviceInfo = () => {
  return {
    fingerprint: generateDeviceFingerprint(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}; 