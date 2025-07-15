import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Home.css";
import {
  API_RETRY_COUNT,
  API_RETRY_DELAY,
} from "../constants/constants";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

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

const carouselSlides = [
  {
    image: "/gash-logo.svg",
    title: "Welcome to GASH!",
    subtitle: "Discover the latest trends and best deals."
  },
  {
    image: "/shirt-1.webp",
    title: "New Arrivals",
    subtitle: "Check out our newest products and styles."
  },
  {
    image: "/trouser-1.webp",
    title: "Seasonal Sale",
    subtitle: "Save big on selected items this season!"
  }
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const navigate = useNavigate();
  const slideCount = carouselSlides.length;

  // Carousel auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % slideCount);
    }, 4000);
    return () => clearInterval(interval);
  }, [slideCount]);

  // Manual carousel controls
  const goToPrevSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);
  const goToNextSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  // Fetch products (show only first 6)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productsData = await fetchWithRetry("/products");
      setProducts(Array.isArray(productsData) ? productsData.slice(0, 6) : []);
    } catch (err) {
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Recommendation logic ---
  const getRecommendationProducts = () => {
    if (!Array.isArray(products) || products.length === 0) return [];
    // If there are 5 or fewer products, just return all
    if (products.length <= 5) return products;
    // Otherwise, pick 5 random unique products
    const indices = new Set();
    while (indices.size < 5) {
      indices.add(Math.floor(Math.random() * products.length));
    }
    return Array.from(indices).map(idx => products[idx]);
  };
  const recommendationProducts = getRecommendationProducts();

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const data = await fetchWithRetry("/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setCatError(err.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleProductClick = (id) => {
    if (!id) return;
    navigate(`/product/${id}`);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number" || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="home-container">
      <section className="home-carousel-viewport" aria-label="Featured banners">
        <div className="home-carousel">
          {carouselSlides.map((slide, idx) => (
            <div
              key={slide.title}
              className={`home-carousel-slide${carouselIndex === idx ? " active" : ""}`}
              aria-hidden={carouselIndex !== idx}
              style={{ display: carouselIndex === idx ? "flex" : "none" }}
            >
              <img src={slide.image} alt={slide.title} className="home-carousel-image" />
              <div className="home-carousel-caption">
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ))}
          <button
            className="home-carousel-control home-carousel-control-left"
            aria-label="Previous slide"
            onClick={goToPrevSlide}
          >
            <i className="lni lni-chevron-left"></i>
          </button>
          <button
            className="home-carousel-control home-carousel-control-right"
            aria-label="Next slide"
            onClick={goToNextSlide}
          >
            <i className="lni lni-chevron-right"></i>
          </button>
          <div className="home-carousel-indicators">
            {carouselSlides.map((_, idx) => (
              <button
                key={idx}
                className={carouselIndex === idx ? "active" : ""}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setCarouselIndex(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Categories section */}
      <section className="home-category-row" aria-label="Browse by Categories">
        <header className="home-category-row-header">
          <h1>Browse by Categories</h1>
        </header>
        {catError && (
          <div className="home-category-error" role="alert">{catError}</div>
        )}
        {catLoading ? (
          <div className="home-category-loading">Loading categories...</div>
        ) : (
          <div className="home-category-list-scroll">
            {categories.map((cat) => (
              <article
                key={cat._id || cat.cat_name}
                className="home-category-card"
                onClick={() => navigate(`/product?category=${encodeURIComponent(cat.cat_name)}`)}
                tabIndex={0}
                role="button"
                aria-label={`Browse ${cat.cat_name}`}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") navigate(`/product?category=${encodeURIComponent(cat.cat_name)}`); }}
              >
                <div className="home-category-name">{cat.cat_name}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products section */}
      <section className="home-product-row" aria-label="Featured products">
        <header className="home-product-row-header">
          <h1>Featured Products</h1>
          <button className="home-view-all-btn" onClick={() => navigate("/product")}>View All</button>
        </header>
        {error && (
          <div className="home-product-error" role="alert">{error}</div>
        )}
        {loading ? (
          <div className="home-product-loading">Loading products...</div>
        ) : (
          <div className="home-product-list-scroll">
            {products.map((product) => (
              <article
                key={product._id}
                className={`home-product-card${product.status_product === "out_of_stock" ? " out-of-stock" : ""}`}
                onClick={() => handleProductClick(product._id)}
                tabIndex={0}
                role="button"
                aria-label={`View ${product.pro_name || "product"} details${product.status_product === "out_of_stock" ? ", currently out of stock" : ""}`}
              >
                <img
                  src={product.imageURL || "/placeholder-image.png"}
                  alt={product.pro_name || "Product image"}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    e.target.alt = `Image not available for ${product.pro_name || "product"}`;
                  }}
                  className="home-product-image"
                />
                <div className="home-product-info">
                  <h2>{product.pro_name || "Unnamed Product"}</h2>
                  <p className="home-product-price">{formatPrice(product.pro_price)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Recommendation section */}
      <section className="home-product-row" aria-label="Recommended products">
        <header className="home-product-row-header">
          <h1>Recommendation</h1>
        </header>
        {error && (
          <div className="home-product-error" role="alert">{error}</div>
        )}
        {loading ? (
          <div className="home-product-loading">Loading recommendations...</div>
        ) : (
          <div className="home-product-list-scroll">
            {recommendationProducts.map((product) => (
              <article
                key={product._id + "-rec"}
                className={`home-product-card${product.status_product === "out_of_stock" ? " out-of-stock" : ""}`}
                onClick={() => handleProductClick(product._id)}
                tabIndex={0}
                role="button"
                aria-label={`View ${product.pro_name || "product"} details${product.status_product === "out_of_stock" ? ", currently out of stock" : ""}`}
              >
                <img
                  src={product.imageURL || "/placeholder-image.png"}
                  alt={product.pro_name || "Product image"}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    e.target.alt = `Image not available for ${product.pro_name || "product"}`;
                  }}
                  className="home-product-image"
                />
                <div className="home-product-info">
                  <h2>{product.pro_name || "Unnamed Product"}</h2>
                  <p className="home-product-price">{formatPrice(product.pro_price)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home; 