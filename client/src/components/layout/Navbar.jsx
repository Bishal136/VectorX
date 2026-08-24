import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '../../hooks/useAuth';
import { logoutUser } from '../../features/auth/authSlice';
import Logo from '../common/Logo';

// --- Local Icons ---
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
  </svg>
);

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12l1 13H5L6 7zM9 7a3 3 0 116 0" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MenuIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const navLinks = [
  { label: 'Shop All', path: '/products' },
  {
    label: 'Promotions/Bundles',
    path: '/promotions',
    children: [
      { label: 'Daily Deals', path: '/promotions?type=daily' },
      { label: 'Bundles', path: '/promotions?type=bundles' },
      { label: 'New Customer Offer', path: '/promotions?type=new-customer' },
    ],
  },
  {
    label: 'Support',
    path: '/support',
    children: [
      { label: 'FAQ', path: '/support/faq' },
      { label: 'Contact Us', path: '/support/contact' },
      { label: 'Shipping & Returns', path: '/support/shipping-returns' },
    ],
  },
];

const Navbar = () => {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux থেকে কার্টের আইটেমগুলো নিচ্ছি
  const cartItems = useSelector((state) => state.cart?.items) || [];
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Buyer-only areas (cart, profile, order history) should only ever show for
  // plain buyers — not sellers or admins, who have their own dashboards instead.
  const isBuyer = !user?.role || user.role === 'user';

  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); 
  const [openMobileSection, setOpenMobileSection] = useState(null); 

  const accountRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    setIsAccountOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16 md:h-20">
          
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden -ml-2 p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>

          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-6 justify-center">
            <div className="relative w-1/2 mx-auto">
              <input
                id="desktop-search"
                name="search"
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-full border border-gray-300 bg-gray-50 pl-5 pr-14 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700 transition"
              >
                <SearchIcon className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right cluster: account + cart */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto md:ml-0">
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-700 transition-colors focus:outline-none"
              >
                <span className="hidden sm:inline">
                  {isAuthenticated ? user?.name || 'Your Account' : 'Your Account'}
                </span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isAccountOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-lg shadow-lg ring-1 ring-black/5 py-1 z-30">
                  {isAuthenticated ? (
                    <>
                      {/* Buyer-only: profile + order history. Sellers/admins get their
                          own dashboard links below instead. */}
                      {isBuyer && (
                        <>
                          <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Profile
                          </Link>
                          <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Orders
                          </Link>
                          <Link to="/change-password" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Change Password
                          </Link>
                        </>
                      )}
                      {user?.role === 'seller' && (
                        <Link to="/seller/dashboard" className="block px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50" onClick={() => setIsAccountOpen(false)}>
                          Seller Portal
                        </Link>
                      )}
                      {user?.role === 'admin' && (
                        <Link to="/admin/dashboard" className="block px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50" onClick={() => setIsAccountOpen(false)}>
                          Admin Panel
                        </Link>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                        Login
                      </Link>
                      <Link to="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <span className="hidden sm:block w-px h-5 bg-gray-300" aria-hidden="true" />

            {/* Cart icon — buyers only */}
            {isAuthenticated && isBuyer && (
              <Link
                to="/cart"
                className="relative text-gray-700 hover:text-green-700 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBagIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              id="mobile-search"
              name="search"
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 rounded-full border border-gray-300 bg-gray-50 pl-5 pr-14 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700 transition">
              <SearchIcon className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Main nav – desktop */}
        <nav className="hidden md:flex items-center gap-7 py-3 border-t border-gray-100">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => link.children && setOpenDropdown(link.label)}
              onMouseLeave={() => link.children && setOpenDropdown(null)}
            >
              <Link to={link.path} className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-700 transition-colors whitespace-nowrap">
                {link.label}
                {link.children && (
                  <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />
                )}
              </Link>

              {link.children && openDropdown === link.label && (
                <div className="absolute left-0 top-full pt-2 w-52 z-30">
                  <div className="bg-white rounded-lg shadow-lg ring-1 ring-black/5 py-1">
                    {link.children.map((child) => (
                      <Link key={child.label} to={child.path} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile nav */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-100 pt-2 flex flex-col">
            {navLinks.map((link) => (
              <div key={link.label} className="border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between">
                  <Link to={link.path} className="flex-1 text-sm font-medium text-gray-700 hover:text-green-700 px-2 py-2.5" onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </Link>
                  {link.children && (
                    <button onClick={() => setOpenMobileSection(openMobileSection === link.label ? null : link.label)} className="p-2.5 text-gray-500">
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${openMobileSection === link.label ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {link.children && openMobileSection === link.label && (
                  <div className="pl-4 pb-2 flex flex-col">
                    {link.children.map((child) => (
                      <Link key={child.label} to={child.path} className="text-sm text-gray-600 hover:text-green-700 px-2 py-2" onClick={() => setIsMenuOpen(false)}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;