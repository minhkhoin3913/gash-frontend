import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.status === 401
        ? 'Invalid username or password'
        : 'Failed to sign in. Please try again.';
      setError(errorMessage);
      usernameRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Sign In</h1>
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            ref={usernameRef}
            required
            autoFocus
            aria-required="true"
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
          />
          <button
            type="submit"
            className="sign-in-button"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p>
          New to GASH?{' '}
          <Link to="/signup" className="signup-link">
            Create your GASH account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;