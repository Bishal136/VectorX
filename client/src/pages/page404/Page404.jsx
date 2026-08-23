import React from 'react';
import { Link } from 'react-router-dom';

const Page404 = () => {
  return (
    <section className="py-10 bg-white font-serif min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl text-center">
            
            {/* Animated Background with 404 */}
            <div 
              className="h-[400px] bg-center bg-no-repeat bg-cover rounded-xl flex items-start justify-center"
              style={{
                backgroundImage: `url('https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif')`
              }}
            >
              <h1 className="text-center text-[80px] font-bold text-gray-800 mt-4">
                404
              </h1>
            </div>

            {/* Content Box */}
            <div className="bg-white -mt-12 relative z-10 mx-4 sm:mx-12 rounded-xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                Looks like you're lost
              </h3>
              <p className="text-gray-500 mb-6">
                The page you are looking for is not available!
              </p>
              <Link 
                to="/" 
                className="inline-block px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
              >
                Go to Home
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default Page404;