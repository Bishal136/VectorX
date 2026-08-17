
import  LeafMark  from '../../components/common/Logo';

const AuthBrandPanel = ({ tagline }) => (
  <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center bg-gray-50 overflow-hidden">
    {/* soft decorative blobs */}
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="620" cy="150" r="260" fill="#ffffff" opacity="0.7" />
      <circle cx="180" cy="720" r="220" fill="#ffffff" opacity="0.6" />
      <circle cx="520" cy="660" r="180" fill="#dcfce7" opacity="0.8" />
    </svg>

    {/* dashed route + pins — nods to the hyperlocal / delivery concept */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 900" aria-hidden="true">
      <path
        d="M120,780 C260,650 340,600 430,520 S620,340 700,220"
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
        strokeDasharray="6 10"
        opacity="0.35"
      />
      <circle cx="120" cy="780" r="6" fill="#16a34a" opacity="0.5" />
      <circle cx="700" cy="220" r="6" fill="#16a34a" opacity="0.5" />
    </svg>

    <div className="relative flex flex-col items-center text-center px-12">
      <LeafMark className="w-56 h-56 sm:w-64 sm:h-64 text-green-600 drop-shadow-xl" />
      {tagline && (
        <p className="mt-8 max-w-xs text-lg font-medium text-gray-700">{tagline}</p>
      )}
    </div>
  </div>
);

export default AuthBrandPanel;