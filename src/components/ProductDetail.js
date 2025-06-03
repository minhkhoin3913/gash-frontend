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

// API functions
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get(url);
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

  // Local storage for user preferences
  const [storedState, setStoredState] = useLocalStorage(DETAIL_STORAGE_KEY, {});

  // Data fetching functions
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

      // Extract unique colors with better validation
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
      // Fallback attempt
      try {
        const [productResponse, allVariantsResponse] = await Promise.all([
          fetchWithRetry(`/products/${id}`),
          fetchWithRetry("/variants"),
        ]);

        setProduct(productResponse);
        const productVariants = (allVariantsResponse || []).filter(
          (variant) => variant.pro_id?._id === id
        );
        
        setVariants(productVariants);

        const uniqueColors = [
          ...new Set(
            productVariants
              .map((variant) => variant.color_id?.color_name)
              .filter(Boolean)
          ),
        ].sort();

        setAvailableColors(uniqueColors);

        if (uniqueColors.length > 0) {
          const defaultColor = storedState[id]?.selectedColor || uniqueColors[0];
          setSelectedColor(defaultColor);
          
          const filteredVariants = productVariants.filter(
            (variant) => variant.color_id?.color_name === defaultColor
          );
          
          setAvailableSizes(
            [...new Set(
              filteredVariants
                .map((variant) => variant.size_id?.size_name)
                .filter(Boolean)
            )].sort()
          );
          
          setSelectedVariant(filteredVariants[0] || null);
        }

        setIsVariantSelected(false);
      } catch (fallbackErr) {
        const errorMessage = fallbackErr.code === 'ECONNABORTED'
          ? "Request timeout - please check your connection"
          : fallbackErr.response?.status === 404
          ? "Product not found"
          : fallbackErr.response?.status >= 500
          ? "Server error - please try again later"
          : "Failed to fetch product details";
        
        setError(errorMessage);
        console.error("Error fetching product:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [id, storedState]);

  // Effect for initial data fetch
  useEffect(() => {
    fetchProductAndVariants();
  }, [fetchProductAndVariants]);

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

    // Store user preference
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

      // Success feedback
      alert("Item added to cart successfully!");
    } catch (err) {
      console.error("Add to cart error:", err.response || err);
      const errorMessage = err.response?.status === 401
        ? "Please log in to add items to cart"
        : err.response?.status === 400
        ? "Invalid product selection"
        : err.response?.data?.message || "Failed to add item to cart";
      
      setError(errorMessage);
    } finally {
      setIsAddingToCart(false);
    }
  }, [user, selectedVariant, product, navigate, isInStock]);

  const handleRetry = useCallback(() => {
    fetchProductAndVariants();
  }, [fetchProductAndVariants]);

  // Helper functions
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  const renderStarRating = useCallback((rating = 0) => {
    return [...Array(5)].map((_, i) => (
      <span
        key={i}
        className={`product-detail-star ${i < rating ? 'filled' : 'empty'}`}
      >
        ★
      </span>
    ));
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
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-error">
          <span>Product not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      {/* Breadcrumb */}
      <nav className="product-detail-breadcrumb">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Home
        </a>
        {' > '}
        <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>
          Products
        </a>
        {' > '}
        <span>{product.pro_name || 'Product'}</span>
      </nav>

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
            />
          </div>
        </div>

        {/* Product Info Section */}
        <div className="product-detail-info">
          <h1>{product.pro_name || 'Unnamed Product'}</h1>
          
          <div className="product-detail-rating">
            {renderStarRating(product.rating || 4)}
            <span className="product-detail-review-count">
              ({product.reviewCount || 0} reviews)
            </span>
          </div>

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
              <div className="product-detail-color-section">
                <label><strong>Color:</strong></label>
                <div className="product-detail-color-buttons">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      className={`product-detail-color-button ${
                        selectedColor === color ? 'selected' : ''
                      }`}
                      onClick={() => handleColorClick(color)}
                      type="button"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableSizes.length > 0 && (
              <div className="product-detail-size-section">
                <label><strong>Size:</strong></label>
                <div className="product-detail-size-buttons">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      className={`product-detail-size-button ${
                        selectedVariant?.size_id?.size_name === size ? 'selected' : ''
                      }`}
                      onClick={() => handleSizeClick(size)}
                      type="button"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="product-detail-actions">
          <button
            className="product-detail-add-to-cart"
            onClick={handleAddToCart}
            disabled={!selectedVariant || !isInStock || isAddingToCart}
            type="button"
          >
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
          
          <button
            className="product-detail-buy-now"
            disabled={!selectedVariant || !isInStock}
            type="button"
          >
            Buy Now
          </button>

          <div className="product-detail-shipping">
            <strong>FREE delivery</strong> by tomorrow
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
    </div>
  );
};

export default ProductDetail;
