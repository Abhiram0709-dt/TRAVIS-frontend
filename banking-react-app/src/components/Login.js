import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faEnvelope, faLock, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

// For development mode only
const DEV_MODE = false;

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login, loading, devLogin } = useAuth();

  useEffect(() => {
    // Add animation class to body when component mounts
    document.body.classList.add('auth-background');
    
    // Clean up animation classes when component unmounts
    return () => {
      document.body.classList.remove('auth-background');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both email and password');
      addToast({
        title: 'Login Error',
        message: 'Please enter both email and password',
        type: 'error'
      });
      return;
    }
    
    setError('');
    
    // In development mode, use dev login
    if (DEV_MODE) {
      const result = devLogin();
      
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        
        // Add success animation
        document.querySelector('.auth-card').classList.add('success-animation');
        
        // Redirect after animation
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
      
      return;
    }
    
    // Regular login
    const result = await login(credentials);
    
    if (result.success) {
      setSuccess('Login successful! Redirecting...');
      
      // Add success animation
      document.querySelector('.auth-card').classList.add('success-animation');
      
      // Redirect after animation
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-inner">
          <div className="auth-header">
            <div className="bank-logo">
              <FontAwesomeIcon icon={faUniversity} />
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to continue to Banking Assistant</p>
          </div>
          
          {error && (
            <div className="auth-alert error">
              {error}
            </div>
          )}
          
          {success && (
            <div className="auth-alert success">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <div className="input-icon">
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <input
                type="text"
                name="username"
                placeholder="Email Address"
                value={credentials.username}
                onChange={handleChange}
                disabled={loading}
                className="form-control"
              />
              <div className="focus-border"></div>
            </div>
            
            <div className="form-group">
              <div className="input-icon">
                <FontAwesomeIcon icon={faLock} />
              </div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                disabled={loading}
                className="form-control"
              />
              <div className="focus-border"></div>
            </div>
            
            <div className="form-group remember-forgot">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>
            
            <button 
              type="submit" 
              className={`auth-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <FontAwesomeIcon icon={faSignInAlt} />
                </>
              )}
            </button>
            
            {DEV_MODE && (
              <button 
                type="button" 
                className="auth-button secondary mt-3"
                onClick={() => devLogin() && navigate('/')}
              >
                <span>Dev Mode Login</span>
                <FontAwesomeIcon icon={faSignInAlt} />
              </button>
            )}
          </form>
          
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link></p>
          </div>
        </div>
        
        <div className="auth-decoration">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Login; 