import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatPage from './components/ChatPage';
import Login from './components/Login';
import Signup from './components/Signup';
import DemoPage from './demo/DemoPage';
import ThemeDemo from './demo/ThemeDemo';
import ContextDemo from './demo/ContextDemo';
import ErrorBoundary from './components/ErrorBoundary';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import './styles/App.css';
import './styles/ErrorBoundary.css';

function App() {
  // Use the theme context
  const { theme, isHighContrast } = useTheme();
  
  // Use the auth context
  const { isAuthenticated } = useAuth();

  // Apply theme class to html and body elements
  useEffect(() => {
    // Set theme class on body
    if (isHighContrast) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Also update the data-theme attribute on document.documentElement (html element)
    document.documentElement.setAttribute('data-theme', isHighContrast ? 'high-contrast' : 'default');
    
    return () => {
      // Cleanup function
      document.body.classList.remove('dark-mode');
      document.documentElement.removeAttribute('data-theme');
    };
  }, [isHighContrast, theme]);

  return (
    <ErrorBoundary>
      <Router>
        <div className={`App ${isHighContrast ? 'dark-mode' : ''}`}>
          {isAuthenticated && <Navbar />}
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login /> : <Navigate to="/" />} 
            />
            <Route 
              path="/signup" 
              element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? 
                  <div className={`container mt-5 ${isHighContrast ? 'text-light bg-dark' : 'bg-white'}`}>
                    <h1>Dashboard Page</h1>
                  </div> : 
                  <Navigate to="/login" />
              } 
            />
            <Route 
              path="/toast-demo" 
              element={<DemoPage />} 
            />
            <Route 
              path="/theme-demo" 
              element={<ThemeDemo />} 
            />
            <Route 
              path="/context-demo" 
              element={<ContextDemo />} 
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 