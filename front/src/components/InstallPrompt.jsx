import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if user previously dismissed the prompt
    const wasDismissed = localStorage.getItem('installPromptDismissed');
    if (wasDismissed) {
      const dismissTime = parseInt(wasDismissed, 10);
      const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismiss < 7) {
        setDismissed(true);
      }
    }

    // Handle beforeinstallprompt event (Android/Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show prompt if not standalone and not dismissed
    if (iOS && !standalone && !dismissed) {
      // Delay showing iOS prompt slightly
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS doesn't support programmatic install
      // Instructions will be shown in the prompt
      return;
    }

    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
      // Remember dismissal for 7 days
      localStorage.setItem('installPromptDismissed', Date.now().toString());
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Remember dismissal for 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Don't show if already installed, dismissed, or prompt shouldn't be shown
  if (isStandalone || !showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Install PWApp
          </h3>
          {isIOS ? (
            <div className="text-xs text-gray-600 mb-3">
              <p className="mb-2">Tap the share button <span className="font-semibold">□↗</span> and select &quot;Add to Home Screen&quot;</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600 mb-3">
              Install our app for a better experience with offline support and faster access.
            </p>
          )}
          
          <div className="flex items-center space-x-2">
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;