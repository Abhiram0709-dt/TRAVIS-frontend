import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faInfoCircle, 
  faCheckCircle, 
  faExclamationTriangle, 
  faTimesCircle,
  faSun,
  faMoon,
  faPalette,
  faBell,
  faLock,
  faUnlock,
  faUser,
  faSignInAlt,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const ContextDemo = () => {
  // TOAST DEMO
  const { addToast } = useToast();
  const [toastTitle, setToastTitle] = useState('Toast Notification');
  const [toastMessage, setToastMessage] = useState('This is a sample toast message');
  const [toastType, setToastType] = useState('info');
  const [toastDuration, setToastDuration] = useState(5000);

  // THEME DEMO
  const { theme, toggleTheme, isHighContrast } = useTheme();
  
  // AUTH DEMO
  const { isAuthenticated, user, loading, login, logout, devLogin } = useAuth();
  const [loginCredentials, setLoginCredentials] = useState({
    username: 'demo@example.com',
    password: 'password123'
  });

  // Toast Demo Functions
  const showToast = () => {
    addToast({
      title: toastTitle,
      message: toastMessage,
      type: toastType,
      duration: parseInt(toastDuration)
    });
  };

  const showAllTypes = () => {
    const types = ['info', 'success', 'warning', 'error'];
    
    types.forEach((type, index) => {
      setTimeout(() => {
        addToast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Toast`,
          message: `This is a sample ${type} toast message`,
          type: type,
          duration: 5000
        });
      }, index * 1000);
    });
  };

  const showMultipleToasts = () => {
    for (let i = 1; i <= 5; i++) {
      setTimeout(() => {
        addToast({
          title: `Toast #${i}`,
          message: `This is toast message number ${i}`,
          type: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)],
          duration: 5000
        });
      }, i * 800);
    }
  };
  
  // Theme Demo Functions
  const showThemeChangedToast = () => {
    addToast({
      title: `Theme Changed to ${isHighContrast ? 'High Contrast' : 'Default'}`,
      message: `The application is now using the ${isHighContrast ? 'high contrast' : 'default'} theme.`,
      type: 'info'
    });
  };
  
  const handleToggleWithToast = () => {
    toggleTheme();
    showThemeChangedToast();
  };
  
  const colorPalette = isHighContrast ? {
    primary: '#1d4ed8',
    secondary: '#64748b',
    background: '#0f172a',
    text: '#f8fafc',
    border: '#334155',
    accent: '#f59e0b'
  } : {
    primary: '#4f46e5',
    secondary: '#64748b',
    background: '#ffffff',
    text: '#1e293b',
    border: '#e2e8f0',
    accent: '#f59e0b'
  };
  
  // Auth Demo Functions
  const handleCredentialsChange = (e) => {
    const { name, value } = e.target;
    setLoginCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLogin = async () => {
    const result = await login(loginCredentials);
    addToast({
      title: result.success ? 'Login Successful' : 'Login Failed',
      message: result.success ? 'You are now logged in' : result.message,
      type: result.success ? 'success' : 'error'
    });
  };
  
  const handleDevLogin = () => {
    devLogin();
    addToast({
      title: 'Dev Login',
      message: 'Logged in with development mode',
      type: 'warning'
    });
  };
  
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="container mt-5 mb-5">
      <h1 className="mb-4">React Context API Demo</h1>
      <p className="lead">This demo showcases the power of React Context API for global state management in the Banking Assistant app.</p>
      
      <div className="d-flex gap-3 mb-4">
        <a href="#toast-demo" className="btn btn-primary">
          <FontAwesomeIcon icon={faBell} className="me-2" />
          Toast Context Demo
        </a>
        <a href="#theme-demo" className="btn btn-secondary">
          <FontAwesomeIcon icon={faPalette} className="me-2" />
          Theme Context Demo
        </a>
        <a href="#auth-demo" className="btn btn-success">
          <FontAwesomeIcon icon={faLock} className="me-2" />
          Auth Context Demo
        </a>
      </div>
      
      {/* TOAST CONTEXT DEMO */}
      <div className="card mb-5" id="toast-demo">
        <div className="card-header bg-primary text-white">
          <h2><FontAwesomeIcon icon={faBell} className="me-2" />Toast Context Demo</h2>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <label htmlFor="toastTitle" className="form-label">Toast Title</label>
              <input 
                type="text" 
                className="form-control" 
                id="toastTitle" 
                value={toastTitle} 
                onChange={(e) => setToastTitle(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastMessage" className="form-label">Toast Message</label>
              <input 
                type="text" 
                className="form-control" 
                id="toastMessage" 
                value={toastMessage} 
                onChange={(e) => setToastMessage(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastType" className="form-label">Toast Type</label>
              <select 
                className="form-select" 
                id="toastType" 
                value={toastType} 
                onChange={(e) => setToastType(e.target.value)}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastDuration" className="form-label">Duration (ms)</label>
              <input 
                type="number" 
                className="form-control" 
                id="toastDuration" 
                value={toastDuration} 
                onChange={(e) => setToastDuration(e.target.value)}
                min="1000"
                step="1000"
              />
            </div>
          </div>
          
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={showToast}>
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              Show Toast
            </button>
            <button className="btn btn-success" onClick={showAllTypes}>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Show All Types
            </button>
            <button className="btn btn-warning" onClick={showMultipleToasts}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Show Multiple Toasts
            </button>
          </div>
        </div>
        
        <div className="card-footer">
          <h5><FontAwesomeIcon icon={faInfoCircle} className="me-2" />Toast Context Usage Guide</h5>
          <code className="d-block bg-light p-3 rounded">
            {`
// Import the useToast hook
import { useToast } from '../contexts/ToastContext';

// Inside your component
const { addToast } = useToast();

// Show a toast notification
addToast({
  title: 'Toast Title',
  message: 'Toast message content',
  type: 'info', // 'info', 'success', 'warning', 'error'
  duration: 5000 // milliseconds
});
            `}
          </code>
        </div>
      </div>
      
      {/* THEME CONTEXT DEMO */}
      <div className="card mb-5" id="theme-demo">
        <div className="card-header bg-secondary text-white">
          <h2><FontAwesomeIcon icon={faPalette} className="me-2" />Theme Context Demo</h2>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-info">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Current theme: <strong>{isHighContrast ? 'High Contrast' : 'Default'}</strong>
              </div>
            </div>
          </div>
          
          <div className="d-flex gap-3 mb-4">
            <button 
              className="btn btn-lg btn-primary" 
              onClick={handleToggleWithToast}
            >
              <FontAwesomeIcon icon={isHighContrast ? faSun : faMoon} className="me-2" />
              Switch to {isHighContrast ? 'Default' : 'High Contrast'} Theme
            </button>
          </div>
          
          <h4 className="mb-3">Current Theme Color Palette</h4>
          <div className="row mb-4">
            {Object.entries(colorPalette).map(([name, color]) => (
              <div className="col-md-4 col-sm-6 mb-3" key={name}>
                <div className="card">
                  <div 
                    className="card-img-top" 
                    style={{ 
                      height: '100px', 
                      backgroundColor: color,
                      border: `1px solid ${colorPalette.border}`
                    }}
                  ></div>
                  <div className="card-body">
                    <h5 className="card-title text-capitalize">{name}</h5>
                    <p className="card-text font-monospace">{color}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card-footer">
          <h5><FontAwesomeIcon icon={faInfoCircle} className="me-2" />Theme Context Usage Guide</h5>
          <code className="d-block bg-light p-3 rounded">
            {`
// Import the useTheme hook
import { useTheme } from '../contexts/ThemeContext';

// Inside your component
const { theme, toggleTheme, isHighContrast } = useTheme();

// Toggle the theme
<button onClick={toggleTheme}>
  Switch to {isHighContrast ? 'Default' : 'High Contrast'} Theme
</button>

// Use theme information in your component
<div className={\`container \${isHighContrast ? 'dark-mode' : ''}\`}>
  Content
</div>
            `}
          </code>
        </div>
      </div>
      
      {/* AUTH CONTEXT DEMO */}
      <div className="card mb-5" id="auth-demo">
        <div className="card-header bg-success text-white">
          <h2><FontAwesomeIcon icon={faLock} className="me-2" />Auth Context Demo</h2>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-12">
              <div className={`alert ${isAuthenticated ? 'alert-success' : 'alert-warning'}`}>
                <FontAwesomeIcon icon={isAuthenticated ? faUnlock : faLock} className="me-2" />
                Current auth status: <strong>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</strong>
                {isAuthenticated && user && (
                  <div className="mt-2">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Logged in as: <strong>{user.name || user.email || 'Unknown User'}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {!isAuthenticated ? (
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <label htmlFor="username" className="form-label">Username/Email</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="username" 
                  name="username"
                  value={loginCredentials.username} 
                  onChange={handleCredentialsChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  id="password" 
                  name="password"
                  value={loginCredentials.password} 
                  onChange={handleCredentialsChange}
                />
              </div>
              <div className="col-12">
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    ) : (
                      <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                    )}
                    Login with Credentials
                  </button>
                  <button 
                    className="btn btn-warning" 
                    onClick={handleDevLogin}
                  >
                    <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                    Dev Login (Bypass)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="d-flex justify-content-center mb-4">
              <button 
                className="btn btn-danger" 
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                Logout
              </button>
            </div>
          )}
        </div>
        
        <div className="card-footer">
          <h5><FontAwesomeIcon icon={faInfoCircle} className="me-2" />Auth Context Usage Guide</h5>
          <code className="d-block bg-light p-3 rounded">
            {`
// Import the useAuth hook
import { useAuth } from '../contexts/AuthContext';

// Inside your component
const { 
  isAuthenticated, // Boolean - whether user is logged in
  user,            // Object - user info if logged in
  loading,         // Boolean - for loading states
  login,           // Function(credentials) - login user
  signup,          // Function(userData) - register user
  logout,          // Function() - logout user
  devLogin         // Function() - development mode login
} = useAuth();

// Protected route example
<Route 
  path="/dashboard" 
  element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
/>
            `}
          </code>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p>
          <Link to="/" className="btn btn-outline-primary">
            Back to Application
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ContextDemo; 