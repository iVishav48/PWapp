import React from 'react';
import { useApp } from '../context/AppContext';

const ConnectivityBanner = () => {
  const { isOnline } = useApp();

  return (
    <div className={`${isOnline ? 'bg-green-50' : 'bg-red-50'} border-b ${isOnline ? 'border-green-100' : 'border-red-100'}`}>
      <div className="max-w-7xl mx-auto px-4 py-2 text-center">
        <p className={`text-sm font-light ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
          {isOnline ? 'All systems operational' : 'You are currently offline - some features may be limited'}
        </p>
      </div>
    </div>
  );
};

export default ConnectivityBanner;

