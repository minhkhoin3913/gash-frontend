import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/ProductList.css";

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const FILTER_STORAGE_KEY = "productListFilters";
const DEFAULT_FILTERS = {
  category: "All Categories",
  color: "All Colors",
  size: "All Sizes"
};

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

// API client with interceptors for better error handling
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
    return Promise.reject({ ...error, message });
  }
);

// API functions
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

const ProductList = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Filter state with URL sync and localStorage
  const [searchParams, setSearchParams] = useSearchParams();
  const [storedFilters, setStoredFilters] = useLocalStorage(FILTER_STORAGE_KEY, DEFAULT_FILTERS);
  
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || storedFilters.category || DEFAULT_FILTERS.category
  );
  const [selectedColor, setSelectedColor] = useState(
    searchParams.get('color') || storedFilters.color || DEFAULT_FILTERS.color
  );
  const [selectedSize, setSelectedSize] = useState(
    searchParams.get('size') || storedFilters.size || DEFAULT_FILTERS.size
  );

  const navigate = useNavigate();

  // Debounce filter changes
  const debouncedCategory = useDebounce(selectedCategory, 300);
  const debouncedColor = useDebounce(selectedColor, 300);
  const debouncedSize = useDebounce(selectedSize, 300);

  // Data fetching functions
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const productsData = await fetchWithRetry("/products");
      
      if (!Array.isArray(productsData) || productsData.length === 0) {
        setError("No products available at this time");
        setProducts([]);
        setCategories([]);
        return;
      }

      setProducts(productsData);
      
      // Extract unique categories
      const uniqueCategories = [
        ...new Set(
          productsData
            .map(product => product.cat_id?.cat_name)
            .filter(Boolean)
        )
      ].sort();
      
      setCategories(uniqueCategories);
    } catch (err) {
      setError(err.message || "Failed to fetch products");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVariants = useCallback(async () => {
    try {
      const variantsData = await fetchWithRetry("/variants");
      
      if (!Array.isArray(variantsData)) {
        console.warn("Invalid variants data received");
        return;
      }

      setVariants(variantsData);
      
      // Extract unique colors and sizes
      const uniqueColors = [
        ...new Set(
          variantsData
            .map(variant => variant.color_id?.color_name)
            .filter(Boolean)
        )
      ].sort();
      
      const uniqueSizes = [
        ...new Set(
          variantsData
            .map(variant => variant.size_id?.size_name)
            .filter(Boolean)
        )
      ].sort();
      
      setColors(uniqueColors);
      setSizes(uniqueSizes);
    } catch (err) {
      console.error("Error fetching variants:", err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchProducts();
    fetchVariants();
  }, [fetchProducts, fetchVariants]);

  // Sync filters with URL and localStorage
  useEffect(() => {
    const currentFilters = {
      category: selectedCategory,
      color: selectedColor,
      size: selectedSize
    };

    setStoredFilters(currentFilters);

    const newSearchParams = new URLSearchParams();
    if (selectedCategory !== DEFAULT_FILTERS.category) {
      newSearchParams.set('category', selectedCategory);
    }
    if (selectedColor !== DEFAULT_FILTERS.color) {
      newSearchParams.set('color', selectedColor);
    }
    if (selectedSize !== DEFAULT_FILTERS.size) {
      newSearchParams.set('size', selectedSize);
    }

    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [selectedCategory, selectedColor, selectedSize, setStoredFilters, setSearchParams, searchParams]);

  // Optimized product filtering
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    setIsFiltering(true);
    
    try {
      let filtered = [...products];

      if (debouncedCategory !== "All Categories") {
        filtered = filtered.filter(
          product => product.cat_id?.cat_name === debouncedCategory
        );
      }

      if (debouncedColor !== "All Colors" || debouncedSize !== "All Sizes") {
        const matchingVariantIds = variants
          .filter(variant => {
            if (!variant.pro_id?._id) return false;
            
            const matchesColor = debouncedColor === "All Colors" || 
              variant.color_id?.color_name === debouncedColor;
            const matchesSize = debouncedSize === "All Sizes" || 
              variant.size_id?.size_name === debouncedSize;
            
            return matchesColor && matchesSize;
          })
          .map(variant => variant.pro_id._id);

        filtered = filtered.filter(product => 
          matchingVariantIds.includes(product._id)
        );
      }

      filtered.sort((a, b) => (a.pro_name || '').localeCompare(b.pro_name || ''));
      
      return filtered;
    } catch (err) {
      console.error("Error filtering products:", err);
      setError("Error applying filters");
      return products;
    } finally {
      setTimeout(() => setIsFiltering(false), 100);
    }
  }, [products, variants, debouncedCategory, debouncedColor, debouncedSize]);

  // Event handlers
  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'category':
        setSelectedCategory(value);
        break;
      case 'color':
        setSelectedColor(value);
        break;
      case 'size':
        setSelectedSize(value);
        break;
      default:
        console.warn(`Unknown filter type: ${filterType}`);
    }
  }, []);

  const handleProductClick = useCallback((id) => {
    if (!id) {
      console.error("Product ID is required");
      return;
    }
    navigate(`/product/${id}`);
  }, [navigate]);

  const handleKeyDown = useCallback((e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleProductClick(id);
    }
  }, [handleProductClick]);

  const handleRetry = useCallback(() => {
    fetchProducts();
    fetchVariants();
  }, [fetchProducts, fetchVariants]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory(DEFAULT_FILTERS.category);
    setSelectedColor(DEFAULT_FILTERS.color);
    setSelectedSize(DEFAULT_FILTERS.size);
  }, []);

  // Helper functions
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  const renderStarRating = useCallback((rating = 0) => {
    return [...Array(5)].map((_, i) => (
      <span 
        key={i} 
        className={`product-list-star ${i < Math.round(rating) ? 'filled' : 'empty'}`}
        aria-hidden="true"
      >
        ★
      </span>
    ));
  }, []);

  // Filter section component
  const FilterSection = ({ title, options, selectedValue, filterType }) => (
    <fieldset className="product-list-filter-group">
      <legend>{title}</legend>
      <label>
        <input
          type="radio"
          name={filterType}
          value={`All ${title}`}
          checked={selectedValue === `All ${title}`}
          onChange={(e) => handleFilterChange(filterType, e.target.value)}
          aria-describedby={`${filterType}-description`}
        />
        All {title}
      </label>
      {options.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={filterType}
            value={option}
            checked={selectedValue === option}
            onChange={(e) => handleFilterChange(filterType, e.target.value)}
            aria-describedby={`${filterType}-description`}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );

  const hasActiveFilters = selectedCategory !== DEFAULT_FILTERS.category || 
                         selectedColor !== DEFAULT_FILTERS.color || 
                         selectedSize !== DEFAULT_FILTERS.size;

  return (
    <div className="product-list-container">
      <aside className="product-list-sidebar" role="complementary" aria-label="Product filters">
        <div className="product-list-filter-header">
          <h2>Filtering</h2>
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className="product-list-clear-filters"
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>
        
        <FilterSection
          title="Categories"
          options={categories}
          selectedValue={selectedCategory}
          filterType="category"
        />
        
        <FilterSection
          title="Colors"
          options={colors}
          selectedValue={selectedColor}
          filterType="color"
        />
        
        <FilterSection
          title="Sizes"
          options={sizes}
          selectedValue={selectedSize}
          filterType="size"
        />
      </aside>

      <main className="product-list-main-content" role="main">
        <header className="product-list-results-header">
          <h1>Product Listings</h1>
          <p>
            Explore our range of products below. Select a product to view
            detailed information, pricing, and available variations.
          </p>
          {filteredProducts.length > 0 && !loading && !isFiltering && (
            <p className="product-list-results-count">
              Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' matching your filters'}
            </p>
          )}
        </header>

        {error && (
          <div className="product-list-error" role="alert" aria-live="polite">
            <span className="product-list-error-icon" aria-hidden="true">⚠</span>
            {error}
            <button 
              onClick={handleRetry} 
              className="product-list-retry-button"
              aria-label="Retry loading products"
            >
              Retry
            </button>
          </div>
        )}

        {(loading || isFiltering) && (
          <div className="product-list-loading" role="status" aria-live="polite">
            <span className="product-list-loading-spinner" aria-hidden="true"></span>
            {loading ? "Loading products..." : "Filtering..."}
          </div>
        )}

        {!loading && !isFiltering && filteredProducts.length === 0 && !error && (
          <div className="product-list-no-products" role="status">
            <p>No products found for selected filters</p>
            {hasActiveFilters && (
              <button 
                onClick={clearAllFilters}
                className="product-list-clear-filters-inline"
              >
                Clear filters to see all products
              </button>
            )}
          </div>
        )}

        {!loading && !isFiltering && filteredProducts.length > 0 && (
          <div 
            className="product-list-product-grid" 
            role="grid" 
            aria-label={`${filteredProducts.length} products`}
          >
            {filteredProducts.map((product) => (
              <article
                key={product._id}
                className="product-list-product-card"
                onClick={() => handleProductClick(product._id)}
                onKeyDown={(e) => handleKeyDown(e, product._id)}
                role="gridcell"
                tabIndex={0}
                aria-label={`View ${product.pro_name || 'product'} details`}
              >
                <div className="product-list-image-container">
                  <img
                    src={product.imageURL || '/placeholder-image.png'}
                    alt={product.pro_name || 'Product image'}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/placeholder-image.png';
                      e.target.alt = 'Image not available';
                    }}
                  />
                </div>
                
                <div className="product-list-content">
                  <h2 title={product.pro_name}>
                    {product.pro_name || 'Unnamed Product'}
                  </h2>
                  
                  {/* <div className="product-list-rating" role="img" aria-label={`${product.rating || 0} out of 5 stars`}>
                    {renderStarRating(product.rating || 0)}
                    <span className="product-list-review-count" aria-label="No reviews available">
                      (N/A)
                    </span>
                  </div> */}
                  
                  <p className="product-list-price" aria-label={`Price: ${formatPrice(product.pro_price)}`}>
                    {formatPrice(product.pro_price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductList;