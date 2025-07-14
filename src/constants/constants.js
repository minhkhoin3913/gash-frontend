export const DROPDOWN_CLOSE_DELAY = 50;
export const SEARCH_DEBOUNCE_DELAY = 300;
export const ERROR_TIMEOUT = 5000;
export const FILTER_STORAGE_KEY = "productListFilters";
export const DETAIL_STORAGE_KEY = "productDetailState";
export const DEFAULT_FILTERS = {
  category: "All Categories",
  color: "All Colors",
  size: "All Sizes"
};
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY = 1000;
export const TOAST_TIMEOUT = 3000;
export const LOGIN_ERROR_MESSAGES = {
  EMPTY_FIELDS: 'Please fill in all required fields.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  LOGIN_FAILED: 'Login failed. Please try again.',
  GOOGLE_FAILED: 'Google login failed. Please try again.',
  PASSKEY_NOT_SUPPORTED: 'Passkeys are not supported in this browser.',
  PASSKEY_REGISTRATION_FAILED: 'Passkey registration failed. Please try again.',
  PASSKEY_AUTH_FAILED: 'Passkey authentication failed. Please try another method.',
};

export const PASSKEY_ERRORS = {
  REGISTER_FAILED: 'Failed to register passkey. Please try again.',
  AUTH_FAILED: 'Passkey authentication failed. Please try another method.',
  REMOVE_FAILED: 'Failed to delete passkey. Please try again.',
};