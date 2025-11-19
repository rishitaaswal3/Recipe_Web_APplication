'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '@/contexts/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState<'signin' | 'signup' | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close form when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAuthForm && formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowAuthForm(null);
        setIsSignInModalOpen(false);
        setIsSignUpModalOpen(false);
      }
      
      // Close dropdown when clicking outside
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (showAuthForm || isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthForm, isDropdownOpen]);

  // Parallax effect: opacity and background blur change based on scroll
  const navOpacity = Math.min(scrollY / 300, 1);
  const blurAmount = Math.min(scrollY / 100, 20);
  
  // Fade out navbar as user scrolls down - disappears after 600px
  const navbarVisibility = Math.max(1 - scrollY / 600, 0);

  const handleSignInClick = () => {
    setShowAuthForm('signin');
    setIsSignInModalOpen(true);
    setIsSignUpModalOpen(false);
    setIsDropdownOpen(false);
  };

  const handleSignUpClick = () => {
    setShowAuthForm('signup');
    setIsSignUpModalOpen(true);
    setIsSignInModalOpen(false);
    setIsDropdownOpen(false);
  };

  const handleCloseModal = () => {
    setShowAuthForm(null);
    setIsSignInModalOpen(false);
    setIsSignUpModalOpen(false);
  };

  const handleSwitchToSignUp = () => {
    setShowAuthForm('signup');
    setIsSignUpModalOpen(true);
    setIsSignInModalOpen(false);
  };

  const handleSwitchToSignIn = () => {
    setShowAuthForm('signin');
    setIsSignInModalOpen(true);
    setIsSignUpModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogoClick = () => {
    window.location.href = '/'; // Hard refresh to home
  };

  return (
    <>
      {/* Backdrop Blur Overlay */}
      {showAuthForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={handleCloseModal}
        />
      )}

      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-none outline-none animate-fade-in-down"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${0.3 + navOpacity * 0.5})`,
          backdropFilter: `blur(${blurAmount}px)`,
          border: 'none',
          boxShadow: 'none',
          outline: 'none',
          opacity: navbarVisibility,
          pointerEvents: navbarVisibility === 0 ? 'none' : 'auto',
        }}
      >
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-none">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Hard refresh on click */}
            <div className="flex-shrink-0">
              <button
                onClick={handleLogoClick}
                className="transition-transform duration-300 hover:scale-105 focus:outline-none"
              >
                <Logo size="md" variant="full" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex gap-8">
              <Link
                href="/"
                className="text-white hover:text-gray-300 transition-all duration-300 font-medium relative group"
              >
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
              <button
                onClick={() => scrollToSection('services')}
                className="text-white hover:text-gray-300 transition-all duration-300 font-medium relative group"
              >
                Services
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-white hover:text-gray-300 transition-all duration-300 font-medium relative group"
              >
                About Us
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </button>
            </div>

            {/* Auth Section - Show User Profile or Sign In Button */}
            <div className="relative">
              {user ? (
                // User Profile Picture with Sign Out on Click
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="transition-all duration-300 transform hover:scale-110 focus:outline-none"
                  >
                    {user.photoURL ? (
                      // Google Profile Picture
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-10 h-10 rounded-full shadow-lg ring-2 ring-white ring-offset-2 ring-offset-transparent hover:ring-offset-blue-500 transition-all object-cover"
                      />
                    ) : (
                      // Fallback to Initial
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white ring-offset-2 ring-offset-transparent hover:ring-offset-blue-500 transition-all">
                        {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Sign Out Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Sign In Button Only
                <div className="relative">
                  <button
                    onClick={handleSignInClick}
                    className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 relative group"
                  >
                    Sign In
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-black group-hover:w-full transition-all duration-300"></span>
                  </button>

                  {/* Auth Forms as Dropdown */}
                  {showAuthForm === 'signin' && (
                    <div ref={formRef} className="absolute right-0 top-full mt-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                      <SignInForm onClose={handleCloseModal} onSwitchToSignUp={handleSwitchToSignUp} />
                    </div>
                  )}

                  {showAuthForm === 'signup' && (
                    <div ref={formRef} className="absolute right-0 top-full mt-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                      <SignUpForm onClose={handleCloseModal} onSwitchToSignIn={handleSwitchToSignIn} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-white p-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
