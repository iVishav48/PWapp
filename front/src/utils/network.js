import React from 'react';

// Network status utility
class NetworkManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  checkOnline() {
    // Additional check to verify actual connectivity
    return new Promise((resolve) => {
      if (!navigator.onLine) {
        resolve(false);
        return;
      }

      // Try to reach a reliable endpoint
      fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        timeout: 3000
      })
      .then(() => resolve(true))
      .catch(() => resolve(false));
    });
  }

  async getStatus() {
    const browserStatus = navigator.onLine;
    if (!browserStatus) return false;
    
    // Verify with connectivity check
    return await this.checkOnline();
  }
}

export const networkManager = new NetworkManager();

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const unsubscribe = networkManager.addListener((status) => {
      setIsOnline(status === 'online');
    });

    // Initial check
    networkManager.getStatus().then(status => {
      setIsOnline(status);
    });

    return unsubscribe;
  }, []);

  return isOnline;
};