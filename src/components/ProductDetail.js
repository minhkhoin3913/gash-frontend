import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import "../styles/ProductDetail.css";

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DETAIL_STORAGE_KEY = "productDetailState";

// Custom hooks
const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

// API client with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const message = status === 401 ? "Unauthorized access - please log in" :
                    status === 404 ? "Resource not found" :
                    status >= 500 ? "Server error - please try again later" :
                    "Network error - please check your connection";
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
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // State management
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isVariantSelected, setIsVariantSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [toast, setToast] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  // Local storage for user preferences
  const [storedState, setStoredState] = useLocalStorage(DETAIL_STORAGE_KEY, {});

  // Data fetching for product and variants
  const fetchProductAndVariants = useCallback(async () => {
    if (!id) {
      setError("Product ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [productResponse, variantsResponse] = await Promise.all([
        fetchWithRetry(`/products/${id}`),
        fetchWithRetry(`/variants?pro_id=${id}`),
      ]);

      if (!productResponse) {
        throw new Error("Product not found");
      }

      setProduct(productResponse);
      setVariants(variantsResponse || []);

      // Extract unique colors
      const uniqueColors = [
        ...new Set(
          (variantsResponse || [])
            .map((variant) => variant.color_id?.color_name)
            .filter(Boolean)
        ),
      ].sort();

      setAvailableColors(uniqueColors);

      // Set default color and variant
      if (uniqueColors.length > 0) {
        const defaultColor = storedState[id]?.selectedColor || uniqueColors[0];
        setSelectedColor(defaultColor);
        
        const filteredVariants = variantsResponse.filter(
          (variant) => variant.color_id?.color_name === defaultColor
        );
        
        const uniqueSizes = [
          ...new Set(
            filteredVariants
              .map((variant) => variant.size_id?.size_name)
              .filter(Boolean)
          ),
        ].sort();

        setAvailableSizes(uniqueSizes);
        setSelectedVariant(filteredVariants[0] || null);
      }

      setIsVariantSelected(false);
    } catch (err) {
      setError(err.message || "Failed to fetch product details");
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  }, [id, storedState]);

  // Data fetching for feedbacks
  const fetchFeedbacks = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const feedbackResponse = await fetchWithRetry(`/order-details/product/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setFeedbacks(feedbackResponse || []);
    } catch (err) {
      if (err.status === 404) {
        setFeedbacks([]); // Treat 404 as no feedback available
      } else {
        setFeedbackError(err.message || "Failed to fetch feedback");
        console.error("Error fetching feedbacks:", err);
      }
    } finally {
      setFeedbackLoading(false);
    }
  }, [id]);

  // Initial data fetch
  useEffect(() => {
    fetchProductAndVariants();
    fetchFeedbacks();
  }, [fetchProductAndVariants, fetchFeedbacks]);

  // Memoized computed values
  const isInStock = useMemo(() => {
    return product?.status_product === 'active';
  }, [product]);

  // Event handlers
  const handleColorClick = useCallback((color) => {
    if (!color) return;

    setSelectedColor(color);
    const filteredVariants = variants.filter(
      (variant) => variant.color_id?.color_name === color
    );
    
    const newSizes = [
      ...new Set(
        filteredVariants
          .map((variant) => variant.size_id?.size_name)
          .filter(Boolean)
      ),
    ].sort();

    setAvailableSizes(newSizes);
    setSelectedVariant(filteredVariants[0] || null);
    setIsVariantSelected(true);

    setStoredState(prev => ({
      ...prev,
      [id]: { ...prev[id], selectedColor: color }
    }));
  }, [variants, id, setStoredState]);

  const handleSizeClick = useCallback((size) => {
    if (!size || !selectedColor) return;

    const variant = variants.find(
      (v) => v.color_id?.color_name === selectedColor && v.size_id?.size_name === size
    );
    
    setSelectedVariant(variant);
    setIsVariantSelected(true);
  }, [variants, selectedColor]);

  const handleAddToCart = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please select a variant");
      return;
    }

    if (!isInStock) {
      setError("Product is out of stock");
      return;
    }

    setIsAddingToCart(true);
    setError(null);

    try {
      const cartItem = {
        acc_id: user._id,
        variant_id: selectedVariant._id,
        pro_quantity: 1,
        pro_price: product.pro_price,
      };

      await apiClient.post("/carts", cartItem, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
      });

      setToast({ type: 'success', message: "Item added to cart successfully!" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const errorMessage = err.message || "Failed to add item to cart";
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
      console.error("Add to cart error:", err);
    } finally {
      setIsAddingToCart(false);
    }
  }, [user, selectedVariant, product, navigate, isInStock]);

  const handleAddToFavorites = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setIsAddingToFavorites(true);
    setError(null);

    try {
      const favoriteItem = {
        acc_id: user._id,
        pro_id: id,
      };

      await apiClient.post("/favorites", favoriteItem, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
      });

      setToast({ type: 'success', message: "Product added to favorites successfully!" });
      setTimeout(() => {
        setToast(null);
        navigate("/favorites");
      }, 2000);
    } catch (err) {
      const errorMessage = err.message || "Failed to add to favorites";
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
      console.error("Add to favorites error:", err);
    } finally {
      setIsAddingToFavorites(false);
    }
  }, [user, id, navigate]);

  const handleBuyNow = useCallback(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please select a variant");
      return;
    }

    if (!isInStock) {
      setError("Product is out of stock");
      return;
    }

    navigate("/checkout");
  }, [user, selectedVariant, isInStock, navigate]);

  const handleRetry = useCallback(() => {
    fetchProductAndVariants();
    fetchFeedbacks();
  }, [fetchProductAndVariants, fetchFeedbacks]);

  // Helper functions
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  const renderStarRating = useCallback((rating = 0) => {
    return [...Array(5)].map((_, i) => (
      <span
        key={i}
        className={`product-detail-star ${i < Math.round(rating) ? 'filled' : 'empty'}`}
      >
        ★
      </span>
    ));
  }, []);

  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown Date";
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-loading">
          <div className="product-detail-loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-error">
          <span className="product-detail-error-icon">⚠</span>
          <span>{error}</span>
          <button 
            className="product-detail-retry-button" 
            onClick={handleRetry}
            type="button"
            aria-label="Retry loading product"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="product-detail-container">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`product-detail-toast ${toast.type === 'success' ? 'product-detail-toast-success' : 'product-detail-toast-error'}`}
          role="alert">
            {toast.message}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="product-detail-error">
          <span className="product-detail-error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <div className="product-detail-main">
        {/* Product Image Section */}
        <div className="product-detail-image-section">
          <div className="product-detail-thumbnails">
            {product.imageURL && (
              <div className="product-detail-thumbnail selected">
                <img 
                  src={product.imageURL} 
                  alt={product.pro_name || 'Product'} 
                />
              </div>
            )}
          </div>
          
          <div className="product-detail-image">
            <img 
              src={product.imageURL || '/placeholder-image.png'} 
              alt={product.pro_name || 'Product'} 
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
                e.target.alt = 'Image not available';
              }}
            />
          </div>
        </div>

        {/* Product Info Section */}
        <div className="product-detail-info">
          <h1>{product.pro_name || 'Unnamed Product'}</h1>
          
          <div className="product-detail-price">
            {formatPrice(product.pro_price)}
          </div>

          <div className="product-detail-stock-status">
            <span className={`product-detail-stock ${isInStock ? 'in-stock' : 'out-of-stock'}`}>
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          {/* Variants Selection */}
          <div className="product-detail-variants">
            {availableColors.length > 0 && (
              <fieldset className="product-detail-color-section">
                <legend><strong>Color:</strong></legend>
                <div className="product-detail-color-buttons">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      className={`product-detail-color-button ${selectedColor === color ? 'selected' : ''}`}
                      onClick={() => handleColorClick(color)}
                      type="button"
                      aria-label={`Select ${color} color`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {availableSizes.length > 0 && (
              <fieldset className="product-detail-size-section">
                <legend><strong>Size:</strong></legend>
                <div className="product-detail-size-buttons">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      className={`product-detail-size-button ${selectedVariant?.size_id?.size_name === size ? 'selected' : ''}`}
                      onClick={() => handleSizeClick(size)}
                      type="button"
                      aria-label={`Select ${size} size`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </div>

        {/* Product Actions Section */}
        <div className="product-detail-actions-section">
          <button
            className="product-detail-add-to-favorites"
            onClick={handleAddToFavorites}
            disabled={isAddingToFavorites}
            type="button"
            aria-label="Add to favorites"
          >
            {isAddingToFavorites ? 'Adding...' : 'Add to Favorites'}
          </button>
          
          <button
            className="product-detail-add-to-cart"
            onClick={handleAddToCart}
            disabled={!selectedVariant || !isInStock || isAddingToCart}
            type="button"
            aria-label="Add to cart"
          >
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
          
          <button
            className="product-detail-buy-now"
            onClick={handleBuyNow}
            disabled={!selectedVariant || !isInStock}
            type="button"
            aria-label="Buy now"
          >
            Buy Now
          </button>

          <div className="product-detail-shipping" aria-label="Shipping and return information">
            <div className="product-detail-shipping-delivery">
              <strong>FREE delivery</strong> by tomorrow
            </div>
            <div className="product-detail-shipping-deliver">
              <strong>Deliver to</strong> United States
            </div>
            <div className="product-detail-shipping-returns">
              <strong>Return Policy:</strong> 30-day returns. Free returns on eligible orders.
            </div>
          </div>
        </div>
      </div>

      {/* Product Description */}
      {product.description && (
        <div className="product-detail-description">
          <h2>Product Description</h2>
          <div dangerouslySetInnerHTML={{ __html: product.description }} />
        </div>
      )}

      {/* Feedback Section */}
      <div className="product-detail-feedback">
        <h2>Customer Feedback</h2>
        {feedbackLoading && (
          <div className="product-detail-feedback-loading">
            <div className="product-detail-loading-spinner"></div>
            <p>Loading feedback...</p>
          </div>
        )}
        {feedbackError && (
          <div className="product-detail-feedback-error">
            <span className="product-detail-error-icon">⚠</span>
            <span>{feedbackError}</span>
            <button 
              className="product-detail-retry-button" 
              onClick={fetchFeedbacks}
              type="button"
              aria-label="Retry loading feedback"
            >
              Retry
            </button>
          </div>
        )}
        {!feedbackLoading && !feedbackError && feedbacks.length === 0 && (
          <p className="product-detail-feedback-empty">No Feedbacks Yet</p>
        )}
        {!feedbackLoading && !feedbackError && feedbacks.length > 0 && (
          <div className="product-detail-feedback-list">
            {feedbacks.map((feedback) => (
              <div key={feedback._id} className="product-detail-feedback-item">
                <div className="product-detail-feedback-header">
                  <span className="product-detail-feedback-username">
                    {feedback.order_id?.acc_id?.username || "Anonymous"}
                  </span>
                  <span className="product-detail-feedback-date">
                    {formatDate(feedback.order_id?.orderDate)}
                  </span>
                </div>
                <div className="product-detail-feedback-details">
                  <p><strong>Product:</strong> {feedback.variant_id?.pro_id?.pro_name || "N/A"}</p>
                  <p><strong>Color:</strong> {feedback.variant_id?.color_id?.color_name || "N/A"}</p>
                  <p><strong>Size:</strong> {feedback.variant_id?.size_id?.size_name || "N/A"}</p>
                </div>
                <p className="product-detail-feedback-text">{feedback.feedback_details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;