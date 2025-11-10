import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-light text-gray-900 tracking-widest">404</h1>
        <p className="mt-4 text-gray-600">The page you are looking for does not exist yet.</p>
        <Link to="/" className="inline-block mt-6 px-6 py-3 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors duration-100">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;


