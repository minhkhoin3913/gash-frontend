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

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    name: '',
    phone: '',
    address: '',
    password: '',
    repeatPassword: '',
    image: '',
    role: 'user',
    acc_status: 'active',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { requestSignupOTP } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const emailRef = useRef(null);

  // Focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    console.log('Input Change:', { name, value });
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  }, []);

  // Validate email
  const validateEmail = useCallback(() => {
    const { email } = formData;
    if (!email.trim()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address';
    return '';
  }, [formData]);

  // Handle form submission
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
        // Log EmailJS configuration
        console.log('Public Key:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
        console.log('Service ID:', process.env.REACT_APP_EMAILJS_SERVICE_ID);
        console.log('Template ID:', process.env.REACT_APP_EMAILJS_TEMPLATE_ID);
        console.log('formData.email:', formData.email);

        // Request OTP from backend
        const response = await requestSignupOTP(formData.email);
        const { otp } = response.data;
        console.log('Backend OTP Response:', response.data);

        // Validate and prepare template parameters
        const templateParams = {
          to_email: formData.email.trim(),
          otp: otp,
        };
        console.log('Template Params:', templateParams);

        if (!templateParams.to_email) {
          throw new Error('Recipient email is empty');
        }
        if (!templateParams.otp) {
          throw new Error('OTP is missing');
        }

        // Send OTP email via EmailJS
        const emailjsResponse = await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID,
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
          templateParams
        );
        console.log('EmailJS Success:', emailjsResponse);

        // Navigate to OTP verification
        navigate('/otp-verification', {
          state: { email: formData.email, type: 'register', formData },
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
    [formData, requestSignupOTP, navigate, validateEmail]
  );

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h1 className="signup-title">Create Account</h1>
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
          aria-label="Signup form"
        >
          <div className="signup-form-group">
            <label htmlFor="email" className="signup-form-label">
              Email <span className="signup-required-indicator">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
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
          Already have an account?{' '}
          <Link to="/login" className="signup-login-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;