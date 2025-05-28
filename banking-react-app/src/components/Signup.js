import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUniversity, 
  faEnvelope, 
  faLock, 
  faUser, 
  faUserPlus,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

// API base URL - change this to your Flask server URL
const API_BASE_URL = 'http://localhost:5000';

// Add this near the top of the file after the imports
const DEV_MODE = false; // Set to false since the server is now running

const Signup = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: ''
  });
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { signup, loading: authLoading, devLogin } = useAuth();

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateStep1 = () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Please fill in all fields');
      addToast({
        title: 'Validation Error',
        message: 'Please fill in all fields',
        type: 'error'
      });
      return false;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      addToast({
        title: 'Validation Error',
        message: 'Please enter a valid email address',
        type: 'error'
      });
      return false;
    }
    
    return true;
  };
  
  const validateStep2 = () => {
    if (!formData.username || !formData.password || !formData.confirm_password) {
      setError('Please fill in all fields');
      addToast({
        title: 'Validation Error',
        message: 'Please fill in all fields',
        type: 'error'
      });
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      addToast({
        title: 'Password Error',
        message: 'Password must be at least 6 characters long',
        type: 'error'
      });
      return false;
    }
    
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      addToast({
        title: 'Password Error',
        message: 'Passwords do not match',
        type: 'error'
      });
      return false;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep1()) {
      setError('');
      // Add animation class to card
      const card = document.querySelector('.auth-card-inner');
      card.classList.add('flip-out');
      
      addToast({
        title: 'Step 1 Complete',
        message: 'Please set your login credentials',
        type: 'info'
      });
      
      setTimeout(() => {
        setStep(2);
        card.classList.remove('flip-out');
        card.classList.add('flip-in');
        setTimeout(() => {
          card.classList.remove('flip-in');
        }, 500);
      }, 400);
    }
  };
  
  const prevStep = () => {
    setError('');
    // Add animation class to card
    const card = document.querySelector('.auth-card-inner');
    card.classList.add('flip-out-reverse');
    
    setTimeout(() => {
      setStep(1);
      card.classList.remove('flip-out-reverse');
      card.classList.add('flip-in-reverse');
      setTimeout(() => {
        card.classList.remove('flip-in-reverse');
      }, 500);
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    // In development mode, use dev login
    if (DEV_MODE) {
      const result = devLogin();
      
      if (result.success) {
        setSuccess('Account created successfully! Redirecting...');
        
        // Add success animation
        document.querySelector('.auth-card').classList.add('success-animation');
        
        // Call the onLoginSuccess callback
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Redirect after animation
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
      
      setLoading(false);
      return;
    }
    
    // Create payload from form data
    const userData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      username: formData.username,
      password: formData.password
    };
    
    // Call signup from auth context
    const result = await signup(userData);
    
    if (result.success) {
      setSuccess('Account created successfully! Redirecting...');
      
      // Add success animation
      document.querySelector('.auth-card').classList.add('success-animation');
      
      // Call the onLoginSuccess callback
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // Redirect after animation
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setError(result.message || 'Failed to create account. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-inner">
          <div className="auth-header">
            <div className="bank-logo">
              <FontAwesomeIcon icon={faUniversity} />
            </div>
            <h1>{step === 1 ? 'Create Account' : 'Set Login Details'}</h1>
            <p>
              {step === 1 
                ? 'Sign up for Banking Assistant' 
                : 'Almost there! Set your login credentials'}
            </p>
            
            {/* Progress indicator */}
            <div className="progress-indicator">
              <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                <div className="step-number">
                  {step > 1 ? <FontAwesomeIcon icon={faCheck} /> : '1'}
                </div>
                <span>Personal Info</span>
              </div>
              <div className="progress-line"></div>
              <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <span>Credentials</span>
              </div>
            </div>
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
            {step === 1 ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <div className="input-icon">
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                    <input
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="form-control"
                    />
                    <div className="focus-border"></div>
                  </div>
                  
                  <div className="form-group">
                    <div className="input-icon">
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="form-control"
                    />
                    <div className="focus-border"></div>
                  </div>
                </div>
                
                <div className="form-group">
                  <div className="input-icon">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                  />
                  <div className="focus-border"></div>
                </div>
                
                <button 
                  type="button" 
                  className="auth-button" 
                  onClick={nextStep}
                >
                  <span>Continue</span>
                  <FontAwesomeIcon icon={faUserPlus} />
                </button>
                
                {DEV_MODE && (
                  <button 
                    type="button" 
                    className="auth-button secondary mt-3"
                    onClick={() => devLogin() && navigate('/')}
                  >
                    <span>Dev Mode Login</span>
                    <FontAwesomeIcon icon={faUserPlus} />
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="form-group">
                  <div className="input-icon">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
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
                    value={formData.password}
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
                    name="confirm_password"
                    placeholder="Confirm Password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    disabled={loading}
                    className="form-control"
                  />
                  <div className="focus-border"></div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="auth-button secondary" 
                    onClick={prevStep}
                    disabled={loading}
                  >
                    Back
                  </button>
                  
                  <button 
                    type="submit" 
                    className={`auth-button primary ${loading ? 'loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="spinner"></div>
                    ) : (
                      <>
                        <span>Sign Up</span>
                        <FontAwesomeIcon icon={faUserPlus} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Sign In</Link></p>
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

export default Signup; 