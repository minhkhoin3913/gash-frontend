import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Orders.css';
import axios from 'axios';

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
    return Promise.reject({ ...error, message, status });
  }
);

// API functions
const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient(url, options);
      return response.data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const Orders = () => {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [feedbackFormVisible, setFeedbackFormVisible] = useState({});
  const navigate = useNavigate();

  // Fetch orders
  const fetchOrders = useCallback(async (query = '') => {
    if (!user?._id) {
      setError('User not authenticated');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const url = query ? `/orders/search?acc_id=${user?._id}&q=${encodeURIComponent(query)}` : `/orders?acc_id=${user?._id}`;
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!selectedOrderId || !user?._id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetchWithRetry(`/order-details?order_id=${selectedOrderId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderDetails(Array.isArray(response) ? response : []);
      // Reset feedback form visibility and inputs when fetching new details
      setFeedbackFormVisible({});
      setFeedbackInputs({});
    } catch (err) {
      setError(err.message || 'Failed to load order details');
      console.error('Fetch order details error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId, user]);

  // Submit feedback
  const submitFeedback = useCallback(async (detailId, feedback) => {
    if (!user || !feedback.trim()) {
      setError('Feedback cannot be empty');
      setToast({ type: 'error', message: 'Feedback cannot be empty' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await apiClient.put(`/order-details/${detailId}`, {
        feedback_details: feedback,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setToast({ type: 'success', message: 'Feedback submitted successfully!' });
      setTimeout(() => setToast(null), 3000);
      setFeedbackInputs(prev => ({ ...prev, [detailId]: '' }));
      setFeedbackFormVisible(prev => ({ ...prev, [detailId]: false }));
      await fetchOrderDetails();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
      setToast({ type: 'error', message: err.message || 'Failed to submit feedback' });
      setTimeout(() => setToast(null), 3000);
      console.error('Submit feedback error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchOrderDetails]);

  // Delete feedback
  const deleteFeedback = useCallback(async (detailId) => {
    if (!user?._id) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await apiClient.put(`/order-details/${detailId}`, {
        feedback_details: 'None',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setToast({ type: 'success', message: 'Feedback deleted successfully!' });
      setTimeout(() => setToast(null), 3000);
      await fetchOrderDetails();
    } catch (err) {
      setError(err.message || 'Failed to delete feedback');
      setToast({ type: 'error', message: err.message || 'Failed to delete feedback' });
      setTimeout(() => setToast(null), 3000);
      console.error('Delete feedback error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchOrderDetails]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchOrders(query);
  }, [fetchOrders]);

  // Handle authentication state
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user && !localStorage.getItem('token')) {
      navigate('/login', { replace: true });
    } else if (user) {
      fetchOrders();
    }
  }, [user, isAuthLoading, navigate, fetchOrders]);

  // Fetch order details when selectedOrderId changes
  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetails();
    }
  }, [fetchOrderDetails]);

  // Toggle order detail visibility
  const handleToggleDetails = useCallback((orderId) => {
    setSelectedOrderId(prev => prev === orderId ? null : orderId);
  }, []);

  // Toggle feedback form visibility
  const toggleFeedbackForm = useCallback((detailId, existingFeedback = '') => {
    setFeedbackFormVisible(prev => ({
      ...prev,
      [detailId]: !prev[detailId],
    }));
    setFeedbackInputs(prev => ({
      ...prev,
      [detailId]: existingFeedback,
    }));
  }, []);

  // Handle feedback input change
  const handleFeedbackChange = useCallback((detailId, value) => {
    setFeedbackInputs(prev => ({
      ...prev,
      [detailId]: value,
    }));
  }, []);

  // Retry fetching orders
  const handleRetry = useCallback(() => {
    fetchOrders(searchQuery);
    if (selectedOrderId) {
      fetchOrderDetails();
    }
  }, [fetchOrders, fetchOrderDetails, selectedOrderId, searchQuery]);

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return `$${price.toFixed(2)}`;
  }, []);

  // Check if feedback is allowed
  const canProvideFeedback = (order) => {
    return order.order_status === 'shipped' &&
           order.pay_status === 'paid' &&
           order.shipping_status === 'delivered';
  };

  // Show loading state while auth is being verified
  if (isAuthLoading) {
    return (
      <div className="orders-container">
        <div className="orders-loading" role="status" aria-live="true">
          <div className="orders-loading-spinner"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`orders-toast ${toast.type === 'success' ? 'orders-toast-success' : 'orders-toast-error'}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <h1 className="orders-title">Your Orders</h1>
      {/* Search Bar */}
      <div className="orders-search-container">
        <input
          type="text"
          className="orders-search-input"
          placeholder="Search orders by ID, status, or date (YYYY-MM-DD)"
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search orders"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="orders-error" role="alert" aria-live="true">
          <span className="orders-error-icon">⚠</span>
          <span>{error}</span>
          <button 
            className="orders-retry-button" 
            onClick={handleRetry}
            aria-label="Retry loading orders"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="orders-loading" role="status" aria-live="true">
          <div className="orders-loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length === 0 && !error ? (
        <div className="orders-empty" role="status">
          <p>No orders found.</p>
          <button 
            className="orders-continue-shopping-button"
            onClick={() => navigate('/')}
            aria-label="Continue shopping"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order._id} className="orders-order-card">
              <div className="orders-order-header">
                <div className="orders-order-info">
                  <p className="orders-order-id">Order ID: {order._id}</p>
                  <p className="orders-order-date">
                    Date: {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="orders-order-total">
                    Total: {formatPrice(order.totalPrice)}
                  </p>
                  <p className={`orders-order-status ${order.order_status?.toLowerCase()}`}>
                    Status: {order.order_status || 'N/A'}
                  </p>
                  <p className="orders-order-payment">Payment: {order.pay_status || 'N/A'}</p>
                  <p className="orders-order-shipping">Shipping: {order.shipping_status || 'N/A'}</p>
                </div>
                <button
                  onClick={() => handleToggleDetails(order._id)}
                  className="orders-toggle-details"
                  aria-label={selectedOrderId === order._id ? `Hide details for order ${order._id}` : `View details for order ${order._id}`}
                >
                  {selectedOrderId === order._id ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {/* Order Details */}
              {selectedOrderId === order._id && (
                <div className="orders-details-section">
                  <h2 className="orders-details-title">Order Details</h2>
                  {orderDetails.length === 0 ? (
                    <p className="orders-no-details">No details available for this order.</p>
                  ) : (
                    <div className="orders-details-list">
                      {orderDetails.map((detail) => (
                        <div key={detail._id} className="orders-detail-item">
                          <div className="orders-detail-info">
                            <p className="orders-detail-name">
                              {detail.variant_id?.pro_id?.pro_name || 'Unnamed Product'}
                            </p>
                            <p className="orders-detail-variant">
                              Color: {detail.variant_id?.color_id?.color_name || 'N/A'}, 
                              Size: {detail.variant_id?.size_id?.size_name || 'N/A'}
                            </p>
                            <p className="orders-detail-quantity">Quantity: {detail.Quantity || 0}</p>
                            <p className="orders-detail-price">
                              Unit Price: {formatPrice(detail.UnitPrice)}
                            </p>
                            <p className="orders-detail-feedback">
                              Feedback: {detail.feedback_details || 'None'}
                            </p>
                            {canProvideFeedback(order) && (
                              <div className="orders-feedback-actions">
                                {detail.feedback_details && detail.feedback_details !== 'None' ? (
                                  <>
                                    <button
                                      className="orders-edit-feedback-button"
                                      onClick={() => toggleFeedbackForm(detail._id, detail.feedback_details)}
                                      disabled={loading}
                                      aria-label={`Edit feedback for ${detail.variant_id?.pro_id?.pro_name || 'product'}`}
                                    >
                                      Edit Feedback
                                    </button>
                                    <button
                                      className="orders-delete-feedback-button"
                                      onClick={() => deleteFeedback(detail._id)}
                                      disabled={loading}
                                      aria-label={`Delete feedback for ${detail.variant_id?.pro_id?.pro_name || 'product'}`}
                                    >
                                      Delete Feedback
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="orders-feedback-button"
                                    onClick={() => toggleFeedbackForm(detail._id)}
                                    disabled={loading}
                                    aria-label={`Provide feedback for ${detail.variant_id?.pro_id?.pro_name || 'product'}`}
                                  >
                                    {feedbackFormVisible[detail._id] ? 'Cancel' : 'Provide Feedback'}
                                  </button>
                                )}
                              </div>
                            )}
                            {feedbackFormVisible[detail._id] && canProvideFeedback(order) && (
                              <div className="orders-feedback-form">
                                <textarea
                                  className="orders-feedback-input"
                                  value={feedbackInputs[detail._id] || ''}
                                  onChange={(e) => handleFeedbackChange(detail._id, e.target.value)}
                                  placeholder="Enter your feedback here..."
                                  aria-label={`Feedback for ${detail.variant_id?.pro_id?.pro_name || 'product'}`}
                                />
                                <button
                                  className="orders-submit-feedback-button"
                                  onClick={() => submitFeedback(detail._id, feedbackInputs[detail._id])}
                                  disabled={loading || !feedbackInputs[detail._id]?.trim()}
                                  aria-label={`Submit feedback for ${detail.variant_id?.pro_id?.pro_name || 'product'}`}
                                >
                                  {detail.feedback_details && detail.feedback_details !== 'None' ? 'Update Feedback' : 'Submit Feedback'}
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="orders-detail-total">
                            {formatPrice((detail.UnitPrice || 0) * (detail.Quantity || 0))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;