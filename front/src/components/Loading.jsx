import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading = ({ size = 'md', message = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin text-gray-400 ${sizeClasses[size]}`} />
      {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
    </div>
  );
};

export default Loading;
