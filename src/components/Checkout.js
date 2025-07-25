import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Checkout.css';

// API client with interceptors
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

// API functions
const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get(url, options);
      return response.data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const buyNowState = location.state && location.state.product && location.state.variant && location.state.quantity
    ? {
        product: location.state.product,
        variant: location.state.variant,
        quantity: location.state.quantity,
      }
    : null;
  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState({
    addressReceive: '',
    phone: '',
    username: user?.username || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash'); // New state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Fetch cart items (only if not Buy Now)
  const fetchCartItems = useCallback(async () => {
    if (!user?._id) {
      setError('User not authenticated');
      return;
    }
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
      console.error('Fetch cart items error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!buyNowState) {
      fetchCartItems();
    }
  }, [user, navigate, fetchCartItems, buyNowState]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (buyNowState) {
      return (buyNowState.variant?.pro_price || buyNowState.product?.pro_price || 0) * (buyNowState.quantity || 1);
    }
    return cartItems.reduce((total, item) => {
      const price = item.pro_price || 0;
      const quantity = item.pro_quantity || 0;
      return total + (price * quantity);
    }, 0);
  }, [cartItems, buyNowState]);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle payment method change
  const handlePaymentMethodChange = useCallback((e) => {
    setPaymentMethod(e.target.value);
  }, []);

  // Handle form submission
  const handlePlaceOrder = useCallback(async (e) => {
    e.preventDefault();
    const isBuyNow = !!buyNowState;
    const itemsToOrder = isBuyNow
      ? [{
          variant_id: buyNowState.variant._id,
          pro_price: buyNowState.variant.pro_price || buyNowState.product.pro_price || 0,
          pro_quantity: buyNowState.quantity,
          pro_name: buyNowState.product.pro_name,
        }]
      : cartItems;

    if (itemsToOrder.length === 0) {
      setError('Your cart is empty');
      setToast({ type: 'error', message: 'Your cart is empty' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (!formData.addressReceive || !formData.phone || !formData.username) {
      setError('Please fill in all required fields');
      setToast({ type: 'error', message: 'Please fill in all required fields' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Create order
      const orderResponse = await apiClient.post(
        '/orders',
        {
          acc_id: user._id,
          username: formData.username,
          addressReceive: formData.addressReceive,
          phone: formData.phone,
          totalPrice,
          order_status: 'pending',
          pay_status: 'unpaid',
          shipping_status: 'not_shipped',
          feedback_order: 'None',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const orderId = orderResponse.data.order._id;

      // Create order details
      await Promise.all(
        itemsToOrder.map(async (item) => {
          await apiClient.post(
            '/order-details',
            {
              order_id: orderId,
              variant_id: item.variant_id,
              UnitPrice: item.pro_price || 0,
              Quantity: item.pro_quantity || 1,
              feedback_details: 'None',
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      if (paymentMethod === 'cash') {
        // Clear cart if not Buy Now
        if (!isBuyNow) {
        await Promise.all(
          cartItems.map(async (item) => {
            await apiClient.delete(`/carts/${item._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          })
        );
        }
        setToast({ type: 'success', message: 'Order placed successfully!' });
        setTimeout(() => {
          setToast(null);
          navigate('/orders', { state: { forceFetch: true } });
        }, 3000);
      } else if (paymentMethod === 'vnpay') {
        // Call backend to get VNPay payment URL (POST with JSON body)
        const paymentUrlRes = await apiClient.post(
          '/orders/payment-url',
          {
            orderId,
            bankCode: '', // Optionally, let user select bank
            language: 'vn',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Redirect to VNPay payment page
        window.location.href = paymentUrlRes.data.paymentUrl;
        return;
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to place order';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
      console.error('Place order error:', err);
    } finally {
      setLoading(false);
    }
  }, [cartItems, user, formData, totalPrice, navigate, paymentMethod, buyNowState]);

  // Retry fetching cart items
  const handleRetry = useCallback(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }, []);

  // Render items for summary
  const itemsToDisplay = buyNowState
    ? [{
        _id: 'buy-now',
        variant_id: buyNowState.variant,
        pro_price: buyNowState.variant.pro_price || buyNowState.product.pro_price || 0,
        pro_quantity: buyNowState.quantity,
        pro_name: buyNowState.product.pro_name,
      }]
    : cartItems;

  return (
    <div className="checkout-container">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`checkout-toast ${toast.type === 'success' ? 'checkout-toast-success' : 'checkout-toast-error'}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <h1 className="checkout-title">Checkout</h1>

      {/* Error Display */}
      {error && (
        <div className="checkout-error" role="alert" aria-live="true">
          <span className="checkout-error-icon">⚠</span>
          <span>{error}</span>
          {error.includes('Failed to load') && (
            <button 
              className="checkout-retry-button" 
              onClick={handleRetry}
              aria-label="Retry loading cart items"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="checkout-main-section">
        <div className="checkout-cart-summary">
          <h2 className="checkout-cart-title">Cart Summary</h2>
          {loading && !buyNowState ? (
            <div className="checkout-loading" role="status" aria-live="true">
              <div className="checkout-loading-spinner"></div>
              <p>Loading cart...</p>
            </div>
          ) : itemsToDisplay.length === 0 ? (
            <div className="checkout-empty-cart" role="status">
              <p>Your cart is empty.</p>
              <button 
                className="checkout-continue-shopping-button"
                onClick={() => navigate('/')}
                aria-label="Continue shopping"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="checkout-cart-items">
              {itemsToDisplay.map((item) => (
                <div key={item._id} className="checkout-cart-item">
                  <div className="checkout-item-info">
                    <p className="checkout-item-name">
                      {item.variant_id?.pro_id?.pro_name || item.pro_name || 'Unnamed Product'}
                    </p>
                    <p className="checkout-item-variant">
                      Color: {item.variant_id?.color_id?.color_name || 'N/A'}, 
                      Size: {item.variant_id?.size_id?.size_name || 'N/A'}
                    </p>
                    <p className="checkout-item-quantity">Quantity: {item.pro_quantity || 0}</p>
                    <p className="checkout-item-price">Price: {formatPrice(item.pro_price)}</p>
                  </div>
                  <p className="checkout-item-total">
                    {formatPrice((item.pro_price || 0) * (item.pro_quantity || 0))}
                  </p>
                </div>
              ))}
              <div className="checkout-cart-total">
                <p>Total: {formatPrice(totalPrice)}</p>
              </div>
            </div>
          )}
        </div>
        {!loading && itemsToDisplay.length > 0 && (
          <form onSubmit={handlePlaceOrder} className="checkout-form">
            <fieldset className="checkout-form-group">
              <legend className="checkout-form-title">Shipping Information</legend>
              <div className="checkout-form-field">
                <label htmlFor="username" className="checkout-form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="checkout-form-input"
                  required
                  aria-describedby="username-description"
                />
              </div>
              <div className="checkout-form-field">
                <label htmlFor="addressReceive" className="checkout-form-label">
                  Address
                </label>
                <input
                  type="text"
                  id="addressReceive"
                  name="addressReceive"
                  value={formData.addressReceive}
                  onChange={handleInputChange}
                  className="checkout-form-input"
                  required
                  aria-describedby="address-description"
                />
              </div>
              <div className="checkout-form-field">
                <label htmlFor="phone" className="checkout-form-label">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="checkout-form-input"
                  required
                  aria-describedby="phone-description"
                />
              </div>
              <div className="checkout-form-field">
                <label className="checkout-form-label">Payment Method</label>
                <div className="checkout-payment-methods">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={handlePaymentMethodChange}
                    />
                    Pay by Cash
                  </label>
                  <label style={{ marginLeft: '1em' }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="vnpay"
                      checked={paymentMethod === 'vnpay'}
                      onChange={handlePaymentMethodChange}
                    />
                    Pay by VNPay
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="checkout-place-order-button"
                aria-label="Place order"
              >
                {loading ? 'Placing Order...' : paymentMethod === 'cash' ? 'Place Order' : 'Pay with VNPay'}
              </button>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
};

export default Checkout;