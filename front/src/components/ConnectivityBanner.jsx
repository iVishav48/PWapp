import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectivityBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setShowBanner(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isOnline ? 'bg-emerald-50/95 backdrop-blur-sm border-emerald-200 text-emerald-800' : 'bg-rose-50/95 backdrop-blur-sm border-rose-200 text-rose-800'
      } border px-6 py-3 shadow-lg`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isOnline ? (
              <Wifi size={18} className="text-emerald-600 animate-pulse" />
            ) : (
              <WifiOff size={18} className="text-rose-600" />
            )}
            <span className="text-sm font-light tracking-wide">
              {isOnline ? 'Connection restored' : 'Offline mode'}
            </span>
          </div>
          {isOnline && (
            <button
              onClick={() => setShowBanner(false)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors duration-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {showBanner && <div className="h-12"></div>}
    </>
  );
};

export default ConnectivityBanner;

