import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import emailjs from '@emailjs/browser';
import '../styles/OTPVerification.css';

// Initialize EmailJS with Public API Key
if (!process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
  console.error('EmailJS Public Key is missing. Please check .env file.');
} else {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
  console.log('EmailJS initialized with Public Key:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
}

const OTPVerification = () => {
  const [otp, setOTP] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { verifyOTP } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const otpRef = useRef(null);

  const { email, type, formData } = location.state || {};

  useEffect(() => {
    if (!email || !type) {
      navigate(type === 'forgot-password' ? '/forgot-password' : '/signup');
    }
    otpRef.current?.focus();
  }, [email, type, navigate]);

  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        setError('Please enter a valid 6-digit OTP');
        setSuccess('');
        otpRef.current?.focus();
        return;
      }

      setIsLoading(true);
      try {
        if (type === 'register') {
          await verifyOTP(email, otp, formData, 'register');
          navigate('/register', { state: { email, formData } });
        } else if (type === 'forgot-password') {
          await verifyOTP(email, otp, null, 'forgot-password');
          navigate('/reset-password', { state: { email, otp } });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired OTP');
        setSuccess('');
        otpRef.current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [otp, email, type, formData, verifyOTP, navigate]
  );

  const handleInputChange = useCallback((e) => {
    setOTP(e.target.value);
    setError('');
    setSuccess('');
  }, []);

  const handleResendOTP = useCallback(
    async () => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await verifyOTP(email, null, formData, type, true);
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
        console.log('EmailJS Success (Resend):', emailjsResponse);

        setSuccess(
          type === 'forgot-password'
            ? 'A new OTP for password reset has been sent to your email.'
            : 'A new OTP has been sent to your email.'
        );
        setOTP('');
        otpRef.current?.focus();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to resend OTP');
        console.error('Error resending OTP:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [email, formData, type, verifyOTP]
  );

  return (
    <div className="otp-container">
      <div className="otp-box">
        <h1 className="otp-title">Verify OTP</h1>
        <p className="otp-info">
          Enter the 6-digit OTP sent to {email} to{' '}
          {type === 'forgot-password' ? 'reset your password' : 'verify your email'}.
        </p>
        {error && (
          <div className="otp-error" id="error-message" role="alert" tabIndex={0}>
            <span className="otp-error-icon" aria-hidden="true">⚠</span>
            {error}
          </div>
        )}
        {success && (
          <div className="otp-success" id="success-message" role="alert" tabIndex={0}>
            <span className="otp-success-icon" aria-hidden="true">✓</span>
            {success}
          </div>
        )}
        <form
          className="otp-form"
          onSubmit={handleSubmit}
          aria-describedby={error ? 'error-message' : success ? 'success-message' : undefined}
        >
          <div className="otp-form-group">
            <label htmlFor="otp" className="otp-form-label">
              OTP <span className="otp-required-indicator">*</span>
            </label>
            <input
              id="otp"
              type="text"
              name="otp"
              value={otp}
              onChange={handleInputChange}
              ref={otpRef}
              required
              maxLength={6}
              className="otp-form-input"
              aria-required="true"
              aria-invalid={!!error}
            />
          </div>
          <button
            type="submit"
            className="otp-verify-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="otp-loading-spinner" aria-hidden="true" />
                Verifying...
              </>
            ) : (
              'Verify OTP'
            )}
          </button>
        </form>
        <p className="otp-resend-prompt">
          Didn't receive an OTP?{' '}
          <button
            type="button"
            className="otp-resend-link"
            onClick={handleResendOTP}
            disabled={isLoading}
          >
            Resend OTP
          </button>
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;