import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-bold">TOP SHELF</span>
            <span className="text-sm text-gray-400 ml-1">BRITISH COLUMBIA</span>
            <p className="text-sm text-gray-400 mt-1">
              © {new Date().getFullYear()} – All rights reserved
            </p>
          </div>
          <div className="flex space-x-6">
            <Link to="/about" className="text-sm text-gray-300 hover:text-white transition">
              About
            </Link>
            <Link to="/contact" className="text-sm text-gray-300 hover:text-white transition">
              Contact
            </Link>
            <Link to="/privacy" className="text-sm text-gray-300 hover:text-white transition">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-gray-300 hover:text-white transition">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;