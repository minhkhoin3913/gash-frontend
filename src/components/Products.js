import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/ProductList.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
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
    return Promise.reject({ ...error, message });
  }
);

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient({ url, ...options });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const Products = () => {
  const { state, search } = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(search).get("q") || state?.searchQuery || "";

  // Use state?.searchResults only if it matches the current query
  const initialProducts = (state?.searchQuery && state?.searchQuery === query && Array.isArray(state?.searchResults)) ? state.searchResults : [];
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSearchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithRetry("/products/search", {
        method: "GET",
        params: { q: searchQuery.trim() },
      });
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to fetch search results");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Always fetch new results when query changes
  useEffect(() => {
    if (query) {
      fetchSearchResults(query);
    } else {
      setProducts([]);
    }
  }, [query, fetchSearchResults]);

  const formatPrice = useCallback((price) => {
    if (typeof price !== "number" || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  const handleProductClick = useCallback((id) => {
    if (!id) return;
    navigate(`/product/${id}`);
  }, [navigate]);

  const handleKeyDown = useCallback((e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleProductClick(id);
    }
  }, [handleProductClick]);

  useEffect(() => {
    if (error) {
      const errorElement = document.querySelector(".product-list-error");
      errorElement?.focus();
    }
  }, [error]);

  return (
    <div className="product-list-container">
      <main className="product-list-main-content" role="main">
        <header className="product-list-results-header">
          <h1>{query ? `Search Results for "${query}"` : "Products"}</h1>
          {!loading && !error && products.length > 0 && (
            <p className="product-list-results-count">
              Showing {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          )}
        </header>
        {loading && (
          <div className="product-list-loading" role="status" aria-live="polite">
            <div className="product-list-loading-spinner" aria-hidden="true"></div>
            Loading products...
          </div>
        )}
        {error && (
          <div className="product-list-error" role="alert" tabIndex={0} aria-live="polite">
            <span className="product-list-error-icon" aria-hidden="true">⚠</span>
            {error}
          </div>
        )}
        {!loading && !error && products.length === 0 && query && (
          <div className="product-list-no-products" role="status">
            <p>No products found for "{query}"</p>
          </div>
        )}
        {!loading && !error && products.length > 0 && (
          <div className="product-list-product-grid" role="grid" aria-label={`${products.length} products`}>
            {products.map((product) => (
              <article
                key={product._id}
                className="product-list-product-card"
                onClick={() => handleProductClick(product._id)}
                onKeyDown={(e) => handleKeyDown(e, product._id)}
                role="gridcell"
                tabIndex={0}
                aria-label={`View ${product.pro_name || "product"} details`}
              >
                <div className="product-list-image-container">
                  <img
                    src={product.imageURL || "/placeholder-image.png"}
                    alt={product.pro_name || "Product image"}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "/placeholder-image.png";
                      e.target.alt = `Image not available for ${product.pro_name || "product"}`;
                    }}
                  />
                </div>
                <div className="product-list-content">
                  <h2 title={product.pro_name}>{product.pro_name || "Unnamed Product"}</h2>
                  <p className="product-list-price">{formatPrice(product.pro_price)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;