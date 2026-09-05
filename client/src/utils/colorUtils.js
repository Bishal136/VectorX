// client/src/utils/colorUtils.js

/**
 * Built-in default color theme presets
 */
export const DEFAULT_PRESET_COLORS = [
  { name: 'Emerald Deep', bg: '#124B38', text: '#ffffff' },
  { name: 'Midnight Slate', bg: '#0f172a', text: '#ffffff' },
  { name: 'Indigo Royal', bg: '#3730a3', text: '#ffffff' },
  { name: 'Crimson Bold', bg: '#991b1b', text: '#ffffff' },
  { name: 'Amber Warm', bg: '#78350f', text: '#ffffff' },
  { name: 'Vibrant Red', bg: '#dc2626', text: '#ffffff' },
  { name: 'Electric Blue', bg: '#2563eb', text: '#ffffff' },
  { name: 'Forest Green', bg: '#15803d', text: '#ffffff' },
  { name: 'Violet Purple', bg: '#7c3aed', text: '#ffffff' },
  { name: 'Sunset Coral', bg: '#ea580c', text: '#ffffff' },
];

/**
 * Quick color swatch shortcuts (Hex, RGB, or Named colors)
 */
export const QUICK_COLOR_SWATCHES = [
  { label: 'Red', value: '#ef4444', hint: 'red' },
  { label: 'Blue', value: '#3b82f6', hint: 'blue' },
  { label: 'Green', value: '#10b981', hint: 'green' },
  { label: 'Purple', value: '#8b5cf6', hint: 'purple' },
  { label: 'Amber', value: '#f59e0b', hint: 'amber' },
  { label: 'Rose', value: '#f43f5e', hint: 'rose' },
  { label: 'Cyan', value: '#06b6d4', hint: 'cyan' },
  { label: 'Dark', value: '#0f172a', hint: 'black' },
];

const RGB_REGEX = /^rgba?\(\s*(\d{1,3}%?)\s*[, ]\s*(\d{1,3}%?)\s*[, ]\s*(\d{1,3}%?)(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;
const HSL_REGEX = /^hsla?\(\s*(\d{1,3}(?:deg|rad|turn)?)\s*[, ]\s*(\d{1,3}%)\s*[, ]\s*(\d{1,3}%)(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;

export const NAMED_COLORS = {
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  white: '#ffffff',
  black: '#000000',
  gray: '#808080',
  grey: '#808080',
  slate: '#708090',
  navy: '#000080',
  teal: '#008080',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  coral: '#ff7f50',
  crimson: '#dc143c',
  indigo: '#4b0082',
  violet: '#ee82ee',
  pink: '#ffc0cb',
  gold: '#ffd700',
  silver: '#c0c0c0',
  brown: '#a52a2a',
  turquoise: '#40e0d0',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

/**
 * Check whether a string is a valid CSS color (Hex, RGB, RGBA, HSL, or CSS Named Color).
 */
export const isValidCssColor = (colorStr) => {
  if (!colorStr || typeof colorStr !== 'string') return false;
  const trimmed = colorStr.trim().toLowerCase();
  if (!trimmed) return false;
  
  // Standard 3, 4, 6, 8 digit Hex regex
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(trimmed)) {
    return true;
  }

  // RGB / RGBA format
  if (RGB_REGEX.test(trimmed)) {
    return true;
  }

  // HSL / HSLA format
  if (HSL_REGEX.test(trimmed)) {
    return true;
  }

  // Known named color
  if (NAMED_COLORS[trimmed]) {
    return true;
  }

  // Browser DOM validator for all other standard named colors
  if (typeof document !== 'undefined') {
    const s = new Option().style;
    s.color = '';
    s.color = trimmed;
    return s.color !== '';
  }

  return false;
};

/**
 * Convert any valid CSS color string (Hex, RGB, Named Color like 'red')
 * into a standard 6-digit Hex '#rrggbb' format suitable for <input type="color">.
 */
export const toHexColor = (colorStr, fallback = '#124b38') => {
  if (!colorStr || typeof colorStr !== 'string') return fallback;
  const trimmed = colorStr.trim().toLowerCase();

  // Already 6-digit hex
  if (/^#([0-9a-f]{6})$/.test(trimmed)) {
    return trimmed;
  }

  // 3-digit hex (#abc -> #aabbcc)
  if (/^#([0-9a-f]{3})$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  // Check named colors map
  if (NAMED_COLORS[trimmed]) {
    return NAMED_COLORS[trimmed];
  }

  // Parse RGB directly
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10));
    const g = Math.min(255, parseInt(rgbMatch[2], 10));
    const b = Math.min(255, parseInt(rgbMatch[3], 10));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Convert via Canvas context in browser
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = trimmed;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    } catch {
      // Ignore canvas error and use fallback
    }
  }

  return fallback;
};

/**
 * Detect the format of the given color string.
 * Returns 'HEX' | 'RGB' | 'HSL' | 'Named Color' | 'Invalid'
 */
export const detectColorFormat = (colorStr) => {
  if (!colorStr || typeof colorStr !== 'string') return 'Invalid';
  const trimmed = colorStr.trim();
  if (!trimmed) return 'Invalid';

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return 'HEX';
  }
  if (/^rgba?\s*\(/i.test(trimmed)) {
    return 'RGB';
  }
  if (/^hsla?\s*\(/i.test(trimmed)) {
    return 'HSL';
  }
  if (isValidCssColor(trimmed)) {
    return 'Named Color';
  }
  return 'Invalid';
};

/**
 * Calculates optimal high-contrast text color (White #ffffff or Dark Slate #0f172a)
 * based on the background color's perceived luminance.
 */
export const getContrastingTextColor = (bgColorStr) => {
  const hex = toHexColor(bgColorStr, '#124b38');
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;

  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#0f172a' : '#ffffff';
};
