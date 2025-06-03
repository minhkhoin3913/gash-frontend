import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Layout.css';
import gashLogo from '../assets/image/gash-logo.svg';

// Constants
const DROPDOWN_CLOSE_DELAY = 150;
const SEARCH_DEBOUNCE_DELAY = 300;

// Custom hooks
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_DELAY);

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, useCallback(() => {
    setIsDropdownOpen(false);
  }, []));

  // Close dropdown on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setError(null);
  }, [location.pathname]);

  // Keyboard navigation for dropdown
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDropdownOpen]);

  // Memoized user display name
  const userDisplayName = useMemo(() => {
    if (!user) return null;
    return user.username || user.email || 'Account';
  }, [user]);

  // Event handlers
  const handleAccountClick = useCallback(() => {
    if (user) {
      setIsDropdownOpen(prev => !prev);
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleCartClick = useCallback(() => {
    if (user) {
      navigate('/cart');
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleOrdersClick = useCallback(() => {
    if (user) {
      navigate('/orders');
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      setIsDropdownOpen(false);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }, [logout, navigate]);

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams({ q: searchQuery.trim() });
      navigate(`/products?${searchParams.toString()}`);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, navigate]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleLogoClick = useCallback((e) => {
    e.preventDefault();
    navigate('/');
  }, [navigate]);

  // Clear search when navigating away from products page
  useEffect(() => {
    if (!location.pathname.includes('/products')) {
      setSearchQuery('');
    }
  }, [location.pathname]);

  // Render dropdown menu items
  const renderDropdownItems = useCallback(() => {
    const menuItems = [
      { label: 'My Account', action: () => navigate('/profile') },
      { label: 'My Orders', action: handleOrdersClick },
      // { label: 'Settings', action: () => navigate('/settings') },
      { label: 'Sign Out', action: handleLogout, className: 'logout-item' }
    ];

    return menuItems.map((item, index) => (
      <button
        key={index}
        className={`dropdown-item ${item.className || ''}`}
        onClick={item.action}
        type="button"
      >
        {item.label}
      </button>
    ));
  }, [navigate, handleOrdersClick, handleLogout]);

  return (
    <div className="layout">
      {/* Error notification */}
      {error && (
        <div className="layout-error-notification">
          <span className="layout-error-icon">⚠</span>
          <span>{error}</span>
          <button 
            className="layout-error-close"
            onClick={() => setError(null)}
            type="button"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-container">
          {/* Logo */}
          <Link 
            to="/" 
            className="logo" 
            onClick={handleLogoClick}
            aria-label="Go to homepage"
          >
            <img 
              src={gashLogo} 
              alt="Gash Logo" 
              onError={(e) => {
                e.target.style.display = 'none';
                console.warn('Logo failed to load');
              }}
            />
          </Link>

          {/* Search Bar */}
          <form className="search-bar" onSubmit={handleSearchSubmit} role="search">
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={isSearching}
              aria-label="Search products"
              autoComplete="off"
            />
            <button
              type="submit"
              className="search-button"
              disabled={isSearching || !searchQuery.trim()}
              aria-label="Search"
            >
              {isSearching ? '...' : '🔍'}
            </button>
          </form>

          {/* Navigation Actions */}
          <div className="nav-actions">
            {/* Account Menu */}
            <div className="account-menu" ref={dropdownRef}>
              <button
                className="nav-button account"
                onClick={handleAccountClick}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                type="button"
              >
                {user ? `Hello, ${userDisplayName}` : 'Sign In'}
              </button>
              
              {user && isDropdownOpen && (
                <div className="dropdown" role="menu">
                  {renderDropdownItems()}
                </div>
              )}
            </div>

            {/* Cart Button */}
            <button
              className="nav-button cart"
              onClick={handleCartClick}
              aria-label="Shopping cart"
              type="button"
            >
              🛒 Cart
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content" role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="footer-top">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            Back to top
          </a>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Get to Know Us</h4>
            <Link to="/about">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/press">Press Releases</Link>
            <Link to="/investor">Investor Relations</Link>
          </div>

          <div className="footer-column">
            <h4>Make Money with Us</h4>
            <Link to="/sell">Sell products</Link>
            <Link to="/business">Business</Link>
            <Link to="/affiliate">Become an Affiliate</Link>
            <Link to="/advertise">Advertise Your Products</Link>
          </div>

          <div className="footer-column">
            <h4>Payment Products</h4>
            <Link to="/credit-card">Business Card</Link>
            <Link to="/shop-points">Shop with Points</Link>
            <Link to="/reload">Reload Your Balance</Link>
            <Link to="/currency">Currency Converter</Link>
          </div>

          <div className="footer-column">
            <h4>Let Us Help You</h4>
            <Link to="/profile">Your Account</Link>
            <Link to="/orders">Your Orders</Link>
            <Link to="/shipping">Shipping Rates & Policies</Link>
            <Link to="/returns">Returns & Replacements</Link>
            <Link to="/help">Help</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Gash. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
