import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the theme context
const ThemeContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('highContrast') === 'true' ? 'high-contrast' : 'default';
  });

  // Update body attribute when theme changes
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle between default and high-contrast themes
  const toggleTheme = () => {
    const newTheme = theme === 'high-contrast' ? 'default' : 'high-contrast';
    setTheme(newTheme);
    localStorage.setItem('highContrast', newTheme === 'high-contrast');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isHighContrast: theme === 'high-contrast' }}>
      {children}
    </ThemeContext.Provider>
  );
}; 