// Configuration for Python Backend Service
export const PYTHON_BACKEND_CONFIG = {
  // Local development URL - Use network IP for device/simulator access
  local: 'http://192.168.0.107:5000',

  // Localhost for web development
  localhost: 'http://localhost:5000',

  // Production URL (update this when deploying)
  production: 'https://your-backend-url.com',

  // Current environment - Use network IP for better device compatibility
  current: __DEV__
    ? 'http://192.168.0.107:5000'
    : 'https://your-backend-url.com',

  // Timeout settings
  timeout: 30000, // 30 seconds

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
};

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  interval: 30000, // Check every 30 seconds
  timeout: 5000, // 5 second timeout for health checks
};

export default PYTHON_BACKEND_CONFIG;
