import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    otp: location.state?.otp || '',
    newPassword: '',
    repeatPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const passwordRef = useRef(null);

  useEffect(() => {
    if (!location.state?.email || !location.state?.otp) {
      navigate('/forgot-password');
    }
    passwordRef.current?.focus();
  }, [location.state, navigate]);

  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  }, []);

  const validateForm = useCallback(() => {
    const { newPassword, repeatPassword } = formData;
    if (newPassword.length < 8) return 'Password must be at least 8 characters long';
    if (newPassword !== repeatPassword) return 'Passwords do not match';
    return '';
  }, [formData]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        passwordRef.current?.focus();
        return;
      }
      setError('');
      setIsLoading(true);
      try {
        await resetPassword({
          email: formData.email,
          newPassword: formData.newPassword,
        });
        setSuccess('Password reset successfully. You can now log in.');
        setTimeout(() => navigate('/login'), 2000);
      } catch (err) {
        let errorMessage = 'Failed to reset password. Please try again.';
        if (err.response?.status === 400) {
          errorMessage = err.response.data.message || 'Invalid input data';
        } else if (err.response?.status === 404) {
          errorMessage = err.response.data.message || 'No account found with this email';
        } else if (err.response?.data?.errors) {
          errorMessage = err.response.data.errors[0]?.msg || errorMessage;
        }
        setError(errorMessage);
        passwordRef.current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [formData, resetPassword, navigate, validateForm]
  );

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h1 className="reset-password-title">Reset Your Password</h1>
        <p className="reset-password-info">Enter a new password for {formData.email}</p>
        {error && (
          <div className="reset-password-error" id="error-message" role="alert">
            <span className="reset-password-error-icon" aria-hidden="true">⚠</span>
            {error}
          </div>
        )}
        {success && (
          <div className="reset-password-success" id="success-message" role="alert">
            <span className="reset-password-success-icon" aria-hidden="true">✓</span>
            {success}
          </div>
        )}
        <form
          className="reset-password-form"
          onSubmit={handleSubmit}
          aria-describedby={error ? 'error-message' : success ? 'success-message' : undefined}
        >
          {[
            { id: 'newPassword', label: 'New Password', type: 'password', required: true },
            { id: 'repeatPassword', label: 'Repeat Password', type: 'password', required: true },
          ].map(({ id, label, type, required }) => (
            <div className="reset-password-form-group" key={id}>
              <label htmlFor={id} className="reset-password-form-label">{label}</label>
              <input
                id={id}
                type={type}
                name={id}
                value={formData[id]}
                onChange={handleChange}
                ref={id === 'newPassword' ? passwordRef : null}
                required={required}
                className="reset-password-form-input"
                aria-required={required}
                aria-invalid={!!error}
              />
            </div>
          ))}
          <button
            type="submit"
            className="reset-password-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="reset-password-loading-spinner" aria-hidden="true" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
        <p className="reset-password-login-prompt">
          Remember your password?{' '}
          <Link to="/login" className="reset-password-login-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;