import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faInfoCircle, 
  faCheckCircle, 
  faExclamationTriangle, 
  faTimesCircle 
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';

const DemoPage = () => {
  const { addToast } = useToast();
  const [toastTitle, setToastTitle] = useState('Toast Notification');
  const [toastMessage, setToastMessage] = useState('This is a sample toast message');
  const [toastType, setToastType] = useState('info');
  const [toastDuration, setToastDuration] = useState(5000);

  const showToast = () => {
    addToast({
      title: toastTitle,
      message: toastMessage,
      type: toastType,
      duration: parseInt(toastDuration)
    });
  };

  const showAllTypes = () => {
    const types = ['info', 'success', 'warning', 'error'];
    
    types.forEach((type, index) => {
      setTimeout(() => {
        addToast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Toast`,
          message: `This is a sample ${type} toast message`,
          type: type,
          duration: 5000
        });
      }, index * 1000);
    });
  };

  const showMultipleToasts = () => {
    for (let i = 1; i <= 5; i++) {
      setTimeout(() => {
        addToast({
          title: `Toast #${i}`,
          message: `This is toast message number ${i}`,
          type: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)],
          duration: 5000
        });
      }, i * 800);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2>Toast Context Demo</h2>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <label htmlFor="toastTitle" className="form-label">Toast Title</label>
              <input 
                type="text" 
                className="form-control" 
                id="toastTitle" 
                value={toastTitle} 
                onChange={(e) => setToastTitle(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastMessage" className="form-label">Toast Message</label>
              <input 
                type="text" 
                className="form-control" 
                id="toastMessage" 
                value={toastMessage} 
                onChange={(e) => setToastMessage(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastType" className="form-label">Toast Type</label>
              <select 
                className="form-select" 
                id="toastType" 
                value={toastType} 
                onChange={(e) => setToastType(e.target.value)}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="toastDuration" className="form-label">Duration (ms)</label>
              <input 
                type="number" 
                className="form-control" 
                id="toastDuration" 
                value={toastDuration} 
                onChange={(e) => setToastDuration(e.target.value)}
                min="1000"
                step="1000"
              />
            </div>
          </div>
          
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={showToast}>
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              Show Toast
            </button>
            <button className="btn btn-success" onClick={showAllTypes}>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Show All Types
            </button>
            <button className="btn btn-warning" onClick={showMultipleToasts}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Show Multiple Toasts
            </button>
          </div>
        </div>
        
        <div className="card-footer">
          <h5><FontAwesomeIcon icon={faInfoCircle} className="me-2" />Toast Context Usage Guide</h5>
          <code className="d-block bg-light p-3 rounded">
            {`
// Import the useToast hook
import { useToast } from '../contexts/ToastContext';

// Inside your component
const { addToast } = useToast();

// Show a toast notification
addToast({
  title: 'Toast Title',
  message: 'Toast message content',
  type: 'info', // 'info', 'success', 'warning', 'error'
  duration: 5000 // milliseconds
});
            `}
          </code>
        </div>
      </div>
    </div>
  );
};

export default DemoPage; 