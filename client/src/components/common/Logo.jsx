
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

const LeafMark = ({ className = 'w-8 h-8' }) => {
  const blades = [
    { rotate: -62, length: 15 },
    { rotate: -31, length: 20.5 },
    { rotate: 0, length: 24 },
    { rotate: 31, length: 20.5 },
    { rotate: 62, length: 15 },
  ];

  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden="true">
      <g transform="translate(24, 41)">
        {blades.map(({ rotate, length }, i) => (
          <path
            key={i}
            transform={`rotate(${rotate})`}
            d={`M0,0 C-3.2,${(-length * 0.35).toFixed(1)} -3.4,${(-length * 0.7).toFixed(1)} 0,${-length}
                C3.4,${(-length * 0.7).toFixed(1)} 3.2,${(-length * 0.35).toFixed(1)} 0,0 Z`}
          />
        ))}
        <rect x="-1" y="-5" width="2" height="9" rx="1" />
      </g>
    </svg>
  );
};

const Logo = ({
  variant = 'default',
  className = '',
  size = 'md',
  hideText = false,
  showText = false,
  customText = null,
  customSubtext = null,
  customHeight = null,
  customType = null,
  customImageUrl = null,
  isAdmin = false,
}) => {
  const isLight = variant === 'light';
  const [imgError, setImgError] = useState(false);

  // Read live CMS config from Redux store
  const { cmsConfig, homepageData } = useSelector((state) => state.cms || {});
  const logoConfig = cmsConfig?.logo || homepageData?.logo || {};

  const displayType = customType || logoConfig.type || 'both';
  const logoUrl = customImageUrl || logoConfig.imageUrl || '/logo.png';
  const brandTitle = customText || logoConfig.text || 'কাছাকাছি';
  const brandSubtitle = customSubtext !== null && customSubtext !== undefined ? customSubtext : (logoConfig.subtext || 'Nearby');
  const altText = logoConfig.altText || `${brandTitle} Logo`;

  // Calculate target height
  let targetHeight;
  if (customHeight !== null && customHeight !== undefined) {
    targetHeight = Number(customHeight) || 44;
  } else if (isAdmin) {
    targetHeight = Number(logoConfig.adminHeight) || 38;
  } else if (logoConfig.height) {
    const baseH = Number(logoConfig.height) || 44;
    if (size === 'sm') targetHeight = Math.max(22, Math.round(baseH * 0.7));
    else if (size === 'lg') targetHeight = Math.round(baseH * 1.3);
    else if (size === 'xl') targetHeight = Math.round(baseH * 1.8);
    else targetHeight = baseH;
  } else {
    const defaultHeights = { sm: 28, md: 44, lg: 60, xl: 80 };
    targetHeight = defaultHeights[size] || 44;
  }

  // Dynamic typography font sizing based on targetHeight
  const getTitleSizeClass = (h) => {
    if (h >= 70) return 'text-2xl sm:text-3xl';
    if (h >= 54) return 'text-xl sm:text-2xl';
    if (h >= 38) return 'text-lg sm:text-xl';
    return 'text-sm sm:text-base';
  };

  const getSubSizeClass = (h) => {
    if (h >= 70) return 'text-xs sm:text-sm';
    if (h >= 54) return 'text-[10px] sm:text-xs';
    if (h >= 38) return 'text-[9px] sm:text-[10px]';
    return 'text-[8px] sm:text-[9px]';
  };

  const shouldRenderText = !hideText && (showText || displayType === 'both' || displayType === 'text');
  const shouldRenderImage = (displayType === 'image' || displayType === 'both') && logoUrl && !imgError;
  const shouldUseDefaultSVG = displayType === 'default' || (!shouldRenderImage && displayType !== 'text');

  return (
    <div className={`flex items-center gap-2.5 select-none transition-all ${className}`}>
      {/* 1. Custom Image Logo */}
      {shouldRenderImage ? (
        <img
          src={logoUrl}
          alt={altText}
          onError={() => setImgError(true)}
          style={{
            height: `${targetHeight}px`,
            width: 'auto',
            maxHeight: '100%',
          }}
          className="object-contain shrink-0 drop-shadow-2xs rounded-sm transition-all"
        />
      ) : shouldUseDefaultSVG ? (
        /* 2. Default Leaf Mark SVG fallback */
        <LeafMark
          style={{
            height: `${targetHeight}px`,
            width: `${targetHeight}px`,
          }}
          className={`shrink-0 transition-all ${
            isLight ? 'text-green-400' : 'text-emerald-700'
          }`}
        />
      ) : null}

      {/* 3. Brand Text & Subtitle */}
      {shouldRenderText && (
        <div className="leading-tight flex flex-col justify-center">
          <div
            className={`font-black tracking-tight font-sans ${getTitleSizeClass(targetHeight)} ${
              isLight ? 'text-white' : 'text-emerald-950'
            }`}
          >
            {brandTitle}
          </div>
          {brandSubtitle && (
            <div
              className={`font-bold tracking-[0.18em] uppercase ${getSubSizeClass(targetHeight)} ${
                isLight ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              {brandSubtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
export { LeafMark };