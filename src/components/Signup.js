import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
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
  const { signup } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Client-side validation based on Accounts schema
    if (formData.username.length < 3 || formData.username.length > 30) {
      setError('Username must be between 3 and 30 characters');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (formData.name.length > 50) {
      setError('Name cannot exceed 50 characters');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (formData.address.length > 100) {
      setError('Address cannot exceed 100 characters');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (formData.password !== formData.repeatPassword) {
      setError('Passwords do not match');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }
    if (formData.image && !/^(http|https):\/\/[^ "]+$/.test(formData.image)) {
      setError('Image must be a valid URL');
      usernameRef.current?.focus();
      setIsLoading(false);
      return;
    }

    try {
      await signup(formData);
      navigate('/login');
    } catch (err) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (err.response?.status === 409) {
        errorMessage = 'Username or email already exists';
      } else if (err.response?.data?.errors) {
        const firstError = err.response.data.errors[0]?.msg;
        if (firstError) errorMessage = firstError;
      }
      setError(errorMessage);
      usernameRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h1>Create Account</h1>
        {error && (
          <div className="error" id="error-message" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} aria-describedby={error ? 'error-message' : undefined}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            ref={usernameRef}
            required
            maxLength={30}
            autoFocus
            aria-required="true"
          />
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={50}
            aria-required="true"
          />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-required="true"
          />
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            maxLength={10}
            aria-required="true"
          />
          <label htmlFor="address">Address</label>
          <input
            id="address"
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            maxLength={100}
            aria-required="true"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            aria-required="true"
          />
          <label htmlFor="repeatPassword">Repeat Password</label>
          <input
            id="repeatPassword"
            type="password"
            name="repeatPassword"
            value={formData.repeatPassword}
            onChange={handleChange}
            required
            aria-required="true"
          />
          <label htmlFor="image">Profile Image URL (Optional)</label>
          <input
            id="image"
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="create-account-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create your GASH account'}
          </button>
        </form>
        <p className="login-prompt">
          Already have an account?{' '}
          <Link to="/login" className="login-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;