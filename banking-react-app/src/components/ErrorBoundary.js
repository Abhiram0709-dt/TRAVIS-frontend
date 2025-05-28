import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import config from '../config';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    
    // In production, you might want to send this to a logging service
    if (config.IS_PRODUCTION) {
      // Example: sendErrorToLoggingService(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <div className="error-content">
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="error-icon" />
            <h2>Something went wrong</h2>
            <p>We're sorry, but an error occurred while running the application.</p>
            {config.IS_DEVELOPMENT && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <p>{this.state.error.toString()}</p>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            <button 
              className="btn btn-primary mt-3" 
              onClick={this.handleReload}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 