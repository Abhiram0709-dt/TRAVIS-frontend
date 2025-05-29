import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUniversity, 
  faMoon, 
  faSun, 
  faSignOutAlt, 
  faUser,
  faUniversalAccess,
  faCog,
  faChevronDown,
  faPalette
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme, isHighContrast } = useTheme();
  const { logout, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <FontAwesomeIcon icon={faUniversity} className="brand-icon" />
          <span>Banking Assistant</span>
          <FontAwesomeIcon icon={faUniversalAccess} className="accessibility-icon" title="Accessibility Help Desk" />
        </Link>
        
        {user && (
          <div className="user-profile" ref={profileRef}>
            <button 
              className="user-profile-button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
              aria-controls="user-profile-dropdown"
            >
              <div className="user-avatar">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <span className="user-name">{user.name || user.email}</span>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className={`dropdown-arrow ${isProfileOpen ? 'open' : ''}`}
              />
            </button>
            
            {isProfileOpen && (
              <div className="user-profile-dropdown" id="user-profile-dropdown">
                <div className="user-info">
                  <div className="user-avatar-large">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <div className="user-details">
                    <h4>{user.name || 'User'}</h4>
                    <p>{user.email}</p>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <Link to="/settings" className="dropdown-item">
                  <FontAwesomeIcon icon={faCog} />
                  <span>Settings</span>
                </Link>
                <button 
                  className="dropdown-item theme-toggle"
                  onClick={toggleTheme}
                  aria-label={isHighContrast ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <FontAwesomeIcon icon={isHighContrast ? faSun : faMoon} />
                  <span>{isHighContrast ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-item logout">
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 