
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

const Logo = ({ variant = 'default', className = '' }) => {
  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LeafMark
        className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${isLight ? 'text-green-400' : 'text-green-700'}`}
      />
      <div className="leading-none">
        <div
          className={`text-lg sm:text-2xl font-extrabold tracking-tight ${
            isLight ? 'text-white' : 'text-green-800'
          }`}
        >
          TOP SHELF
        </div>
        <div
          className={`text-[9px] sm:text-[11px] font-semibold tracking-[0.2em] ${
            isLight ? 'text-green-400' : 'text-green-600'
          }`}
        >
          BRITISH COLUMBIA
        </div>
      </div>
    </div>
  );
};

export default Logo;
export { LeafMark };