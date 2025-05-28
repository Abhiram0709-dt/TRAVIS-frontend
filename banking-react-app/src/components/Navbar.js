import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUniversity, 
  faGlobe, 
  faMoon, 
  faSun, 
  faThLarge, 
  faSignOutAlt, 
  faUser,
  faUniversalAccess,
  faVolumeUp
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

// API base URL - change this to your Flask server URL
const API_BASE_URL = 'http://localhost:5000';

const Navbar = () => {
  // Use the theme context
  const { theme, toggleTheme, isHighContrast } = useTheme();
  
  // Use the auth context
  const { logout, user } = useAuth();
  
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('preferredLanguage') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
  }, [language]);

  const handleLanguageChange = async (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage })
      });
      
      // Handle response if needed
      const data = await response.json();
      console.log('Language change response:', data);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };
  
  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <FontAwesomeIcon icon={faUniversity} />
          <span>Banking Assistant</span>
          <FontAwesomeIcon icon={faUniversalAccess} className="ms-2" title="Accessibility Help Desk" />
        </Link>
        <div className="d-flex align-items-center gap-3">
          {user && (
            <div className="user-info me-3">
              <FontAwesomeIcon icon={faUser} className="me-2" />
              <span>{user.name || user.email}</span>
            </div>
          )}
          <div className="language-selector">
            <FontAwesomeIcon icon={faGlobe} className="me-2" />
            <select 
              id="languageSelect" 
              className="form-select border-0"
              value={language}
              onChange={handleLanguageChange}
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>
          <button 
            className="btn-icon" 
            id="toggleContrast" 
            aria-label={isHighContrast ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            <FontAwesomeIcon icon={isHighContrast ? faSun : faMoon} />
          </button>
          <Link to="/dashboard" className="btn-icon" aria-label="Go to dashboard">
            <FontAwesomeIcon icon={faThLarge} />
          </Link>
          <button onClick={handleLogout} className="btn btn-light btn-sm rounded-pill px-3 ms-2">
            <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 