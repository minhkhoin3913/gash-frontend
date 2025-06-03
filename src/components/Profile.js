import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import '../styles/Profile.css';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    image: '',
    password: '',
    repeatPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch profile with retry
  const fetchProfile = useCallback(async (retries = 3, delay = 1000) => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/accounts/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(response.data);
      setFormData({
        username: response.data.username,
        name: response.data.name || '',
        email: response.data.email,
        phone: response.data.phone || '',
        address: response.data.address || '',
        image: response.data.image || '',
        password: '',
        repeatPassword: '',
      });
      setApiError('');
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfile(retries - 1, delay * 2);
      }
      setApiError(err.response?.status === 404 ? 'Profile not found' : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Validate form against Accounts schema
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.username || formData.username.length < 3 || formData.username.length > 30) {
      newErrors.username = 'Username must be 3-30 characters';
    }
    if (!formData.name || formData.name.length > 50) {
      newErrors.name = 'Name is required and cannot exceed 50 characters';
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }
    if (!formData.address || formData.address.length > 100) {
      newErrors.address = 'Address is required and cannot exceed 100 characters';
    }
    if (formData.image && !/^(http|https):\/\/[^ "]+$/.test(formData.image)) {
      newErrors.image = 'Image must be a valid URL';
    }
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password && formData.password !== formData.repeatPassword) {
      newErrors.repeatPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Update profile
  const updateProfile = useCallback(async () => {
    setLoading(true);
    try {
      const updateData = {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        image: formData.image,
        ...(formData.password && { password: formData.password }),
      };
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/accounts/${user._id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(response.data.account);
      setEditMode(false);
      setApiError('');
    } catch (err) {
      const errorMessage = err.response?.status === 409
        ? 'Username or email already exists'
        : err.response?.data?.errors?.[0]?.msg || 'Failed to update profile';
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, user]);

  // Delete account
  const deleteAccount = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/accounts/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
      navigate('/login');
    } catch (err) {
      setApiError(err.response?.status === 401 ? 'Unauthorized' : 'Failed to delete account');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [user, logout, navigate]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const handleEdit = useCallback(() => {
    setEditMode(true);
    setApiError('');
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      updateProfile();
    }
  }, [validateForm, updateProfile]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
    setFormData({
      username: profile?.username || '',
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      image: profile?.image || '',
      password: '',
      repeatPassword: '',
    });
    setErrors({});
    setApiError('');
  }, [profile]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    deleteAccount();
  }, [deleteAccount]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
    setApiError('');
  }, []);

  if (!user) {
    return <div className="profile-container">Please sign in to view your profile.</div>;
  }

  return (
    <div className="profile-container">
      {loading ? (
        <div className="loading" role="status">Loading...</div>
      ) : apiError ? (
        <div className="error" role="alert">{apiError}</div>
      ) : profile ? (
        <div className="profile-box">
          <h1>Your Profile</h1>
          {editMode ? (
            <form onSubmit={handleSubmit} aria-describedby={apiError ? 'error-message' : undefined}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                maxLength={30}
                aria-required="true"
              />
              {errors.username && <div className="field-error">{errors.username}</div>}
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
              {errors.name && <div className="field-error">{errors.name}</div>}
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
              {errors.email && <div className="field-error">{errors.email}</div>}
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
              {errors.phone && <div className="field-error">{errors.phone}</div>}
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
              {errors.address && <div className="field-error">{errors.address}</div>}
              <label htmlFor="image">Profile Image URL (Optional)</label>
              <input
                id="image"
                type="text"
                name="image"
                value={formData.image}
                onChange={handleChange}
              />
              {errors.image && <div className="field-error">{errors.image}</div>}
              <label htmlFor="password">Password (leave blank to keep current)</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <div className="field-error">{errors.password}</div>}
              <label htmlFor="repeatPassword">Repeat Password</label>
              <input
                id="repeatPassword"
                type="password"
                name="repeatPassword"
                value={formData.repeatPassword}
                onChange={handleChange}
              />
              {errors.repeatPassword && <div className="field-error">{errors.repeatPassword}</div>}
              <div className="form-actions">
                <button
                  type="submit"
                  className="update-button"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <img src={profile.image} alt={profile.username} className="profile-image" />
              <p><strong>Username:</strong> {profile.username}</p>
              <p><strong>Full Name:</strong> {profile.name || 'N/A'}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>
              <p><strong>Address:</strong> {profile.address || 'N/A'}</p>
              <div className="profile-actions">
                <button
                  className="edit-button"
                  onClick={handleEdit}
                  aria-label="Edit profile"
                >
                  Edit Profile
                </button>
                <button
                  className="delete-button"
                  onClick={handleDeleteClick}
                  aria-label="Close account"
                >
                  Close Account
                </button>
              </div>
            </div>
          )}
          {showDeleteConfirm && (
            <div className="confirmation-dialog" role="dialog" aria-labelledby="confirm-title">
              <div className="dialog-content">
                <h2 id="confirm-title">Confirm Account Deletion</h2>
                <p>Are you sure you want to permanently delete your GASH account? This action cannot be undone.</p>
                <div className="dialog-actions">
                  <button
                    className="confirm-button"
                    onClick={handleDeleteConfirm}
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={handleDeleteCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="no-profile" role="alert">Profile not found</p>
      )}
    </div>
  );
};

export default Profile;