import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-light text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">The page you are looking for does not exist.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
