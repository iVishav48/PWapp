import React, { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    // ✅ Smart network verification (bypasses SW cache)
    const verifyRealConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);

        await fetch("https://www.google.com/generate_204", {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeout);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    // ✅ Browser event handlers
    const handleOnline = () => {
      // Browser says online → verify actual connectivity
      verifyRealConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // ✅ Initial check
    if (navigator.onLine) verifyRealConnection();
    else setIsOnline(false);

    // ✅ Listen for network changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const value = {
    isOnline,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};