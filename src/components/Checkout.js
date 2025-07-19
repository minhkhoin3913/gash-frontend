import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Checkout.css';

// API client configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log the full request details
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
      baseURL: config.baseURL
    });
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      fullError: error
    });
    
    // Improved error handling
    let errorMessage = 'An error occurred';
    if (error.response) {
      // Server responded with error
      switch (error.response.status) {
        case 404:
          errorMessage = 'API endpoint not found. Please check the API URL.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in again.';
          break;
        case 400:
          errorMessage = error.response.data?.message || 'Invalid request data';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.response.data?.message || 'Unknown error occurred';
      }
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'No response from server. Please check your connection.';
    }
    
    return Promise.reject({
      ...error,
      message: errorMessage
    });
  }
);

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Define itemsToOrder outside handlePlaceOrder
  const itemsToOrder = useMemo(() => {
    return buyNowState
      ? [{
          variant_id: buyNowState.variant._id,
          pro_price: buyNowState.variant.pro_price || buyNowState.product.pro_price || 0,
          pro_quantity: buyNowState.quantity,
          pro_name: buyNowState.product.pro_name,
        }]
      : cartItems;
  }, [buyNowState, cartItems]);

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

      const response = await apiClient.get(`/carts?acc_id=${user._id}`);
      setCartItems(Array.isArray(response.data) ? response.data : []);
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

  // Handle VNPay return
  useEffect(() => {
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
    const vnp_TxnRef = searchParams.get('vnp_TxnRef');
    
    if (vnp_ResponseCode && vnp_TxnRef) {
      const handleVNPayReturn = async () => {
        try {
          const response = await apiClient.get(`/order/vnpay-return${window.location.search}`);
          
          if (response.data.success) {
            setToast({ type: 'success', message: response.data.message });
            setTimeout(() => {
              setToast(null);
              navigate(`/orders/${vnp_TxnRef}`);
            }, 3000);
          } else {
            setToast({ type: 'error', message: response.data.message });
            setTimeout(() => {
              setToast(null);
              navigate('/cart');
            }, 3000);
          }
        } catch (err) {
          console.error('VNPay return error:', err);
          setToast({ 
            type: 'error', 
            message: err.message || 'Payment verification failed' 
          });
          setTimeout(() => {
            setToast(null);
            navigate('/cart');
          }, 3000);
        }
      };

      handleVNPayReturn();
    }
  }, [searchParams, navigate]);

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
      // Create order
      const orderData = {
        acc_id: user._id,
        addressReceive: formData.addressReceive,
        phone: formData.phone,
        totalPrice,
        order_status: 'pending',
        pay_status: 'unpaid',
        shipping_status: 'not_shipped',
        feedback_order: 'None'
      };

      console.log('Creating order with data:', orderData);
      
      // Changed from /order to /orders
      const orderResponse = await apiClient.post('/orders', orderData);
      
      if (!orderResponse.data.order) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const orderId = orderResponse.data.order._id;
      console.log('Order created:', orderResponse.data);

      // Create order details
      const orderDetailsPromises = itemsToOrder.map(item => {
        const detailData = {
          order_id: orderId,
          variant_id: item.variant_id,
          UnitPrice: item.pro_price || 0,
          Quantity: item.pro_quantity || 1,
          feedback_details: 'None'
        };
        console.log('Creating order detail:', detailData);
        return apiClient.post('/order-details', detailData);
      });

      await Promise.all(orderDetailsPromises);

      if (paymentMethod === 'cash') {
        if (!buyNowState) {
          const deleteCartPromises = cartItems.map(item => 
            apiClient.delete(`/carts/${item._id}`)
          );
          await Promise.all(deleteCartPromises);
        }
        setToast({ type: 'success', message: 'Order placed successfully!' });
        setTimeout(() => {
          setToast(null);
          navigate('/orders');
        }, 3000);
      } else if (paymentMethod === 'vnpay') {
        try {
          const paymentData = {
            orderId,
            bankCode: '',
            language: 'vn'
          };
          
          console.log('Requesting VNPay payment URL:', paymentData);
          
          // Changed from /order/payment-url to /orders/payment-url
          const paymentUrlRes = await apiClient.post('/orders/payment-url', paymentData);
          
          if (paymentUrlRes.data.paymentUrl) {
            window.location.href = paymentUrlRes.data.paymentUrl;
          } else {
            throw new Error(paymentUrlRes.data.message || 'Invalid payment URL received');
          }
        } catch (err) {
          console.error('VNPay payment error:', err);
          setToast({ 
            type: 'error', 
            message: err.message || 'Failed to initiate payment' 
          });
          setTimeout(() => setToast(null), 3000);
        }
        return;
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to place order';
      console.error('Place order error:', {
        message: errorMessage,
        error: err,
        requestData: err.config?.data,
        responseData: err.response?.data
      });
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [cartItems, user, formData, totalPrice, navigate, paymentMethod, buyNowState, itemsToOrder]);

  // Retry fetching cart items
  const handleRetry = useCallback(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return `$${price.toFixed(2)}`;
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