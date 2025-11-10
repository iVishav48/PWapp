import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Share2, ChevronDown } from 'lucide-react';

const DockBar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Background blend behind the dock, excluding the header */}
      <div className="fixed top-16 left-0 w-full h-48 bg-gradient-to-b from-black/60 via-gray-900/30 to-transparent z-30 pointer-events-none"></div>
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40">
      <nav className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg rounded-full px-3 py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100"
          aria-label="Home"
        >
          <Home size={18} className="text-gray-700" />
          <span className="text-sm text-gray-800">Home</span>
        </Link>
        <Link
          to="/about"
          className="inline-flex items-center px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100 text-sm text-gray-800"
        >
          About Us
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100 text-sm text-gray-800"
        >
          Contact Us
        </Link>
        <Link
          to="/faqs"
          className="inline-flex items-center px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100 text-sm text-gray-800"
        >
          FAQs
        </Link>
        <Link
          to="/terms"
          className="inline-flex items-center px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100 text-sm text-gray-800"
        >
          Terms of Use
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors duration-100 text-sm text-gray-800"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Share2 size={16} className="text-gray-700" />
            Social
            <ChevronDown size={14} className={`transition-transform duration-100 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
              role="menu"
            >
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 duration-100">Twitter / X</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 duration-100">Facebook</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 duration-100">Instagram</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 duration-100">LinkedIn</a>
            </div>
          )}
        </div>
      </nav>
    </div>
    </>
  );
};

export default DockBar;


