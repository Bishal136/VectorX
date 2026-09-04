import React, { useState } from 'react';
import Logo from '../../components/common/Logo';
import { ShoppingBag, Sparkles, Truck, Star, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: ShoppingBag,
    iconBg: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
    title: 'Hyperlocal Local Shopping',
    desc: 'Order fresh groceries, delicious food, and daily essentials from neighborhood stores.',
  },
  {
    icon: Sparkles,
    iconBg: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    title: 'Fresh & Verified Quality',
    desc: 'Handpicked local produce and verified merchants with authentic community ratings.',
  },
  {
    icon: Truck,
    iconBg: 'bg-sky-400/20 text-sky-300 border border-sky-400/30',
    title: 'Fast Doorstep Fulfillment',
    desc: 'Rapid delivery straight to your door with transparent live order tracking.',
  },
];

const AuthBrandPanel = ({
  tagline = 'Fresh picks from trusted neighborhood sellers, delivered straight to your doorstep in minutes.',
}) => {
  const [logoImgError, setLogoImgError] = useState(false);

  return (
    <div className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-[#062c19] via-[#093520] to-[#041a10] text-white overflow-hidden select-none border-l border-emerald-900/40">
      {/* Radiant sun glow & organic ambient lighting inspired by the logo */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle geometric grid backdrop */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="brand-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#brand-grid)" />
      </svg>

      {/* Top section: Branded Badge & Header */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          কাছাকাছি &middot; Nearby Marketplace
        </div>

        {/* Mascot Showcase Card */}
        <div className="mt-7 flex items-center gap-5 p-4 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-md shadow-xl">
          {!logoImgError ? (
            <div className="relative w-20 h-20 xl:w-22 xl:h-22 rounded-2xl bg-gradient-to-br from-amber-200/20 via-yellow-100/10 to-emerald-400/20 p-2 flex items-center justify-center shrink-0 border border-amber-400/40 shadow-inner">
              <img
                src="/logo.png"
                alt="কাছাকাছি Nearby Mascot"
                onError={() => setLogoImgError(true)}
                className="w-full h-full object-contain drop-shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#062c19] flex items-center justify-center text-[9px]">
                🌿
              </div>
            </div>
          ) : null}

          <div className="min-w-0">
            <Logo variant="light" size="md" />
            <p className="mt-2 text-xs xl:text-sm text-emerald-100/80 leading-relaxed line-clamp-2">
              {tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Middle section: 3 Pillars with Logo-inspired colors */}
      <div className="relative z-10 my-6 space-y-3.5 max-w-lg">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-amber-400/30 backdrop-blur-md transition-all duration-200"
            >
              <div className={`p-2.5 rounded-xl ${item.iconBg} shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  {item.title}
                </h4>
                <p className="text-xs text-emerald-100/75 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section: Trust & Social Proof Card */}
      <div className="relative z-10 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-extrabold text-amber-300">4.9 / 5.0</span>
              <span className="text-[11px] text-emerald-200/60 hidden sm:inline">&bull; 2,400+ reviews</span>
            </div>
            <p className="text-xs text-emerald-100/75">
              Loved by <span className="font-bold text-white">10,000+ happy shoppers</span> & local neighborhood merchants.
            </p>
          </div>

          {/* User community avatar stack with logo yellow & green rings */}
          <div className="flex -space-x-2 shrink-0">
            <div className="w-8 h-8 rounded-full ring-2 ring-[#062c19] bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
              🛍️
            </div>
            <div className="w-8 h-8 rounded-full ring-2 ring-[#062c19] bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
              🥬
            </div>
            <div className="w-8 h-8 rounded-full ring-2 ring-[#062c19] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
              ⚡
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthBrandPanel;