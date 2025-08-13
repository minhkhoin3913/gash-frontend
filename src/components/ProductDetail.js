import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import DOMPurify from "dompurify";
import "../styles/ProductDetail.css";
import {
  DETAIL_STORAGE_KEY,
  API_RETRY_COUNT,
  API_RETRY_DELAY,
  TOAST_TIMEOUT,
} from "../constants/constants";

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const THUMBNAILS_PER_PAGE = 4;

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

  const setStoredValue = useCallback(
    (newValue) => {
      try {
        setValue(newValue);
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [value, setStoredValue];
};

// API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
const fetchWithRetry = async (
  url,
  options = {},
  retries = API_RETRY_COUNT,
  delay = API_RETRY_DELAY
) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient(url, options);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [feedbacksToShow, setFeedbacksToShow] = useState(5);

  // Local storage
  const [storedState, setStoredState] = useLocalStorage(DETAIL_STORAGE_KEY, {});

  // Pre-index variants
  const variantIndex = useMemo(() => {
    const index = { byColor: {}, bySize: {}, byColorSize: {} };
    variants.forEach((variant) => {
      const color = variant.color_id?.color_name;
      const size = variant.size_id?.size_name;
      if (color) {
        index.byColor[color] = index.byColor[color] || [];
        index.byColor[color].push(variant);
      }
      if (size) {
        index.bySize[size] = index.bySize[size] || [];
        index.bySize[size].push(variant);
      }
      if (color && size) {
        index.byColorSize[`${color}-${size}`] = variant;
      }
    });
    return index;
  }, [variants]);

  // Data fetching
  const fetchProductAndVariants = useCallback(async () => {
    if (!id) {
      setError("Product ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Always fetch product and variants, but handle images separately
      const [productResponse, variantsResponse] = await Promise.all([
        fetchWithRetry(`/products/${id}`),
        fetchWithRetry(`/variants?pro_id=${id}`),
      ]);

      let imagesResponse = [];
      try {
        imagesResponse = await fetchWithRetry(`/specifications/image/product/${id}`);
      } catch (imgErr) {
        imagesResponse = [];
      }

      if (!productResponse) {
        throw new Error("Product not found");
      }

      setProduct(productResponse);
      setVariants(variantsResponse || []);
      setImages(imagesResponse || []);

      if (!Array.isArray(variantsResponse) || variantsResponse.length === 0) {
        setAvailableColors([]);
        setAvailableSizes([]);
        setSelectedVariant(null);
      } else {
        const uniqueColors = [
          ...new Set(
            variantsResponse.map((v) => v.color_id?.color_name).filter(Boolean)
          ),
        ].sort();
        const uniqueSizes = [
          ...new Set(
            variantsResponse.map((v) => v.size_id?.size_name).filter(Boolean)
          ),
        ].sort();
        setAvailableColors(uniqueColors);
        setAvailableSizes(uniqueSizes);

        // Use latest storedState[id] for default selection, but do not depend on storedState
        const currentStored = window.localStorage.getItem(DETAIL_STORAGE_KEY);
        let parsedStored = {};
        try {
          parsedStored = currentStored ? JSON.parse(currentStored) : {};
        } catch {
          parsedStored = {};
        }
        // Start with no selection
        setSelectedColor(null);
        setSelectedSize(null);
        setQuantity(1);
        setSelectedVariant(null);
      }

      setSelectedImage(productResponse.imageURL || "/placeholder-image.png");
    } catch (err) {
      setError(err.message || "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchFavorites = useCallback(async () => {
    if (!user || !localStorage.getItem("token")) {
      setIsFavorited(false);
      setFavoriteId(null);
      return;
    }

    try {
      const favorites = await fetchWithRetry("/favorites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const favorite = favorites.find((f) => f.pro_id?._id === id);
      setIsFavorited(!!favorite);
      setFavoriteId(favorite?._id || null);
    } catch (err) {
      setError(err.message || "Failed to fetch favorites");
      setIsFavorited(false);
      setFavoriteId(null);
    }
  }, [id, user]);

  const fetchFeedbacks = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const feedbackResponse = await fetchWithRetry(
        `/order-details/product/${id}`
      );
      setFeedbacks(feedbackResponse || []);
    } catch (err) {
      if (err.status === 404) {
        setFeedbacks([]);
      } else {
        setFeedbackError(err.message || "Failed to fetch feedback");
      }
    } finally {
      setFeedbackLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchProductAndVariants();
    fetchFeedbacks();
    fetchFavorites();
    setFeedbacksToShow(5); // Reset shown feedbacks when product changes
    // Only depend on id and the fetch functions themselves
  }, [id, fetchFeedbacks, fetchFavorites, fetchProductAndVariants]);

  // Focus error
  useEffect(() => {
    if (error) {
      const errorElement = document.querySelector(".product-detail-error");
      errorElement?.focus();
    }
  }, [error]);

  // Stock status
  const isInStock = useMemo(
    () => product?.status_product === "active",
    [product]
  );

  // Quantity validation
  const handleQuantityChange = useCallback(
    (e) => {
      const value = e.target.value;
      const parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue) || parsedValue < 1) {
        setQuantity(1);
        setError("Quantity must be at least 1");
      } else {
        const maxQuantity = selectedVariant?.quantity
          ? Math.min(selectedVariant.quantity, 99)
          : 99;
        if (parsedValue > maxQuantity) {
          setQuantity(maxQuantity);
          setError(`Quantity cannot exceed ${maxQuantity}`);
        } else {
          setQuantity(parsedValue);
          setError(null);
        }
      }
      setStoredState((prev) => ({
        ...prev,
        [id]: { ...prev[id], quantity: parsedValue },
      }));
    },
    [id, selectedVariant, setStoredState]
  );

  // Event handlers
  const handleColorClick = useCallback(
    (color) => {
      if (!color) return;
      setSelectedColor(color);
      setSelectedSize(null); // Reset size selection when color changes
      setSelectedVariant(null);
      setStoredState((prev) => ({
        ...prev,
        [id]: { ...prev[id], selectedColor: color, selectedSize: null },
      }));
    },
    [variantIndex, id, setStoredState]
  );

  const handleSizeClick = useCallback(
    (size) => {
      if (!size) return;
      setSelectedSize(size);

      const variant = selectedColor
        ? variantIndex.byColorSize[`${selectedColor}-${size}`] || null
        : variantIndex.bySize[size]?.[0] || null;
      setSelectedVariant(variant);

      setStoredState((prev) => ({
        ...prev,
        [id]: { ...prev[id], selectedSize: size },
      }));
    },
    [variantIndex, selectedColor, id, setStoredState]
  );

  const handleImageClick = useCallback(
    (imageURL) => {
      if (selectedImage === imageURL) {
        setSelectedImage(product?.imageURL || "/placeholder-image.png");
      } else {
        setSelectedImage(imageURL);
      }
    },
    [selectedImage, product?.imageURL]
  );

  const handlePrevThumbnail = useCallback(() => {
    setThumbnailIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextThumbnail = useCallback(() => {
    const totalThumbnails = (product?.imageURL ? 1 : 0) + images.length;
    setThumbnailIndex((prev) =>
      Math.min(prev + 1, totalThumbnails - THUMBNAILS_PER_PAGE)
    );
  }, [product?.imageURL, images.length]);

  const handleRetry = useCallback(() => {
    fetchProductAndVariants();
    fetchFeedbacks();
    fetchFavorites();
  }, [fetchProductAndVariants, fetchFeedbacks, fetchFavorites]);

  const handleAddToFavorites = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setIsAddingToFavorites(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        await apiClient.delete(`/favorites/${favoriteId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setIsFavorited(false);
        setFavoriteId(null);
        setToast({
          type: "success",
          message: "Product removed from favorites successfully!",
        });
      } else {
        // Add to favorites
        const favoriteItem = {
          acc_id: user._id,
          pro_id: id,
        };
        const response = await apiClient.post("/favorites", favoriteItem, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setIsFavorited(true);
        setFavoriteId(response.data.favorite._id);
        setToast({
          type: "success",
          message: "Product added to favorites successfully!",
        });
      }
    } catch (err) {
      const message = err.message || isFavorited
        ? "Failed to remove from favorites"
        : "Failed to add to favorites";
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setIsAddingToFavorites(false);
      setTimeout(() => setToast(null), TOAST_TIMEOUT);
    }
  }, [user, id, navigate, isFavorited, favoriteId]);

  const handleAddToCart = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please select a valid color and size combination");
      return;
    }

    if (!isInStock) {
      setError("Product is out of stock");
      return;
    }

    if (selectedVariant.quantity && quantity > selectedVariant.quantity) {
      setError(`Only ${selectedVariant.quantity} items available in stock`);
      return;
    }

    setIsAddingToCart(true);

    try {
      const cartItem = {
        acc_id: user._id,
        variant_id: selectedVariant._id,
        pro_quantity: quantity,
        pro_price: product.pro_price,
      };

      await apiClient.post("/carts", cartItem, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setToast({
        type: "success",
        message: `${quantity} item${quantity > 1 ? "s" : ""} added to cart successfully!`,
      });
    } catch (err) {
      const message = err.message || "Failed to add item to cart";
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setIsAddingToCart(false);
      setTimeout(() => setToast(null), TOAST_TIMEOUT);
    }
  }, [user, selectedVariant, product, navigate, isInStock, quantity]);

  const handleBuyNow = useCallback(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please select a valid color and size combination");
      return;
    }

    if (!isInStock) {
      setError("Product is out of stock");
      return;
    }

    if (selectedVariant.quantity && quantity > selectedVariant.quantity) {
      setError(`Only ${selectedVariant.quantity} items available in stock`);
      return;
    }

    // Go to checkout with product info
    navigate("/checkout", {
      state: {
        product,
        variant: selectedVariant,
        quantity,
      },
    });
  }, [user, selectedVariant, isInStock, navigate, quantity, product]);

  // Combine product.imageURL and additional images
  const allThumbnails = useMemo(() => {
    const thumbnails = [];
    if (product?.imageURL) {
      thumbnails.push({ _id: "default", imageURL: product.imageURL });
    }
    return [...thumbnails, ...images];
  }, [product?.imageURL, images]);

  // Get visible thumbnails
  const visibleThumbnails = useMemo(() => {
    return allThumbnails.slice(
      thumbnailIndex,
      thumbnailIndex + THUMBNAILS_PER_PAGE
    );
  }, [allThumbnails, thumbnailIndex]);

  // Helpers
  const formatPrice = useCallback((price) => {
    if (typeof price !== "number" || isNaN(price)) return "N/A";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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

  // Check if a color-size combination is valid
  const isValidCombination = useCallback(
    (color, size) => {
      return !!variantIndex.byColorSize[`${color}-${size}`];
    },
    [variantIndex]
  );

  // Render
  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="product-list-loading" role="status" aria-live="polite">
          <div className="product-list-loading-spinner" aria-hidden="true"></div>
          Loading product details...
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-detail-container">
        <div className="product-list-error" role="alert" tabIndex={0} aria-live="polite">
          <span className="product-list-error-icon" aria-hidden="true">⚠</span>
          {error}
          <button
            className="product-list-retry-button"
            onClick={handleRetry}
            disabled={loading}
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
      {toast && (
        <div
          className={`product-detail-toast ${
            toast.type === "success"
              ? "product-detail-toast-success"
              : "product-detail-toast-error"
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="product-detail-error" role="alert" tabIndex={0}>
          <span className="product-detail-error-icon" aria-hidden="true">
            ⚠
          </span>
          {error}
        </div>
      )}

      <div className="product-detail-main">
        <div className="product-detail-image-section">
          <div className="product-detail-thumbnails-container">
            <button
              className="product-detail-thumbnail-arrow product-detail-thumbnail-arrow-up"
              onClick={handlePrevThumbnail}
              disabled={thumbnailIndex === 0}
              aria-label="Previous thumbnails"
            >
              <i className="lni lni-chevron-up"></i>
            </button>
            <div className="product-detail-thumbnails">
              {visibleThumbnails.map((image, index) => (
                <div
                  key={image._id || index}
                  className={`product-detail-thumbnail ${
                    selectedImage === image.imageURL ? "selected" : ""
                  }`}
                  onClick={() => handleImageClick(image.imageURL)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${
                    image._id === "default"
                      ? "default"
                      : `thumbnail ${thumbnailIndex + index + 1}`
                  } for ${product.pro_name || "Product"}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleImageClick(image.imageURL);
                      e.preventDefault();
                    }
                  }}
                >
                  <img
                    src={image.imageURL}
                    alt={`${product.pro_name || "Product"} ${
                      image._id === "default"
                        ? "default"
                        : `thumbnail ${thumbnailIndex + index + 1}`
                    }`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            <button
              className="product-detail-thumbnail-arrow product-detail-thumbnail-arrow-down"
              onClick={handleNextThumbnail}
              disabled={
                thumbnailIndex >= allThumbnails.length - THUMBNAILS_PER_PAGE
              }
              aria-label="Next thumbnails"
            >
              <i className="lni lni-chevron-down"></i>
            </button>
          </div>
          <div className="product-detail-image">
            <img
              src={selectedImage || "/placeholder-image.png"}
              alt={`${product.pro_name || "Product"}`}
              onError={(e) => {
                e.target.src = "/placeholder-image.png";
                e.target.alt = `Not available for ${
                  product.pro_name || "product"
                }`;
              }}
              loading="lazy"
            />
          </div>
        </div>

        <div className="product-detail-info">
          <h1>{product.pro_name || "Unnamed Product"}</h1>
          <div className="product-detail-price">
            {formatPrice(product.pro_price)}
          </div>
          <div className="product-detail-stock-status">
            <span
              className={`product-detail-stock ${
                isInStock ? "in-stock" : "out-of-stock"
              }`}
            >
              {isInStock ? "In Stock" : "Out of Stock"}
              {selectedVariant?.quantity &&
                ` (${selectedVariant.quantity} available)`}
            </span>
          </div>
          <div className="product-detail-variants">
            {availableColors.length > 0 && (
              <fieldset className="product-detail-color-section">
                <legend>Color:</legend>
                <div className="product-detail-color-buttons">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      className={`product-detail-color-button ${
                        selectedColor === color ? "selected" : ""
                      }`}
                      onClick={() => handleColorClick(color)}
                      type="button"
                      aria-label={`Select ${color} color`}
                      aria-pressed={selectedColor === color}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {availableSizes.length > 0 && (
              <fieldset className="product-detail-size-section">
                <legend>Size:</legend>
                <div className="product-detail-size-buttons">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      className={`product-detail-size-button ${
                        selectedSize === size ? "selected" : ""
                      }`}
                      onClick={() => handleSizeClick(size)}
                      disabled={
                        selectedColor &&
                        !isValidCombination(selectedColor, size)
                      }
                      type="button"
                      aria-label={`Select ${size} size`}
                      aria-pressed={selectedSize === size}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="product-detail-quantity-section">
              <legend>Quantity:</legend>
              <input
                type="number"
                className="product-detail-quantity-input"
                value={quantity}
                onChange={handleQuantityChange}
                min="1"
                max={selectedVariant?.quantity || 99}
                disabled={!selectedVariant || !isInStock}
                aria-label="Select quantity"
              />
            </fieldset>
          </div>
        </div>

        <div className="product-detail-actions-section">
          <button
            className="product-detail-add-to-favorites"
            onClick={handleAddToFavorites}
            disabled={isAddingToFavorites}
            type="button"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            {isAddingToFavorites
              ? isFavorited
                ? "Removing..."
                : "Adding..."
              : isFavorited
              ? "Remove from Favorites"
              : "Add to Favorites"}
          </button>
          <button
            className="product-detail-add-to-cart"
            onClick={handleAddToCart}
            disabled={!selectedVariant || !isInStock || isAddingToCart}
            type="button"
            aria-label="Add to cart"
          >
            {isAddingToCart ? "Adding..." : "Add to Cart"}
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
          <div className="product-detail-shipping">
            <div className="product-detail-shipping-delivery">
              <strong>FREE delivery</strong> by tomorrow
            </div>
            <div className="product-detail-shipping-deliver">
              <strong>Deliver to</strong> Vietnam
            </div>
            <div className="product-detail-shipping-returns">
              <strong>Return Policy:</strong> 30-day returns. Free returns on
              eligible orders.
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <div className="product-detail-description">
          <h2>Product Description</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(product.description),
            }}
          />
        </div>
      )}

      <div className="product-detail-feedback">
        <h2>Customer Feedback</h2>
        {feedbackLoading && (
          <div className="product-list-loading" role="status">
            <div
              className="product-detail-loading-spinner"
              aria-hidden="true"
            ></div>
            Loading feedback...
          </div>
        )}
        {feedbackError && (
          <div
            className="product-detail-feedback-error"
            role="alert"
            tabIndex={0}
          >
            <span className="product-detail-error-icon" aria-hidden="true">
              ⚠
            </span>
            {feedbackError}
            <button
              className="product-detail-retry-button"
              onClick={fetchFeedbacks}
              disabled={feedbackLoading}
              type="button"
              aria-label="Retry loading feedback"
            >
              Retry
            </button>
          </div>
        )}
        {!feedbackLoading && !feedbackError && feedbacks.length === 0 && (
          <p className="product-detail-feedback-empty">No Feedback Available</p>
        )}
        {!feedbackLoading && !feedbackError && feedbacks.length > 0 && (
          <>
            <div className="product-detail-feedback-list" role="list">
              {feedbacks.slice(0, feedbacksToShow).map((feedback) => (
                <div
                  key={feedback._id}
                  className="product-detail-feedback-item"
                  role="listitem"
                >
                  <div className="product-detail-feedback-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={feedback.order_id?.acc_id?.image}
                        alt={
                          feedback.order_id?.acc_id?.username
                            ? `${feedback.order_id.acc_id.username}'s profile picture`
                            : 'Default profile picture'
                        }
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #d5d9d9' }}
                      />
                      <span className="product-detail-feedback-username" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {feedback.order_id?.acc_id?.username || "Anonymous"}
                    </span>
                    </span>
                    <span className="product-detail-feedback-date" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', height: '100%' }}>
                      {formatDate(feedback.order_id?.orderDate)}
                    </span>
                  </div>
                  <div className="product-detail-feedback-details">
                    <p>
                      <strong>Product:</strong>{' '}
                      {feedback.variant_id?.pro_id?.pro_name || 'N/A'}
                    </p>
                    <p>
                      <strong>Color:</strong>{' '}
                      {feedback.variant_id?.color_id?.color_name || 'N/A'}
                    </p>
                    <p>
                      <strong>Size:</strong>{' '}
                      {feedback.variant_id?.size_id?.size_name || 'N/A'}
                    </p>
                  </div>
                  <p className="product-detail-feedback-text">
                    {feedback.feedback_details || 'No feedback provided'}
                  </p>
                </div>
              ))}
            </div>
            {feedbacks.length > feedbacksToShow && (
              <div className="product-detail-view-more-container">
                <button
                  className="product-detail-add-to-favorites product-detail-view-more-btn"
                  onClick={() => setFeedbacksToShow((prev) => prev + 5)}
                  type="button"
                >
                  View More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;