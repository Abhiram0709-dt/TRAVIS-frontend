// Configuration settings for the application
const config = {
  // API base URL
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  
  // Environment
  ENV: process.env.REACT_APP_ENV || 'development',
  
  // Is this a production environment?
  IS_PRODUCTION: (process.env.REACT_APP_ENV || 'development') === 'production',
  
  // Is this a development environment?
  IS_DEVELOPMENT: (process.env.REACT_APP_ENV || 'development') === 'development',
  
  // Default volume for audio
  DEFAULT_VOLUME: 0.8,
  
  // Default state for auto voice output
  DEFAULT_AUTO_VOICE_OUTPUT: true,
  
  // Toast notification durations
  TOAST_DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000
  }
};

export default config; 