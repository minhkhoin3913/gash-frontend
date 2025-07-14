import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Cart.css';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const message = status === 401 ? 'Unauthorized access - please log in' :
                    status === 404 ? 'Resource not found' :
                    status >= 500 ? 'Server error - please try again later' :
                    'Network error - please check your connection';
    return Promise.reject({ ...error, message });
  }
);

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get(url, options);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const useDebouncedCallback = (callback, delay) => {
  const timeoutRef = useRef();
  const cleanup = () => timeoutRef.current && clearTimeout(timeoutRef.current);
  const debounced = useCallback((...args) => {
    cleanup();
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
  useEffect(() => cleanup, []);
  return debounced;
};

const Cart = () => {
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Fetch cart items
  const fetchCartItems = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const response = await fetchWithRetry(`/carts?acc_id=${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartItems(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Failed to load cart items');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user && !localStorage.getItem('token')) {
      navigate('/login', { replace: true });
    } else if (user) {
      fetchCartItems();
    }
  }, [user, navigate, fetchCartItems]);

  // Debounced quantity update
  const debouncedUpdateQuantity = useDebouncedCallback(async (itemId, newQuantity) => {
    if (!user?._id || newQuantity < 1) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const item = cartItems.find(item => item._id === itemId);
      if (!item?.pro_price) throw new Error('Product price not available');
      const response = await apiClient.put(
        `/carts/${itemId}`,
        { pro_quantity: newQuantity, pro_price: item.pro_price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCartItems(prev =>
        prev.map(item =>
          item._id === itemId
            ? { ...item, pro_quantity: newQuantity, pro_price: response.data.cartItem.pro_price, Total_price: response.data.cartItem.Total_price }
            : item
        )
      );
      setToast({ type: 'success', message: 'Quantity updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to update quantity';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }, 500);

  // Remove item from cart
  const handleRemoveItem = useCallback(async (itemId) => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      await apiClient.delete(`/carts/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartItems(prev => prev.filter(item => item._id !== itemId));
      setToast({ type: 'success', message: 'Item removed from cart!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to remove item';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return `$${price.toFixed(2)}`;
  }, []);

  // Total price
  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = item.pro_price || 0;
      const quantity = item.pro_quantity || 0;
      return total + (price * quantity);
    }, 0);
  }, [cartItems]);

  // Handle quantity change (debounced)
  const handleQuantityChange = useCallback((itemId, value) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      debouncedUpdateQuantity(itemId, newQuantity);
      setCartItems(prev => prev.map(item => item._id === itemId ? { ...item, pro_quantity: newQuantity } : item));
    }
  }, [debouncedUpdateQuantity]);

  // Retry
  const handleRetry = useCallback(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Unified error/loading markup (ProductList style)
  if (loading) {
    return (
      <div className="cart-container">
        <div className="product-list-loading" role="status" aria-live="polite">
          <div className="product-list-loading-spinner" aria-hidden="true"></div>
          Loading cart...
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      {toast && (
        <div className={`cart-toast ${toast.type === 'success' ? 'cart-toast-success' : 'cart-toast-error'}`} role="alert">
          {toast.message}
        </div>
      )}
      <h1 className="cart-title">Your Cart</h1>
      {error && (
        <div className="product-list-error" role="alert" tabIndex={0} aria-live="polite">
          <span className="product-list-error-icon" aria-hidden="true">⚠</span>
          {error}
          <button
            className="product-list-retry-button"
            onClick={handleRetry}
            aria-label="Retry loading cart items"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && cartItems.length === 0 && !error ? (
        <div className="cart-empty" role="status">
          <p>Your cart is empty.</p>
          <button
            className="cart-continue-shopping-button"
            onClick={() => navigate('/products')}
            aria-label="Continue shopping"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <main className="cart-main-section" role="main">
          <section className="cart-items" aria-label="Cart items">
            {cartItems.map((item) => (
              <article key={item._id} className="cart-item" tabIndex={0} aria-label={`Cart item: ${item.variant_id?.pro_id?.pro_name || 'Unnamed Product'}`}> 
                <div className="cart-item-info">
                  <h2 className="cart-item-name">{item.variant_id?.pro_id?.pro_name || 'Unnamed Product'}</h2>
                  <p className="cart-item-variant">Color: {item.variant_id?.color_id?.color_name || 'N/A'}, Size: {item.variant_id?.size_id?.size_name || 'N/A'}</p>
                  <p className="cart-item-price">Price: {formatPrice(item.pro_price)}</p>
                  <div className="cart-item-quantity">
                    <label htmlFor={`quantity-${item._id}`} className="cart-quantity-label">Quantity:</label>
                    <input
                      type="number"
                      id={`quantity-${item._id}`}
                      min="1"
                      value={item.pro_quantity || 1}
                      onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                      className="cart-quantity-input"
                      aria-label={`Quantity for ${item.variant_id?.pro_id?.pro_name || 'product'}`}
                    />
                  </div>
                </div>
                <div className="cart-item-actions">
                  <p className="cart-item-total">{formatPrice((item.pro_price || 0) * (item.pro_quantity || 0))}</p>
                  <button
                    className="cart-remove-button"
                    onClick={() => handleRemoveItem(item._id)}
                    aria-label={`Remove ${item.variant_id?.pro_id?.pro_name || 'product'} from cart`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </section>
          {cartItems.length > 0 && (
            <aside className="cart-summary" aria-label="Cart summary">
              <p className="cart-total">Total: {formatPrice(totalPrice)}</p>
              <button
                className="cart-checkout-button"
                onClick={() => navigate('/checkout')}
                disabled={cartItems.length === 0 || loading}
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
              </button>
            </aside>
          )}
        </main>
      )}
    </div>
  );
};

export default Cart;