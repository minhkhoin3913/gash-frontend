import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import "../styles/ProductFavorite.css";

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
    return Promise.reject({ ...error, message });
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

const ProductFavorite = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Data fetching
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setError("Please log in to view your favorites");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const favoritesData = await fetchWithRetry("/favorites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!Array.isArray(favoritesData)) {
        setError("No favorite products found");
        setFavorites([]);
        return;
      }

      setFavorites(favoritesData);
    } catch (err) {
      setError(err.message || "Failed to fetch favorite products");
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Event handlers
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

  const handleDeleteFavorite = useCallback(async (favoriteId) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      await fetchWithRetry(`/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setFavorites(prev => prev.filter(fav => fav._id !== favoriteId));
      setToast({ type: 'success', message: "Product removed from favorites!" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const errorMessage = err.message || "Failed to remove from favorites";
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      setTimeout(() => setToast(null), 3000);
      console.error("Delete favorite error:", err);
    }
  }, [user, navigate]);

  const handleRetry = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Helper functions
  const formatPrice = useCallback((price) => {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    return `$${price.toFixed(2)}`;
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="product-favorite-container">
        <div className="product-favorite-loading">
          <div className="product-favorite-loading-spinner"></div>
          Loading favorite products...
        </div>
      </div>
    );
  }

  // Error state
  if (error && !favorites.length) {
    return (
      <div className="product-favorite-container">
        <div className="product-favorite-error">
          <span className="product-favorite-error-icon">⚠</span>
          {error}
          <button 
            onClick={handleRetry} 
            className="product-favorite-retry-button"
            aria-label="Retry loading favorites"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-favorite-container">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`product-favorite-toast ${toast.type === 'success' ? 'product-favorite-toast-success' : 'product-favorite-toast-error'}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <main className="product-favorite-main-content" role="main">
        <header className="product-favorite-results-header">
          <h1>Your Favorite Products</h1>
          <p>
            Browse your favorite products below. Click a product to view details or remove it from your favorites.
          </p>
          {favorites.length > 0 && !loading && (
            <p className="product-favorite-results-count">
              Showing {favorites.length} favorite product{favorites.length !== 1 ? 's' : ''}
            </p>
          )}
        </header>

        {error && (
          <div className="product-favorite-error" role="alert" aria-live="polite">
            <span className="product-favorite-error-icon">⚠</span>
            {error}
            <button 
              onClick={handleRetry} 
              className="product-favorite-retry-button"
              aria-label="Retry loading favorites"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && favorites.length === 0 && !error && (
          <div className="product-favorite-no-products" role="status">
            <p>No favorite products found.</p>
            <button 
              onClick={() => navigate("/products")}
              className="product-favorite-browse-products-button"
            >
              Browse Products
            </button>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div 
            className="product-favorite-product-grid" 
            role="grid" 
            aria-label={`${favorites.length} favorite products`}
          >
            {favorites.map((favorite) => (
              <article
                key={favorite._id}
                className="product-favorite-product-card"
                role="gridcell"
                aria-label={`View ${favorite.pro_id?.pro_name || 'product'} details`}
              >
                <div
                  className="product-favorite-clickable-area"
                  onClick={() => handleProductClick(favorite.pro_id?._id)}
                  onKeyDown={(e) => handleKeyDown(e, favorite.pro_id?._id)}
                  tabIndex={0}
                >
                  <div className="product-favorite-image-container">
                    <img
                      src={favorite.pro_id?.imageURL || '/placeholder-image.png'}
                      alt={favorite.pro_id?.pro_name || 'Product image'}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.png';
                        e.target.alt = 'Image not available';
                      }}
                    />
                  </div>
                  
                  <div className="product-favorite-content">
                    <h2 title={favorite.pro_id?.pro_name}>
                      {favorite.pro_id?.pro_name || 'Unnamed Product'}
                    </h2>
                    
                    <p className="product-favorite-price" aria-label={`Price: ${formatPrice(favorite.pro_id?.pro_price)}`}>
                      {formatPrice(favorite.pro_id?.pro_price)}
                    </p>
                  </div>
                </div>
                
                <button
                  className="product-favorite-delete-button"
                  onClick={() => handleDeleteFavorite(favorite._id)}
                  aria-label={`Remove ${favorite.pro_id?.pro_name || 'product'} from favorites`}
                >
                  Remove from Favorites
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductFavorite;