import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { LOGIN_ERROR_MESSAGES, ERROR_TIMEOUT } from "../constants/constants";
import "../styles/Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, googleLogin } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const errorRef = useRef(null);
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
      const timeout = setTimeout(() => setError(""), ERROR_TIMEOUT);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const from = location.state?.from || "/";

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const { username, password } = formData;
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedPassword) {
        setError(LOGIN_ERROR_MESSAGES.EMPTY_FIELDS);
        usernameRef.current?.focus();
        return;
      }

      setIsLoading(true);
      try {
        await login(trimmedUsername, trimmedPassword);
        navigate(from, { replace: true });
      } catch (err) {
        const errorMessage =
          err.response?.status === 401
            ? LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS
            : LOGIN_ERROR_MESSAGES.LOGIN_FAILED;
        setError(errorMessage);
        usernameRef.current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [formData, login, navigate, from]
  );

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      if (!credentialResponse.credential) {
        setError(LOGIN_ERROR_MESSAGES.GOOGLE_FAILED);
        return;
      }

      setIsLoading(true);
      try {
        await googleLogin(credentialResponse.credential);
        navigate(from, { replace: true });
      } catch (err) {
        setError(LOGIN_ERROR_MESSAGES.GOOGLE_FAILED);
      } finally {
        setIsLoading(false);
      }
    },
    [googleLogin, navigate, from]
  );

  const handleGoogleError = useCallback(() => {
    setError(LOGIN_ERROR_MESSAGES.GOOGLE_FAILED);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  }, []);

  return (
    <div className="login-container">
      {/* Toast error notification */}
      {error && (
        <div
          className="login-toast login-toast-error"
          role="alert"
          tabIndex={0}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, minWidth: 220, maxWidth: 350 }}
        >
          <span className="login-error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}
      <div className="login-box">
        <h1 className="login-title">Sign In</h1>
        <form
          className="login-form"
          onSubmit={handleSubmit}
          role="form"
          aria-label="Sign in form"
          aria-describedby={error ? "error-message" : undefined}
        >
          <div className="login-form-group">
            <label htmlFor="username" className="login-form-label">
              Username <span className="login-required-indicator">*</span>
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              ref={usernameRef}
              required
              className="login-form-input"
              aria-required="true"
              aria-invalid={!!error}
            />
          </div>
          <div className="login-form-group">
            <label htmlFor="password" className="login-form-label">
              Password <span className="login-required-indicator">*</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="login-form-input"
              aria-required="true"
              aria-invalid={!!error}
            />
          </div>
          <div className="login-forgot-password">
            <Link to="/forgot-password" className="login-forgot-password-link">
              Forgot Password?
            </Link>
          </div>
          <button
            type="submit"
            className="sign-in-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            <span aria-live="polite">
              {isLoading ? (
                // Removed spinner, only show text
                "Signing In..."
              ) : (
                "Sign In"
              )}
            </span>
          </button>
        </form>
        <div className="google-login-container">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
            size="large"
            width="100%"
            aria-label="Sign in with Google"
          />
        </div>
        <p className="login-signup-prompt">
          New to GASH?{" "}
          <Link to="/signup" className="login-signup-link">
            Create your GASH account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;