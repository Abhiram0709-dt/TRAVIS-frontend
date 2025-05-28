import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from './ToastContext';

// API base URL - change this to your Flask server URL
const API_BASE_URL = 'http://localhost:5000';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  
  // Use toast for notifications
  const { addToast } = useToast();

  // Login handler
  const login = async (credentials) => {
    setLoading(true);
    
    try {
      // Make API call to login endpoint
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Set auth state
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Set user info if available
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Show success toast
        addToast({
          title: 'Login Successful',
          message: 'Welcome back to your Banking Assistant',
          type: 'success'
        });
        
        return { success: true };
      } else {
        // Show error toast
        addToast({
          title: 'Login Failed',
          message: data.message || 'Invalid credentials',
          type: 'error'
        });
        
        return { 
          success: false, 
          message: data.message || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show error toast
      addToast({
        title: 'Connection Error',
        message: 'Please try again later or use development mode',
        type: 'error'
      });
      
      return { 
        success: false, 
        message: 'Connection error. Please try again later.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Signup handler
  const signup = async (userData) => {
    setLoading(true);
    
    try {
      // Make API call to signup endpoint
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Set auth state
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Set user info if available
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Show success toast
        addToast({
          title: 'Account Created',
          message: 'Your account has been created successfully!',
          type: 'success'
        });
        
        return { success: true };
      } else {
        // Show error toast
        addToast({
          title: 'Signup Failed',
          message: data.message || 'Failed to create account',
          type: 'error'
        });
        
        return { 
          success: false, 
          message: data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      // Show error toast
      addToast({
        title: 'Connection Error',
        message: 'Please try again later or use development mode',
        type: 'error'
      });
      
      return { 
        success: false, 
        message: 'Connection error. Please try again later.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      // Call the logout API endpoint
      await fetch(`${API_BASE_URL}/logout`);
      
      // Clear auth state
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      // Show success toast
      addToast({
        title: 'Logged Out',
        message: 'You have been successfully logged out',
        type: 'info'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Still clear local state even if API call fails
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      return { success: false, message: 'Error during logout' };
    }
  };

  // Development mode login - bypasses server authentication
  const devLogin = () => {
    setIsAuthenticated(true);
    const devUser = { name: 'Dev User', email: 'dev@example.com' };
    setUser(devUser);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(devUser));
    
    addToast({
      title: 'Dev Mode Login',
      message: 'Logged in using development mode',
      type: 'warning'
    });
    
    return { success: true };
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        loading,
        login,
        signup,
        logout,
        devLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 