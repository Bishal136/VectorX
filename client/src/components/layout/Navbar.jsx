import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '../../hooks/useAuth';
import { logoutUser } from '../../features/auth/authSlice';
import { fetchChatUnreadCount } from '../../features/chat/chatSlice';
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

const MessageCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
  {
    label: 'Home',
    path: '/',

  },
  { label: 'Shop All', path: '/products' },

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
  const chatUnread = useSelector((state) => state.chat?.unreadCounts?.customerUnread || 0);

  // Buyer-only areas (cart, profile, order history) should only ever show for
  // plain buyers — not sellers or admins, who have their own dashboards instead.
  const isBuyer = !user?.role || user.role === 'user';
  const { homepageData } = useSelector((state) => state.cms || {});
  const announcement = homepageData?.announcement;

  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openMobileSection, setOpenMobileSection] = useState(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const accountRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchChatUnreadCount());
    }
  }, [isAuthenticated, dispatch]);

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
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-2xs">
      {/* Dynamic CMS Announcement Bar */}
      {announcement?.enabled && announcement?.text && !announcementDismissed && (
        <div
          style={{
            backgroundColor: announcement.bgColor || '#124B38',
            color: announcement.textColor || '#ffffff',
          }}
          className="text-xs py-1.5 px-4 transition-all"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate mx-auto">
              {announcement.badge && (
                <span className="px-2 py-0.5 rounded-full bg-current/20 text-[10px] font-black tracking-wider uppercase shrink-0">
                  {announcement.badge}
                </span>
              )}
              <span className="font-semibold text-xs truncate">{announcement.text}</span>
              {announcement.link && (
                <Link to={announcement.link} className="underline font-bold text-[11px] ml-1 shrink-0 hover:opacity-90">
                  Shop Now →
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="opacity-70 hover:opacity-100 text-xs p-0.5 shrink-0 cursor-pointer transition-opacity"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Left: Mobile menu toggle + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>

            <Logo size="md" />
          </div>

          {/* Center: Search bar – desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                id="desktop-search"
                name="search"
                type="text"
                placeholder="Search products, brands, and categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-full border border-gray-300 bg-gray-50 pl-5 pr-14 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700 transition cursor-pointer"
                aria-label="Search"
              >
                <SearchIcon className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right: Actions (Order: Cart -> Message -> Profile) */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* 1. Cart icon — buyers only */}
            {isAuthenticated && isBuyer && (
              <Link
                to="/cart"
                className="relative text-gray-700 hover:text-green-700 transition-colors p-1"
                aria-label="Cart"
                title="Shopping Cart"
              >
                <ShoppingBagIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* 2. Messages icon — buyers only */}
            {isAuthenticated && isBuyer && (
              <Link
                to="/messages"
                className="relative text-gray-700 hover:text-green-700 transition-colors p-1"
                aria-label="Messages"
                title="My Messages & Chats"
              >
                <MessageCircleIcon className="w-6 h-6" />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold leading-none shadow-xs">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </Link>
            )}

            <span className="hidden sm:block w-px h-5 bg-gray-300" aria-hidden="true" />

            {/* 3. User Profile / Account dropdown — Last */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-green-700 transition-colors focus:outline-none cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-gray-600" />
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
                      {/* Buyer-only: profile + order history + messages. Sellers/admins get their
                          own dashboard links below instead. */}
                      {isBuyer && (
                        <>
                          <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Profile
                          </Link>
                          <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Orders
                          </Link>
                          <Link to="/messages" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center justify-between" onClick={() => setIsAccountOpen(false)}>
                            <span>My Messages</span>
                            {chatUnread > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                {chatUnread}
                              </span>
                            )}
                          </Link>
                          <Link to="/change-password" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700" onClick={() => setIsAccountOpen(false)}>
                            Change Password
                          </Link>
                        </>
                      )}
                      {user?.role === 'seller' && (
                        <>
                          <Link to="/seller/dashboard" className="block px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50" onClick={() => setIsAccountOpen(false)}>
                            Seller Portal
                          </Link>
                          <Link to="/seller/messages" className="block px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50" onClick={() => setIsAccountOpen(false)}>
                            Customer Messages
                          </Link>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <Link to="/admin/dashboard" className="block px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50" onClick={() => setIsAccountOpen(false)}>
                          Admin Panel
                        </Link>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
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
          <nav className="md:hidden pb-4 border-t border-gray-100 pt-2 flex flex-col space-y-1">
            {isAuthenticated && isBuyer && (
              <div className="bg-emerald-50/60 rounded-xl p-2 mb-2 border border-emerald-100 flex items-center justify-between">
                <Link
                  to="/messages"
                  className="flex items-center gap-2 text-xs font-bold text-emerald-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MessageCircleIcon className="w-4 h-4 text-emerald-700" />
                  <span>My Messages & Product Chats</span>
                </Link>
                {chatUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {chatUnread}
                  </span>
                )}
              </div>
            )}

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