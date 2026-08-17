import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const SellerTopbar = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold text-gray-900">
          TOP SHELF
        </Link>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">
          Seller Panel
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-700 hidden sm:inline">Welcome, {user?.name}</span>
        <Link to="/" className="text-indigo-600 hover:underline">
          ← Back to store
        </Link>
      </div>
    </header>
  );
};

export default SellerTopbar;