import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Signup.css';

const Register = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: location.state?.formData?.username || '',
    name: location.state?.formData?.name || '',
    email: location.state?.email || '',
    phone: location.state?.formData?.phone || '',
    address: location.state?.formData?.address || '',
    password: location.state?.formData?.password || '',
    repeatPassword: location.state?.formData?.repeatPassword || '',
    image: location.state?.formData?.image || '',
    role: 'user',
    acc_status: 'active',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    if (!location.state?.email) {
      navigate('/signup');
    }
    usernameRef.current?.focus();
  }, [location.state, navigate]);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  }, []);

  const validateForm = useCallback(() => {
    const { username, name, email, phone, address, password, repeatPassword, image } = formData;
    if (username.length < 3 || username.length > 30) return 'Username must be between 3 and 30 characters';
    if (name.length > 50) return 'Name cannot exceed 50 characters';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address';
    if (!/^\d{10}$/.test(phone)) return 'Phone number must be exactly 10 digits';
    if (address.length > 100) return 'Address cannot exceed 100 characters';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (password !== repeatPassword) return 'Passwords do not match';
    if (image && !/^(http|https):\/\/[^ "]+$/.test(image)) return 'Image must be a valid URL';
    return '';
  }, [formData]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        usernameRef.current?.focus();
        return;
      }
      setError('');
      setIsLoading(true);
      try {
        await signup(formData);
        navigate('/');
      } catch (err) {
        let errorMessage = 'Failed to create account. Please try again.';
        if (err.response?.status === 400) {
          errorMessage = err.response.data.message || 'Invalid input data';
        } else if (err.response?.status === 409) {
          errorMessage = 'Username or email already exists';
        } else if (err.response?.data?.errors) {
          errorMessage = err.response.data.errors[0]?.msg || errorMessage;
        }
        setError(errorMessage);
        usernameRef.current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [formData, signup, navigate, validateForm]
  );

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h1 className="signup-title">Complete Your Registration</h1>
        {error && (
          <div className="signup-error" id="error-message" role="alert">
            <span className="signup-error-icon" aria-hidden="true">⚠</span>
            {error}
          </div>
        )}
        <form className="signup-form" onSubmit={handleSubmit} aria-describedby={error ? 'error-message' : undefined}>
          {[
            { id: 'username', label: 'Username', type: 'text', required: true, maxLength: 30 },
            { id: 'name', label: 'Full Name', type: 'text', required: true, maxLength: 50 },
            { id: 'email', label: 'Email', type: 'email', required: true, readOnly: true },
            { id: 'phone', label: 'Phone', type: 'text', required: true, maxLength: 10 },
            { id: 'address', label: 'Address', type: 'text', required: true, maxLength: 100 },
            { id: 'password', label: 'Password', type: 'password', required: true },
            { id: 'repeatPassword', label: 'Repeat Password', type: 'password', required: true },
            { id: 'image', label: 'Profile Image URL (Optional)', type: 'text', required: false },
          ].map(({ id, label, type, required, maxLength, readOnly }) => (
            <div className="signup-form-group" key={id}>
              <label htmlFor={id} className="signup-form-label">{label}</label>
              <input
                id={id}
                type={type}
                name={id}
                value={formData[id]}
                onChange={handleChange}
                ref={id === 'username' ? usernameRef : null}
                required={required}
                maxLength={maxLength}
                readOnly={readOnly}
                className="signup-form-input"
                aria-required={required}
                aria-invalid={!!error}
              />
            </div>
          ))}
          <button
            type="submit"
            className="create-account-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              // Removed spinner, only show text
              'Creating Account...'
            ) : (
              'Create your GASH account'
            )}
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

export default Register;