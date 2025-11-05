import React, { useEffect, useState } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome) {
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  if (!canInstall) return null;

  return (
    <button
      onClick={onInstall}
      className="px-3 py-1 text-xs rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
    >
      Install App
    </button>
  );
};

export default InstallPrompt;


