import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import emailjs from '@emailjs/browser';
import '../styles/Signup.css';

// Initialize EmailJS with Public API Key
if (!process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
  console.error('EmailJS Public Key is missing. Please check .env file.');
} else {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
  console.log('EmailJS initialized with Public Key:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
}

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { requestSignupOTP } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const handleChange = useCallback((e) => {
    setEmail(e.target.value);
    setError('');
  }, []);

  const validateEmail = useCallback(() => {
    if (!email.trim()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address';
    return '';
  }, [email]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationError = validateEmail();
      if (validationError) {
        setError(validationError);
        emailRef.current?.focus();
        return;
      }

      setIsLoading(true);
      try {
        const response = await requestSignupOTP(email, 'forgot-password');
        const { otp } = response.data;

        const templateParams = {
          to_email: email.trim(),
          otp: otp,
        };

        if (!templateParams.to_email) {
          throw new Error('Recipient email is empty');
        }
        if (!templateParams.otp) {
          throw new Error('OTP is missing');
        }

        const emailjsResponse = await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID,
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
          templateParams
        );
        console.log('EmailJS Success:', emailjsResponse);

        navigate('/otp-verification', {
          state: { email, type: 'forgot-password' },
        });
      } catch (err) {
        console.error('Error:', err.status, err.text || err.message);
        if (err.status === 422) {
          setError('Failed to send OTP: Invalid email configuration. Please check your email and try again.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError(err.message || 'Failed to send OTP. Please try again.');
        }
        emailRef.current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [email, requestSignupOTP, navigate, validateEmail]
  );

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h1 className="signup-title">Reset Your Password</h1>
        <p className="signup-info">Enter your email address to receive a password reset OTP.</p>
        {error && (
          <div className="signup-error" id="error-message" role="alert" tabIndex={0}>
            <span className="signup-error-icon" aria-hidden="true">⚠️</span>
            {error}{' '}
            <button
              type="button"
              className="signup-resend-link"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              Try again
            </button>
          </div>
        )}
        <form
          className="signup-form"
          onSubmit={handleSubmit}
          aria-describedby={error ? 'error-message' : undefined}
          aria-label="Forgot Password form"
        >
          <div className="signup-form-group">
            <label htmlFor="email" className="signup-form-label">
              Email <span className="signup-required-indicator">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              ref={emailRef}
              required
              className="signup-form-input"
              aria-required="true"
              aria-invalid={!!error}
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            className="signup-continue-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            <span aria-live="polite">
              {isLoading ? (
                <>
                  <span className="signup-loading-spinner" aria-hidden="true" />
                  Sending OTP...
                </>
              ) : (
                'Continue'
              )}
            </span>
          </button>
        </form>
        <p className="signup-login-prompt">
          Remember your password?{' '}
          <Link to="/login" className="signup-login-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;