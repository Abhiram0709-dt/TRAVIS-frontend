import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSun, 
  faMoon, 
  faAdjust, 
  faInfoCircle, 
  faPalette
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

const ThemeDemo = () => {
  const { theme, toggleTheme, isHighContrast } = useTheme();
  const { addToast } = useToast();
  
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
  
  // Sample color palette based on theme
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

  return (
    <div className="container mt-5">
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
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
      
      <div className="card">
        <div className="card-header">
          <h4>Theme Sample Components</h4>
        </div>
        <div className="card-body">
          <h5>Buttons</h5>
          <div className="d-flex flex-wrap gap-2 mb-4">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-success">Success</button>
            <button className="btn btn-danger">Danger</button>
            <button className="btn btn-warning">Warning</button>
            <button className="btn btn-info">Info</button>
          </div>
          
          <h5>Form Controls</h5>
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="form-group mb-3">
                <label htmlFor="sampleInput" className="form-label">Sample Input</label>
                <input type="text" className="form-control" id="sampleInput" placeholder="Enter text" />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="sampleSelect" className="form-label">Sample Select</label>
                <select className="form-select" id="sampleSelect">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group mb-3">
                <label className="form-label">Sample Checkboxes</label>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="check1" checked readOnly />
                  <label className="form-check-label" htmlFor="check1">Checkbox 1</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="check2" />
                  <label className="form-check-label" htmlFor="check2">Checkbox 2</label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sample Radio Buttons</label>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="radioGroup" id="radio1" checked readOnly />
                  <label className="form-check-label" htmlFor="radio1">Radio 1</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="radioGroup" id="radio2" />
                  <label className="form-check-label" htmlFor="radio2">Radio 2</label>
                </div>
              </div>
            </div>
          </div>
          
          <h5>Alert Messages</h5>
          <div className="alert alert-primary mb-2">This is a primary alert</div>
          <div className="alert alert-success mb-2">This is a success alert</div>
          <div className="alert alert-warning mb-2">This is a warning alert</div>
          <div className="alert alert-danger mb-2">This is a danger alert</div>
          <div className="alert alert-info mb-2">This is an info alert</div>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo; 