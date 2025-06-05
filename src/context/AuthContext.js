import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Simple session expiration handler
  const handleSessionExpired = () => {
    alert('Your session has expired. You will be logged out.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    setUser(null);
    navigate('/login');
  };

  // Check session on app load and set up timer
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');

    if (token && storedUser && loginTime) {
      const currentTime = Date.now();
      const sessionDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      const timeElapsed = currentTime - parseInt(loginTime);

      if (timeElapsed >= sessionDuration) {
        // Session already expired
        handleSessionExpired();
      } else {
        // Session still valid, set user and create timer for remaining time
        setUser(JSON.parse(storedUser));
        const remainingTime = sessionDuration - timeElapsed;
        
        setTimeout(() => {
          handleSessionExpired();
        }, remainingTime);
      }
    }
  }, []);

  // Add axios interceptor for 401 responses
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleSessionExpired();
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/login', {
        username,
        password,
      });

      const { token, account } = response.data;
      const loginTime = Date.now().toString();

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(account));
      localStorage.setItem('loginTime', loginTime);
      
      setUser(account);

      // Set 1-hour timer for auto logout
      setTimeout(() => {
        handleSessionExpired();
      }, 60 * 60 * 1000); // 1 hour

      navigate('/');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/register', userData);
      const { token, account } = response.data;
      const loginTime = Date.now().toString();

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(account));
      localStorage.setItem('loginTime', loginTime);
      
      setUser(account);

      // Set 1-hour timer for auto logout
      setTimeout(() => {
        handleSessionExpired();
      }, 60 * 60 * 1000); // 1 hour

      navigate('/');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
