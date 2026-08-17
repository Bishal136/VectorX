import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
  const links = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Sellers', path: '/admin/sellers', icon: '🏢' },
    { label: 'Categories', path: '/admin/categories', icon: '📂' },
    { label: 'Orders', path: '/admin/orders', icon: '📋' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex-shrink-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 uppercase tracking-wider">
          Admin Panel
        </h2>
      </div>
      <nav className="mt-2">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;