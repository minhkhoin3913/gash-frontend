import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Home.css";
import "../styles/ProductDetail.css"; // For button styling
import {
  API_RETRY_COUNT,
  API_RETRY_DELAY
} from "../constants/constants";

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

const fetchWithRetry = async (url, retries = API_RETRY_COUNT, delay = API_RETRY_DELAY) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

const carouselMessages = [
  "Welcome to GASH! Discover the latest trends.",
  "Enjoy exclusive deals and recommendations.",
  "Shop by category and find your perfect fit.",
  "Fast delivery and easy returns on all orders.",
  "Sign up for an account to save your favorites!"
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Carousel auto-cycling
  const AUTO_CYCLE_DELAY = 5000;
  const [isManuallyNavigated, setIsManuallyNavigated] = useState(false);
  useEffect(() => {
    if (isManuallyNavigated) {
      const pause = setTimeout(() => setIsManuallyNavigated(false), AUTO_CYCLE_DELAY);
      return () => clearTimeout(pause);
    }
    const timer = setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselMessages.length);
    }, AUTO_CYCLE_DELAY);
    return () => clearTimeout(timer);
  }, [carouselIndex, isManuallyNavigated]);

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
      setProducts(productsData.filter((product) => product.status_product !== "discontinued"));
      // Extract unique categories from products
      const uniqueCategories = [
        ...new Set(productsData.map((product) => product.cat_id?.cat_name).filter(Boolean)),
      ];
      setCategories(uniqueCategories);
    } catch (err) {
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Shuffle helpers
  const getRandomItems = (arr, count, excludeIds = []) => {
    if (!Array.isArray(arr) || arr.length <= count) return arr;
    const filtered = excludeIds.length > 0 ? arr.filter(item => !excludeIds.includes(item._id || item)) : arr;
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // State for randomized sections
  const [forYouProducts, setForYouProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [randomCategories, setRandomCategories] = useState([]);

  // Randomize once after products/categories are loaded
  useEffect(() => {
    const activeProducts = products.filter(p => p.status_product === 'active');
    if (activeProducts.length > 0) {
      const forYou = getRandomItems(activeProducts, 5);
      setForYouProducts(forYou);
      setRecommendedProducts(getRandomItems(activeProducts, 5, forYou.map(p => p._id)));
    }
  }, [products]);

  useEffect(() => {
    if (categories.length > 0) {
      setRandomCategories(getRandomItems(categories, 5));
    }
  }, [categories]);

  const handleProductClick = useCallback(
    (id) => {
      if (!id) {
        setError("Invalid product selected");
        return;
      }
      navigate(`/product/${id}`);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e, id) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleProductClick(id);
      }
    },
    [handleProductClick]
  );

  const handleViewAll = () => {
    navigate("/products");
  };

  const handleCategoryClick = (category) => {
    if (!category) return;
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number" || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  // Carousel controls
  const handlePrevCarousel = () => {
    setCarouselIndex((prev) => (prev === 0 ? carouselMessages.length - 1 : prev - 1));
    setIsManuallyNavigated(true);
  };
  const handleNextCarousel = () => {
    setCarouselIndex((prev) => (prev === carouselMessages.length - 1 ? 0 : prev + 1));
    setIsManuallyNavigated(true);
  };

  return (
    <>
      {/* Carousel Section - full viewport width */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <div
          style={{
            width: "100%",
            minHeight: 340,
            height: "36vw",
            maxHeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(90deg, #f0c14b 0%, #fffbe6 100%)",
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
            maxWidth: "100%",
          }}
        >
          <button
            className="product-detail-thumbnail-arrow"
            style={{
              position: "absolute",
              left: 32,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 36,
              height: 36,
              fontSize: 20,
              minWidth: 36,
              minHeight: 36,
              maxWidth: 36,
              maxHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handlePrevCarousel}
            aria-label="Previous announcement"
          >
            <i className="lni lni-chevron-left" style={{ fontSize: 20 }}></i>
          </button>
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              textAlign: "center",
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#131921",
              letterSpacing: 1,
              lineHeight: 1.2,
              padding: "0 64px",
              userSelect: "none",
              boxSizing: "border-box",
              margin: 0,
              overflow: "hidden",
            }}
          >
            {carouselMessages[carouselIndex]}
          </div>
            <button
            className="product-detail-thumbnail-arrow"
            style={{
              position: "absolute",
              right: 32,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 36,
              height: 36,
              fontSize: 20,
              minWidth: 36,
              minHeight: 36,
              maxWidth: 36,
              maxHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handleNextCarousel}
            aria-label="Next announcement"
          >
            <i className="lni lni-chevron-right" style={{ fontSize: 20 }}></i>
            </button>
        </div>
      </div>
      {/* Main Home Content */}
      <div className="product-list-container" style={{ maxWidth: 1200, flexDirection: "column", alignItems: "center" }}>
        {error && (
          <div className="product-list-error" role="alert" tabIndex={0} aria-live="polite">
            <span className="product-list-error-icon" aria-hidden="true">⚠</span>
            {error}
            <button
            onClick={fetchProducts}
              className="product-list-retry-button"
              disabled={loading}
              aria-label="Retry loading products"
            >
              Retry
            </button>
          </div>
        )}

      {loading && (
          <div className="product-list-loading" role="status" aria-live="polite">
            <div className="product-list-loading-spinner" aria-hidden="true"></div>
          Loading recommendations...
          </div>
        )}

      {/* Category Section */}
      {!loading && !error && randomCategories.length > 0 && (
        <section style={{ width: "100%", marginTop: 0 }}>
          <h2 style={{ textAlign: "left", marginBottom: 24 }}>Categories</h2>
          <div
            className="product-list-product-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
            role="list"
            aria-label={`${randomCategories.length} categories`}
          >
            {randomCategories.map((category) => (
              <div
                key={category}
                className="product-list-product-card"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 30, fontWeight: 600, fontSize: "1.1rem" }}
                tabIndex={0}
                role="listitem"
                aria-label={`View products in ${category}`}
                onClick={() => handleCategoryClick(category)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleCategoryClick(category);
                }}
              >
                {category}
              </div>
            ))}
          </div>
        </section>
        )}

      {/* For You Section */}
      {!loading && !error && forYouProducts.length > 0 && (
        <section style={{ width: "100%", marginTop: 24 }}>
          <h2 style={{ textAlign: "left", marginBottom: 24 }}>For You</h2>
          <div
            className="product-list-product-grid"
            role="grid"
            aria-label={`${forYouProducts.length} personalized products`}
          >
            {forYouProducts.map((product) => (
              <article
                key={product._id}
                className={`product-list-product-card ${product.status_product === "out_of_stock" ? "out-of-stock" : ""}`}
                onClick={() => handleProductClick(product._id)}
                onKeyDown={(e) => handleKeyDown(e, product._id)}
                role="gridcell"
                tabIndex={0}
                aria-label={`View ${product.pro_name || "product"} details${product.status_product === "out_of_stock" ? ", currently out of stock" : ""}`}
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
                  <p
                    className="product-list-price"
                    aria-label={`Price: ${formatPrice(product.pro_price)}`}
                  >
                    {formatPrice(product.pro_price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations Section */}
      {!loading && !error && recommendedProducts.length > 0 && (
        <section style={{ width: "100%", marginTop: 24 }}>
          <h2 style={{ textAlign: "left", marginBottom: 24 }}>Recommendations</h2>
          <div
            className="product-list-product-grid"
            role="grid"
            aria-label={`${recommendedProducts.length} recommended products`}
          >
            {recommendedProducts.map((product) => (
              <article
                key={product._id}
                className={`product-list-product-card ${product.status_product === "out_of_stock" ? "out-of-stock" : ""}`}
                onClick={() => handleProductClick(product._id)}
                onKeyDown={(e) => handleKeyDown(e, product._id)}
                role="gridcell"
                tabIndex={0}
                aria-label={`View ${product.pro_name || "product"} details${product.status_product === "out_of_stock" ? ", currently out of stock" : ""}`}
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
                  <p
                    className="product-list-price"
                    aria-label={`Price: ${formatPrice(product.pro_price)}`}
                  >
                    {formatPrice(product.pro_price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <button
              className="product-detail-add-to-favorites"
              style={{ minWidth: 180, fontSize: "1rem" }}
              onClick={handleViewAll}
            >
              View All
            </button>
          </div>
        </section>
      )}
    </div>
    </>
  );
};

export default Home;