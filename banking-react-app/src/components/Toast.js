import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faExclamationCircle, 
  faExclamationTriangle, 
  faInfoCircle, 
  faTimes 
} from '@fortawesome/free-solid-svg-icons';
import '../styles/Toast.css';

const Toast = ({ title, message, type = 'info', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // For accessibility - announce toast
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = `${type} notification: ${title}. ${message}`;
    }
  }, [title, message, type]);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };
  
  const getIconByType = () => {
    switch (type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faExclamationCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'info':
      default:
        return faInfoCircle;
    }
  };
  
  const animationClass = isExiting ? 'animate__fadeOutRight' : 'animate__fadeInRight';
  
  return (
    <div className={`toast toast-${type} animate__animated ${animationClass}`}>
      <div className="toast-icon">
        <FontAwesomeIcon icon={getIconByType()} />
      </div>
      <div className="toast-content">
        <div className="toast-title">
          {title}
          <button 
            className="toast-close" 
            aria-label="Close notification" 
            onClick={handleClose}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="toast-message">{message}</div>
      </div>
    </div>
  );
};

export default Toast; 