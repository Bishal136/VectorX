import React from 'react';

const AuthBackground = ({ children }) => {
  return (
    <div className="min-h-[100dvh] relative flex flex-col justify-center overflow-x-hidden bg-gradient-to-br from-[#062617] via-[#093520] to-[#04190e] text-white selection:bg-amber-400/30 selection:text-white py-6 sm:py-10 px-4 sm:px-6">
      {/* Top-Left Organic Blob */}
      <div className="absolute -top-24 -left-24 w-[380px] h-[380px] sm:w-[480px] sm:h-[480px] rounded-full bg-emerald-700/20 blur-3xl pointer-events-none" />
      <svg
        className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 text-emerald-800/30 pointer-events-none -translate-x-12 -translate-y-12"
        viewBox="0 0 400 400"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0,0 C120,40 220,100 260,200 C300,300 240,380 180,400 L0,400 Z" />
      </svg>

      {/* Bottom-Left Organic Blob */}
      <div className="absolute -bottom-28 -left-28 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-emerald-800/25 blur-3xl pointer-events-none" />
      <svg
        className="absolute bottom-0 left-0 w-72 h-72 sm:w-[440px] sm:h-[440px] text-emerald-900/35 pointer-events-none -translate-x-16 translate-y-16"
        viewBox="0 0 500 500"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0,500 L0,200 C100,160 220,180 300,260 C380,340 380,440 360,500 Z" />
      </svg>

      {/* Right Side Wavy Lobe Shape (matching reference images) */}
      <svg
        className="absolute right-0 top-1/2 -translate-y-1/2 w-80 sm:w-[460px] lg:w-[560px] h-[720px] text-emerald-800/25 pointer-events-none translate-x-12"
        viewBox="0 0 500 800"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M500,0 L260,0 C330,140 290,240 190,340 C90,440 100,560 230,660 C330,740 430,780 500,800 Z" />
      </svg>

      {/* Warm golden amber ambient glow from the logo mascot */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Foreground Container */}
      <div className="relative z-10 w-full max-w-[420px] sm:max-w-md mx-auto my-auto">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
