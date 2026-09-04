
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
}) => {
  const isLight = variant === 'light';
  const [imgError, setImgError] = useState(false);

  // Read live CMS config from Redux store
  const { cmsConfig, homepageData } = useSelector((state) => state.cms || {});
  const logoConfig = cmsConfig?.logo || homepageData?.logo || {};

  const displayType = logoConfig.type || 'both';
  const logoUrl = logoConfig.imageUrl || '/logo.png';
  const brandTitle = customText || logoConfig.text || 'কাছাকাছি';
  const brandSubtitle = customSubtext || logoConfig.subtext || 'Nearby';
  const altText = logoConfig.altText || `${brandTitle} Logo`;

  // Size mapping
  const sizeMap = {
    sm: { img: 'h-8 max-w-[120px]', leaf: 'w-6 h-6', title: 'text-base', sub: 'text-[9px]' },
    md: { img: 'h-10 sm:h-11 max-w-[160px]', leaf: 'w-7 h-7 sm:w-8 sm:h-8', title: 'text-lg sm:text-xl', sub: 'text-[9px] sm:text-[10px]' },
    lg: { img: 'h-14 sm:h-16 max-w-[220px]', leaf: 'w-10 h-10 sm:w-12 sm:h-12', title: 'text-2xl sm:text-3xl', sub: 'text-xs sm:text-sm' },
    xl: { img: 'h-20 sm:h-24 max-w-[300px]', leaf: 'w-16 h-16 sm:w-20 sm:h-20', title: 'text-3xl sm:text-4xl', sub: 'text-sm sm:text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
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
          style={logoConfig.height && size === 'custom' ? { height: `${logoConfig.height}px` } : undefined}
          className={`${currentSize.img} object-contain shrink-0 drop-shadow-2xs rounded-sm`}
        />
      ) : shouldUseDefaultSVG ? (
        /* 2. Default Leaf Mark SVG fallback */
        <LeafMark
          className={`${currentSize.leaf} shrink-0 ${
            isLight ? 'text-green-400' : 'text-emerald-700'
          }`}
        />
      ) : null}

      {/* 3. Brand Text & Subtitle */}
      {shouldRenderText && (
        <div className="leading-tight flex flex-col justify-center">
          <div
            className={`font-black tracking-tight font-sans ${currentSize.title} ${
              isLight ? 'text-white' : 'text-emerald-950'
            }`}
          >
            {brandTitle}
          </div>
          {brandSubtitle && (
            <div
              className={`font-bold tracking-[0.18em] uppercase ${currentSize.sub} ${
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