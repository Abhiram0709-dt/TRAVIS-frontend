import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatPage from './components/ChatPage';
import Login from './components/Login';
import Signup from './components/Signup';
import Home from './components/Home';
import DemoPage from './demo/DemoPage';
import ThemeDemo from './demo/ThemeDemo';
import ContextDemo from './demo/ContextDemo';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Reviews from './components/Reviews';
import './styles/App.css';
import './styles/ErrorBoundary.css';

function AppContent() {
  // Use the theme context
  const { theme, isHighContrast } = useTheme();
  
  // Use the auth context
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

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

  // Add global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + C: Go to chat
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (isAuthenticated) {
          navigate('/chat');
        } else {
          const synth = window.speechSynthesis;
          const utterance = new SpeechSynthesisUtterance("Please login to access the chat page");
          synth.speak(utterance);
          addToast({
            title: 'Authentication Required',
            message: 'Please login to access the chat page',
            type: 'warning',
            duration: 3000
          });
          navigate('/login');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, navigate, addToast]);

  return (
    <div className={`App ${isHighContrast ? 'dark-mode' : ''}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/chat" 
          element={
            <>
              {isAuthenticated && <Navbar />}
              {isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />}
            </>
          } 
        />
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/signup" 
          element={!isAuthenticated ? <Signup /> : <Navigate to="/" replace />} 
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
        <Route 
          path="/reviews" 
          element={<Reviews />} 
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 