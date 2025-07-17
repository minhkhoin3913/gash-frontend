import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import '../styles/Layout.css';
import gashLogo from '../assets/image/gash-logo.svg';
import { DROPDOWN_CLOSE_DELAY, SEARCH_DEBOUNCE_DELAY, ERROR_TIMEOUT } from '../constants/constants';

// API client
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Custom hooks
const useDebounce = (value, timeout) => {
  const [debouncedState, setDebouncedState] = useState(value);

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedState(value), timeout);
    return () => clearTimeout(debounce);
  }, [value, timeout]);

  return debouncedState;
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

// Sub-navbar component
const SubNavbar = () => {
  const [categories, setCategories] = useState([]);
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(window.scrollY);

  useEffect(() => {
    // Fetch up to 5 categories
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/categories`);
        setCategories(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) {
        setShow(true);
        lastScrollY.current = window.scrollY;
        return;
      }
      if (window.scrollY > lastScrollY.current) {
        setShow(false); // Scrolling down
      } else {
        setShow(true); // Scrolling up
      }
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`sub-navbar${show ? '' : ' sub-navbar-hidden'}`}
      style={{
        position: 'sticky',
        top: '80px',
        zIndex: 999,
        background: 'var(--amazon-bg)',
        borderBottom: '1px solid var(--amazon-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        transition: 'transform 0.3s',
        transform: show ? 'translateY(0)' : 'translateY(-100%)',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '0 32px',
        minHeight: 44,
        fontSize: '1rem',
        fontWeight: 500,
        justifyContent: 'center',
      }}
    >
      {categories.map((cat) => (
        <Link
          key={cat._id}
          to={`/products?category=${encodeURIComponent(cat.cat_name)}`}
          style={{ color: 'var(--amazon-link)', textDecoration: 'none', padding: '8px 0' }}
        >
          {cat.cat_name}
        </Link>
      ))}
      <Link to="/news" style={{ color: 'var(--amazon-link)', textDecoration: 'none', padding: '8px 0' }}>News</Link>
      <Link to="/contact" style={{ color: 'var(--amazon-link)', textDecoration: 'none', padding: '8px 0' }}>Contact</Link>
    </div>
  );
};

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Refs
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const navButtonRefs = useRef([]);
  const searchDropdownRef = useRef(null);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_DELAY);

  // Close dropdown menu on click outside
  useClickOutside(dropdownRef, useCallback(() => {
    clearTimeout(dropdownTimeoutRef.current);
    dropdownTimeoutRef.current = setTimeout(() => setIsDropdownOpen(false), DROPDOWN_CLOSE_DELAY);
  }, []));

  // Close search dropdown on click outside
  useClickOutside(searchDropdownRef, useCallback(() => {
    setIsSearchDropdownOpen(false);
  }, []));

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(dropdownTimeoutRef.current);
      clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Close dropdowns and reset error on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsSearchDropdownOpen(false);
    setError(null);
  }, [location.pathname]);

  // Consolidated keyboard navigation for main controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsSearchDropdownOpen(false);
        searchInputRef.current?.blur();
      } else if (event.key === '/' && document.activeElement !== searchInputRef.current) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dropdown keyboard navigation for account menu
  useEffect(() => {
    if (!isDropdownOpen) return;
    const items = dropdownRef.current?.querySelectorAll('.dropdown-item');
    let index = 0;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = (index + 1) % items.length;
        items[index].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        items[index].focus();
      } else if (e.key === 'Enter' && document.activeElement.classList.contains('dropdown-item')) {
        document.activeElement.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Search dropdown keyboard navigation
  useEffect(() => {
    if (!isSearchDropdownOpen) return;
    const items = searchDropdownRef.current?.querySelectorAll('.search-dropdown-item');
    let index = 0;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = (index + 1) % items.length;
        items[index].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        items[index].focus();
      } else if (e.key === 'Enter' && document.activeElement.classList.contains('search-dropdown-item')) {
        document.activeElement.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchDropdownOpen]);

  // Fetch search results for AJAX dropdown
  useEffect(() => {
    if (!debouncedSearchQuery.trim() || !isSearchDropdownOpen) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsSearchLoading(true);
      try {
        const sanitizedQuery = debouncedSearchQuery.trim().replace(/[<>]/g, '');
        const response = await apiClient.get('/products/search', {
          params: { q: sanitizedQuery, limit: 5 },
        });
        setSearchResults(response.data);
      } catch (err) {
        console.error('AJAX search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery, isSearchDropdownOpen]);

  // User display name
  const userDisplayName = useMemo(() => {
    if (!user) return null;
    return user.username || user.email?.split('@')[0] || 'Account';
  }, [user]);

  // Temporary error setter
  const setTempError = useCallback((message) => {
    clearTimeout(errorTimeoutRef.current);
    setError(message);
    errorTimeoutRef.current = setTimeout(() => setError(null), ERROR_TIMEOUT);
  }, []);

  // Event handlers
  const handleAccountClick = useCallback(() => {
    if (user) {
      setIsDropdownOpen((prev) => !prev);
    } else {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, navigate, location.pathname]);

  const handleCartClick = useCallback(() => {
    if (user) {
      navigate('/cart');
    } else {
      navigate('/login', { state: { from: '/cart' } });
    }
  }, [user, navigate]);

  const handleNotificationsClick = useCallback(() => {
    if (user) {
      navigate('/notifications');
    } else {
      navigate('/login', { state: { from: '/notifications' } });
    }
  }, [user, navigate]);

  const handleOrdersClick = useCallback(() => {
    if (user) {
      navigate('/orders');
    } else {
      navigate('/login', { state: { from: '/orders' } });
    }
  }, [user, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      setIsDropdownOpen(false);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      setTempError('Failed to sign out. Please try again.');
    }
  }, [logout, navigate, setTempError]);

  const handleSearchSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!debouncedSearchQuery.trim()) {
        setTempError('Please enter a search term.');
        return;
      }
      setIsSearching(true);
      setIsSearchDropdownOpen(false);
      try {
        const sanitizedQuery = debouncedSearchQuery.trim().replace(/[<>]/g, '');
        const response = await apiClient.get('/products/search', {
          params: { q: sanitizedQuery },
        });
        navigate('/search', {
          state: { searchQuery: sanitizedQuery, searchResults: response.data },
        });
        searchInputRef.current?.blur();
      } catch (err) {
        console.error('Search error:', err);
        const message = err.response?.data?.message || 'Search failed. Please try again.';
        setTempError(message);
      } finally {
        setIsSearching(false);
      }
    },
    [debouncedSearchQuery, navigate, setTempError]
  );

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchDropdownOpen(!!value.trim());
    if (!value.trim()) {
      e.target.setCustomValidity('Please enter a search term.');
      setSearchResults([]);
    } else {
      e.target.setCustomValidity('');
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.trim()) {
      setIsSearchDropdownOpen(true);
    }
  }, [searchQuery]);

  const handleSearchResultClick = useCallback((productId) => {
    setIsSearchDropdownOpen(false);
    setSearchQuery('');
    navigate(`/products/${productId}`);
    searchInputRef.current?.blur();
  }, [navigate]);

  const handleLogoClick = useCallback(
    (e) => {
      e.preventDefault();
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate]
  );

  // Clear search on non-products pages
  useEffect(() => {
    if (
      !location.pathname.includes('/products') &&
      document.activeElement !== searchInputRef.current
    ) {
      setSearchQuery('');
      setIsSearchDropdownOpen(false);
    }
  }, [location.pathname]);

  // Focus error notification
  useEffect(() => {
    if (error) {
      const errorElement = document.querySelector('.layout-error-notification');
      errorElement?.focus();
    }
  }, [error]);

  // Dropdown items
  const dropdownItems = useMemo(
    () => [
      { label: 'My Account', onClick: () => navigate('/profile'), className: '' },
      { label: 'My Orders', onClick: handleOrdersClick, className: '' },
      { label: 'My Vouchers', onClick: () => alert("Coming soon!"), className: '' },
      { label: 'My Favorites', onClick: () => navigate('/favorites'), className: '' },
      { label: 'Sign Out', onClick: handleLogout, className: 'logout-item' },
    ],
    [handleOrdersClick, handleLogout, navigate]
  );

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return `$${price.toFixed(2)}`;
  }, []);

  return (
    <div className="layout">
      {/* Error notification */}
      {error && (
        <div
          className="layout-error-notification"
          role="alert"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setError(null)}
        >
          <span className="layout-error-icon" aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button
            className="layout-error-close"
            onClick={() => setError(null)}
            type="button"
            aria-label="Close error notification"
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
            aria-label="Gash homepage"
          >
            <span style={{ display: logoLoaded ? 'none' : 'block', fontSize: '0.875rem', color: 'var(--amazon-bg)' }}>
              Gash
            </span>
            <img
              src={gashLogo}
              alt=""
              loading="eager"
              onLoad={() => setLogoLoaded(true)}
              onError={(e) => {
                e.target.style.display = 'none';
                setLogoLoaded(false);
                console.warn('Logo failed to load');
              }}
              style={{ display: logoLoaded ? 'block' : 'none' }}
            />
          </Link>

          {/* Search Bar */}
          <div className="search-bar-container" ref={searchDropdownRef}>
            <form className="search-bar" onSubmit={handleSearchSubmit} role="search">
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                disabled={isSearching}
                aria-label="Search products"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="search-results"
              />
              <button
                type="submit"
                className="search-button"
                disabled={isSearching || !debouncedSearchQuery.trim()}
                aria-label={isSearching ? 'Searching' : 'Search'}
              >
                <i className="lni lni-search-alt" aria-hidden="true"></i>
              </button>
            </form>
            {isSearchDropdownOpen && (
              <div className="search-dropdown" role="listbox" id="search-results">
                {isSearchLoading ? (
                  <div className="search-dropdown-loading" aria-live="polite">
                    <span className="search-loading-spinner" aria-hidden="true"></span>
                    Loading...
                  </div>
                ) : searchResults.length === 0 && debouncedSearchQuery.trim() ? (
                  <div className="search-dropdown-empty" aria-live="polite">
                    No products found
                  </div>
                ) : (
                  searchResults.map((product, index) => (
                    <button
                      key={product._id}
                      className="search-dropdown-item"
                      onClick={() => handleSearchResultClick(product._id)}
                      type="button"
                      role="option"
                      aria-selected="false"
                    >
                      <img
                        src={product.imageURL || '/placeholder-image.png'}
                        alt=""
                        className="search-dropdown-item-image"
                        onError={(e) => { e.target.src = '/placeholder-image.png'; }}
                      />
                      <div className="search-dropdown-item-content">
                        <span className="search-dropdown-item-name">
                          {product.pro_name || 'Unnamed Product'}
                        </span>
                        <span className="search-dropdown-item-price">
                          {formatPrice(product.pro_price)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Navigation Actions */}
          <div className="nav-actions">
            {/* Account Menu */}
            <div className="account-menu" ref={dropdownRef}>
              <div className="nav-button-wrapper">
                <button
                  className="nav-button account"
                  onClick={handleAccountClick}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  type="button"
                  ref={(el) => (navButtonRefs.current[0] = el)}
                  aria-label={user ? `Account menu for ${userDisplayName}` : 'Sign in'}
                >
                  <i className="lni lni-user" aria-hidden="true"></i>
                </button>
              </div>
              {user && isDropdownOpen && (
                <div className="dropdown" role="menu">
                  {dropdownItems.map((item, index) => (
                    <button
                      key={index}
                      className={`dropdown-item ${item.className}`}
                      onClick={() => {
                        item.onClick();
                        setIsDropdownOpen(false);
                      }}
                      type="button"
                      role="menuitem"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Button */}
            <div className="nav-button-wrapper">
              <button
                className="nav-button notifications"
                onClick={handleNotificationsClick}
                aria-label={user ? 'View notifications' : 'Sign in to view notifications'}
                type="button"
                ref={(el) => (navButtonRefs.current[1] = el)}
              >
                <i className="lni lni-alarm" aria-hidden="true"></i>
              </button>
            </div>

            {/* Cart Button */}
            <div className="nav-button-wrapper">
              <button
                className="nav-button cart"
                onClick={handleCartClick}
                aria-label={user ? 'View shopping cart' : 'Sign in to view cart'}
                type="button"
                ref={(el) => (navButtonRefs.current[2] = el)}
              >
                <i className="lni lni-cart" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Sub Navbar */}
      <SubNavbar />

      {/* Main Content */}
      <main className="main-content" role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="footer-top">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Back to top"
          >
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
          <p>© 2025 Gash - All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;