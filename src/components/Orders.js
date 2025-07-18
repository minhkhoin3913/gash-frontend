import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/Orders.css";
import axios from "axios";

// API client with interceptors
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      status === 401
        ? "Unauthorized access - please log in"
        : status === 404
        ? "Resource not found"
        : status >= 500
        ? "Server error - please try again later"
        : "Network error - please check your connection";
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
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }
};

const Orders = () => {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [orderDetailsCache, setOrderDetailsCache] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [feedbackFormVisible, setFeedbackFormVisible] = useState({});
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetail, setModalDetail] = useState(null); // { detail, order }
  const [modalInput, setModalInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [cancelModalLoading, setCancelModalLoading] = useState(false);
  const [cancelModalError, setCancelModalError] = useState("");

  // Fetch orders
  const fetchOrders = useCallback(
    async (query = "") => {
      if (!user?._id) {
        setError("User not authenticated");
        return;
      }
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token found");

        const url = query
          ? `/orders/search?acc_id=${user?._id}&q=${encodeURIComponent(query)}`
          : `/orders?acc_id=${user?._id}`;
        const response = await fetchWithRetry(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(Array.isArray(response) ? response : []);
      } catch (err) {
        setError(err.message || "Failed to load orders");
        console.error("Fetch orders error:", err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Fetch order details
  const fetchOrderDetails = useCallback(
    async (orderId) => {
      if (!orderId || !user?._id) return;
      setLoading(true);
      setError("");
      setOrderDetails([]); // Clear previous order details

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token found");

        const response = await fetchWithRetry(
          `/order-details?order_id=${orderId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const details = Array.isArray(response) ? response : [];
        setOrderDetails(details);
        setOrderDetailsCache((prev) => ({ ...prev, [orderId]: details }));
        // Reset feedback form visibility and inputs when fetching new details
        setFeedbackFormVisible({});
        setFeedbackInputs({});
      } catch (err) {
        setError(err.message || "Failed to load order details");
        console.error("Fetch order details error:", err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Submit feedback
  const submitFeedback = useCallback(
    async (detailId, feedback) => {
      if (!user || !feedback.trim()) {
        setError("Feedback cannot be empty");
        setToast({ type: "error", message: "Feedback cannot be empty" });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token found");

        await apiClient.put(
          `/order-details/${detailId}`,
          {
            feedback_details: feedback,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setToast({
          type: "success",
          message: "Feedback submitted successfully!",
        });
        setTimeout(() => setToast(null), 3000);
        setFeedbackInputs((prev) => ({ ...prev, [detailId]: "" }));
        setFeedbackFormVisible((prev) => ({ ...prev, [detailId]: false }));
        await fetchOrderDetails(selectedOrderId); // Refresh details for the current order
      } catch (err) {
        setError(err.message || "Failed to submit feedback");
        setToast({
          type: "error",
          message: err.message || "Failed to submit feedback",
        });
        setTimeout(() => setToast(null), 3000);
        console.error("Submit feedback error:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, fetchOrderDetails, selectedOrderId]
  );

  // Delete feedback
  const deleteFeedback = useCallback(
    async (detailId) => {
      if (!user?._id) return;
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token found");

        await apiClient.put(
          `/order-details/${detailId}`,
          {
            feedback_details: "None",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setToast({
          type: "success",
          message: "Feedback deleted successfully!",
        });
        setTimeout(() => setToast(null), 3000);
        await fetchOrderDetails(selectedOrderId); // Refresh details for the current order
      } catch (err) {
        setError(err.message || "Failed to delete feedback");
        setToast({
          type: "error",
          message: err.message || "Failed to delete feedback",
        });
        setTimeout(() => setToast(null), 3000);
        console.error("Delete feedback error:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, fetchOrderDetails, selectedOrderId]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e) => {
      const query = e.target.value;
      setSearchQuery(query);
      fetchOrders(query);
    },
    [fetchOrders]
  );

  // Handle authentication state
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user && !localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    } else if (user) {
      fetchOrders();
    }
  }, [user, isAuthLoading, navigate, fetchOrders]);

  // Fetch all order details for all orders after orders are loaded
  useEffect(() => {
    const fetchAllOrderDetails = async () => {
      if (!orders.length || !user?._id) return;
      const token = localStorage.getItem("token");
      if (!token) return;
      const newCache = {};
      await Promise.all(
        orders.map(async (order) => {
          try {
            const response = await fetchWithRetry(
              `/order-details?order_id=${order._id}`,
              {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            newCache[order._id] = Array.isArray(response) ? response : [];
          } catch {
            newCache[order._id] = [];
          }
        })
      );
      setOrderDetailsCache(newCache);
    };
    fetchAllOrderDetails();
  }, [orders, user]);

  // When selectedOrderId changes, set orderDetails from cache
  useEffect(() => {
    if (selectedOrderId && orderDetailsCache[selectedOrderId]) {
      setOrderDetails(orderDetailsCache[selectedOrderId]);
    } else {
      setOrderDetails([]); // Clear details if no cache entry
    }
  }, [selectedOrderId, orderDetailsCache]);

  // Toggle order detail visibility
  const handleToggleDetails = useCallback((orderId) => {
    setSelectedOrderId((prev) => {
      const newId = prev === orderId ? null : orderId;
      if (newId) {
        fetchOrderDetails(newId); // Fetch details when expanding
      } else {
        setOrderDetails([]); // Clear details when collapsing
      }
      return newId;
    });
  }, [fetchOrderDetails]);

  // Toggle feedback form visibility
  const toggleFeedbackForm = useCallback((detailId, existingFeedback = "") => {
    setFeedbackFormVisible((prev) => ({
      ...prev,
      [detailId]: !prev[detailId],
    }));
    setFeedbackInputs((prev) => ({
      ...prev,
      [detailId]: existingFeedback,
    }));
  }, []);

  // Handle feedback input change
  const handleFeedbackChange = useCallback((detailId, value) => {
    setFeedbackInputs((prev) => ({
      ...prev,
      [detailId]: value,
    }));
  }, []);

  // Retry fetching orders
  const handleRetry = useCallback(() => {
    fetchOrders(searchQuery);
    if (selectedOrderId) {
      fetchOrderDetails(selectedOrderId);
    }
  }, [fetchOrders, fetchOrderDetails, selectedOrderId, searchQuery]);

  // Format price
  const formatPrice = useCallback((price) => {
    if (typeof price !== "number" || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  // Check if feedback is allowed
  const canProvideFeedback = (order) => {
    return (
      order.order_status === "delivered" &&
      order.pay_status === "paid" &&
      order.shipping_status === "delivered"
    );
  };

  // Modal open handler
  const openFeedbackModal = useCallback((detail, order) => {
    setModalDetail({ detail, order });
    setModalInput(
      detail.feedback_details && detail.feedback_details !== "None"
        ? detail.feedback_details
        : ""
    );
    setModalError("");
    setModalVisible(true);
  }, []);

  // Modal close handler
  const closeFeedbackModal = useCallback(() => {
    setModalVisible(false);
    setModalDetail(null);
    setModalInput("");
    setModalError("");
    setModalLoading(false);
  }, []);

  // Modal submit handler (add or change)
  const handleModalSubmit = useCallback(async () => {
    if (!modalInput.trim()) {
      setModalError("Feedback cannot be empty");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const details = orderDetailsCache[modalDetail.order._id] || [];
      await Promise.all(
        details.map((detail) =>
          apiClient.put(
            `/order-details/${detail._id}`,
            {
              feedback_details: modalInput.trim(),
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        )
      );
      // Update cache immediately
      setOrderDetailsCache((prev) => ({
        ...prev,
        [modalDetail.order._id]: details.map((d) => ({
          ...d,
          feedback_details: modalInput.trim(),
        })),
      }));
      setToast({
        type: "success",
        message: "Feedback submitted to all products!",
      });
      setTimeout(() => setToast(null), 3000);
      closeFeedbackModal();
      await fetchOrderDetails(modalDetail.order._id);
    } catch (err) {
      setModalError(err.message || "Failed to submit feedback");
    } finally {
      setModalLoading(false);
    }
  }, [
    modalInput,
    modalDetail,
    closeFeedbackModal,
    fetchOrderDetails,
    orderDetailsCache,
  ]);

  // Modal delete handler
  const handleModalDelete = useCallback(async () => {
    setModalLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const details = orderDetailsCache[modalDetail.order._id] || [];
      await Promise.all(
        details.map((detail) =>
          apiClient.put(
            `/order-details/${detail._id}`,
            {
              feedback_details: "None",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        )
      );
      // Update cache immediately
      setOrderDetailsCache((prev) => ({
        ...prev,
        [modalDetail.order._id]: details.map((d) => ({
          ...d,
          feedback_details: "None",
        })),
      }));
      setToast({
        type: "success",
        message: "Feedback deleted for all products!",
      });
      setTimeout(() => setToast(null), 3000);
      closeFeedbackModal();
      await fetchOrderDetails(modalDetail.order._id);
    } catch (err) {
      setModalError(err.message || "Failed to delete feedback");
    } finally {
      setModalLoading(false);
    }
  }, [modalDetail, closeFeedbackModal, fetchOrderDetails, orderDetailsCache]);

  // Cancel order handler
  const openCancelModal = useCallback((order) => {
    setCancelTargetOrder(order);
    setCancelModalError("");
    setCancelModalVisible(true);
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelModalVisible(false);
    setCancelTargetOrder(null);
    setCancelModalError("");
    setCancelModalLoading(false);
  }, []);

  const handleCancelOrder = useCallback(async () => {
    if (!cancelTargetOrder) return;
    setCancelModalLoading(true);
    setCancelModalError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      // Gather all required fields from the order object
      const {
        addressReceive,
        phone,
        totalPrice,
        pay_status,
        shipping_status,
        feedback_order
      } = cancelTargetOrder;
      const payload = {
        acc_id: cancelTargetOrder.acc_id?._id || cancelTargetOrder.acc_id,
        addressReceive,
        phone,
        totalPrice,
        pay_status,
        shipping_status,
        feedback_order,
        order_status: "cancelled"
      };
      console.log('Cancel order payload:', payload);
      await apiClient.put(
        `/orders/${cancelTargetOrder._id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast({ type: "success", message: "Order cancelled successfully!" });
      setTimeout(() => setToast(null), 3000);
      closeCancelModal();
      await fetchOrders(searchQuery);
    } catch (err) {
      setCancelModalError(err.message || "Failed to cancel order");
    } finally {
      setCancelModalLoading(false);
    }
  }, [cancelTargetOrder, fetchOrders, searchQuery, closeCancelModal]);

  // Helper: can cancel order
  const canCancelOrder = (order) => {
    return (
      (order.order_status === "pending" || order.order_status === "confirmed") &&
      order.shipping_status === "not_shipped"
    );
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
          className={`orders-toast ${
            toast.type === "success"
              ? "orders-toast-success"
              : "orders-toast-error"
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Feedback Modal */}
      {modalVisible && modalDetail && (
        <div className="orders-modal-overlay" role="dialog" aria-modal="true">
          <div className="orders-modal">
            <h2 className="orders-modal-title">
              {modalDetail.detail.feedback_details &&
              modalDetail.detail.feedback_details !== "None"
                ? "Edit Feedback"
                : "Add Feedback"}
            </h2>
            <textarea
              className="orders-modal-input"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder="Enter your feedback here..."
              disabled={modalLoading}
              aria-label="Feedback input"
              autoFocus
            />
            {modalError && (
              <div className="orders-modal-error" role="alert">
                {modalError}
              </div>
            )}
            <div className="orders-modal-actions">
              {modalDetail.detail.feedback_details &&
              modalDetail.detail.feedback_details !== "None" ? (
                <>
                  <button
                    className="orders-modal-change-btn"
                    onClick={handleModalSubmit}
                    disabled={modalLoading || !modalInput.trim()}
                  >
                    {modalLoading ? "Saving..." : "Change"}
                  </button>
                  <button
                    className="orders-modal-delete-btn"
                    onClick={handleModalDelete}
                    disabled={modalLoading}
                  >
                    {modalLoading ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    className="orders-modal-cancel-btn"
                    onClick={closeFeedbackModal}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="orders-modal-add-btn"
                    onClick={handleModalSubmit}
                    disabled={modalLoading || !modalInput.trim()}
                  >
                    {modalLoading ? "Adding..." : "Add"}
                  </button>
                  <button
                    className="orders-modal-cancel-btn"
                    onClick={closeFeedbackModal}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalVisible && cancelTargetOrder && (
        <div className="orders-modal-overlay" role="dialog" aria-modal="true">
          <div className="orders-modal">
            <h2 className="orders-modal-title">Cancel Order</h2>
            <p>Are you sure you want to cancel this order?</p>
            {cancelModalError && (
              <div className="orders-modal-error" role="alert">
                {cancelModalError}
              </div>
            )}
            <div className="orders-modal-actions">
              <button
                className="orders-modal-delete-btn"
                onClick={handleCancelOrder}
                disabled={cancelModalLoading}
              >
                {cancelModalLoading ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
              <button
                className="orders-modal-cancel-btn"
                onClick={closeCancelModal}
                disabled={cancelModalLoading}
              >
                No, Go Back
              </button>
            </div>
          </div>
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
            onClick={() => navigate("/")}
            aria-label="Continue shopping"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            // Always show a product name: use cached orderDetails if available, else order.products if available
            let productName = "";
            let productCount = 0;
            const detailsForOrder = orderDetailsCache[order._id];
            if (Array.isArray(detailsForOrder) && detailsForOrder.length > 0) {
              const names = detailsForOrder
                .map((detail) => detail.variant_id?.pro_id?.pro_name)
                .filter(Boolean)
                .sort();
              productName = names[0] || "";
              productCount = names.length;
            } else if (
              order.products &&
              Array.isArray(order.products) &&
              order.products.length > 0
            ) {
              const names = order.products
                .map((p) => p.pro_name)
                .filter(Boolean)
                .sort();
              productName = names[0] || "";
              productCount = names.length;
            }
            if (!productName) productName = "Order";

            // Format order status for display
            const formatStatus = (status) => {
              if (!status) return "N/A";
              const map = {
                pending: "Pending",
                not_shipped: "Not Shipped",
                shipped: "Shipped",
                delivered: "Delivered",
                cancelled: "Cancelled",
                processing: "Processing",
                paid: "Paid",
                unpaid: "Unpaid",
                refunded: "Refunded",
              };
              return (
                map[status] ||
                status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              );
            };

            return (
              <article key={order._id} className="orders-order-card">
                <div className="orders-order-header">
                  <div className="orders-order-info">
                    <div className="orders-order-product-row">
                      <p className="orders-order-product">
                        {productName}
                        {productCount - 1 > 0 && (
                          <span
                            style={{
                              color: "var(--amazon-secondary-text)",
                              fontWeight: 400,
                              marginLeft: 8,
                            }}
                          >
                            + {productCount - 1} product
                            {productCount - 1 > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                      <span
                        className={`orders-order-status-badge orders-order-status ${order.order_status?.toLowerCase()}`}
                      >
                        {formatStatus(order.order_status)}
                      </span>
                    </div>
                    <p className="orders-order-date">
                      Date:{" "}
                      {order.orderDate
                        ? new Date(order.orderDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="orders-order-shipping">
                      Shipping: {formatStatus(order.shipping_status)}
                    </p>
                    <p className="orders-order-total">
                      Total: {formatPrice(order.totalPrice)}
                    </p>
                  </div>
                  <div className="orders-order-actions">
                    <button
                      onClick={() => handleToggleDetails(order._id)}
                      className="orders-toggle-details"
                      aria-label={
                        selectedOrderId === order._id
                          ? `Hide details for order`
                          : `View details for order`
                      }
                    >
                      {selectedOrderId === order._id
                        ? "Hide Details"
                        : "View Details"}
                    </button>
                    {canCancelOrder(order) ? (
                      <button
                        className="orders-feedback-modal-btn"
                        onClick={() => openCancelModal(order)}
                        aria-label="Cancel Order"
                      >
                        Cancel Order
                      </button>
                    ) : canProvideFeedback(order) && (
                      <button
                        className="orders-feedback-modal-btn"
                        onClick={() => {
                          const details = orderDetailsCache[order._id] || [];
                          let targetDetail =
                            details.find(
                              (d) =>
                                !d.feedback_details ||
                                d.feedback_details === "None"
                            ) || details[0];
                          if (targetDetail)
                            openFeedbackModal(targetDetail, order);
                        }}
                        aria-label={(() => {
                          const details = orderDetailsCache[order._id] || [];
                          const hasFeedback = details.some(
                            (d) =>
                              d.feedback_details &&
                              d.feedback_details !== "None"
                          );
                          return hasFeedback ? "Edit Feedback" : "Add Feedback";
                        })()}
                      >
                        {(() => {
                          const details = orderDetailsCache[order._id] || [];
                          const hasFeedback = details.some(
                            (d) =>
                              d.feedback_details &&
                              d.feedback_details !== "None"
                          );
                          return hasFeedback ? "Edit Feedback" : "Add Feedback";
                        })()}
                      </button>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                {selectedOrderId === order._id && (
                  <div className="orders-details-section">
                    {orderDetailsCache[order._id]?.length === 0 ||
                    !orderDetailsCache[order._id] ? (
                      <p className="orders-no-details">
                        No details available for this order.
                      </p>
                    ) : (
                      <div className="orders-details-list">
                        {orderDetails.map((detail) => (
                          <div key={detail._id} className="orders-detail-item">
                            <div className="orders-detail-info">
                              <p className="orders-detail-name">
                                {detail.variant_id?.pro_id?.pro_name ||
                                  "Unnamed Product"}
                              </p>
                              <p className="orders-detail-variant">
                                Color:{" "}
                                {detail.variant_id?.color_id?.color_name ||
                                  "N/A"}
                                , Size:{" "}
                                {detail.variant_id?.size_id?.size_name || "N/A"}
                              </p>
                              <p className="orders-detail-quantity">
                                Quantity: {detail.Quantity || 0}
                              </p>
                              <p className="orders-detail-price">
                                Unit Price: {formatPrice(detail.UnitPrice)}
                              </p>
                            </div>
                            <p className="orders-detail-total">
                              {formatPrice(
                                (detail.UnitPrice || 0) * (detail.Quantity || 0)
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;