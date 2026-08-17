import { Outlet } from 'react-router-dom';
import SellerSidebar from './SellerSidebar';
import SellerTopbar from './SellerTopbar';

const SellerLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <SellerTopbar />
      <div className="flex flex-1 overflow-hidden">
        <SellerSidebar />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;