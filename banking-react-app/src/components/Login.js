import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUniversity, 
  faCamera,
  faSpinner,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Webcam from 'react-webcam';
import '../styles/Auth.css';

// API base URL - change this to your FastAPI server URL
const API_BASE_URL = 'http://localhost:5000';

const Login = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const webcamRef = useRef(null);
  const hasAnnounced = useRef(false);
  const synth = useRef(window.speechSynthesis);
  
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();

  useEffect(() => {
    document.body.classList.add('auth-background');
    
    // Speak welcome message only once per load
    if (!hasAnnounced.current) {
      synth.current.cancel();
      const utterance = new SpeechSynthesisUtterance("Welcome to face recognition login. Please position your face in the camera view.");
      utterance.onend = () => { hasAnnounced.current = false; };
      synth.current.speak(utterance);
      hasAnnounced.current = true;
    }
    
    return () => {
      document.body.classList.remove('auth-background');
      synth.current.cancel();
      hasAnnounced.current = false;
    };
  }, []);

  useEffect(() => {
    if (error) {  
      synth.current.cancel();
      const utterance = new SpeechSynthesisUtterance(`Error: ${error}`);
      synth.current.speak(utterance);
    } else if (success) {  
      synth.current.cancel();
      const utterance = new SpeechSynthesisUtterance(`Success: ${success}`);
      synth.current.speak(utterance);
    }
  }, [error, success]);

  const captureImage = async () => {
    if (webcamRef.current) {
      setIsCapturing(true);
      setIsProcessing(true);
      setError('');
      setSuccess('');
      synth.current.cancel();
      const captureUtterance = new SpeechSynthesisUtterance("Capturing image and processing face for login.");
      synth.current.speak(captureUtterance);

      const imageSrc = webcamRef.current.getScreenshot();
      
      try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('face_image', blob, 'face.jpg');
        
        const resultResponse = await fetch(`${API_BASE_URL}/api/verify-face`, {
            method: 'POST',
            body: formData
        });
        
        const result = await resultResponse.json();
        
        if (result.success) {
          setSuccess('Face recognition successful! Redirecting...');
          if (login) {
            // Use user data from successful face verification directly for frontend login
            login(result.user, true);
          }
          document.querySelector('.auth-card').classList.add('success-animation');
          
          synth.current.cancel();
          const successUtterance = new SpeechSynthesisUtterance(`Face recognition successful. Welcome, ${result.user?.name || 'user'}. Redirecting.`);
          synth.current.speak(successUtterance);

          addToast({
            title: 'Login Successful',
            message: `Welcome, ${result.user?.name || 'user'}!`, 
            type: 'success'
          });
          navigate('/');

        } else {
          // Handle face verification failure specifically
          const errorMessage = result.message || 'Face not recognized.';
          setError(`${errorMessage} Please try again or sign up if you don\'t have an account.`);
          addToast({
            title: 'Login Failed',
            message: `${errorMessage} Please try again or sign up.`, // Keep signup suggestion for failure
            type: 'error'
          });
          synth.current.cancel();
          const errorUtterance = new SpeechSynthesisUtterance(`Login failed. ${errorMessage} Please try again or sign up if you don\'t have an account.`);
          synth.current.speak(errorUtterance);
        }
      } catch (err) {
        console.error("Error during face login:", err);
        // This catch block is for network errors or issues before getting a valid response
        setError('An error occurred connecting to the server or processing the response.');
        addToast({
          title: 'Error',
          message: 'An error occurred connecting to the server or processing the response.',
          type: 'error'
        });
         synth.current.cancel();
         const errorUtterance = new SpeechSynthesisUtterance("An error occurred connecting to the server or processing the response.");
         synth.current.speak(errorUtterance);
      } finally {
        setIsCapturing(false);
        setIsProcessing(false);
      }
    }
  };
  
  const statusMessage = (
    isProcessing ? "Processing face recognition for login." :
    success ? "Login successful. Redirecting." :
    error ? `Login failed. ${error}` :
    "Face recognition login page. Position your face in the camera view and capture."
  );

  return (
    <div className="auth-container">
      <div role="status" aria-live="polite" className="visually-hidden">
        {typeof statusMessage === 'string' || typeof statusMessage === 'number' ? statusMessage : null}
      </div>

      <div className="auth-card">
        <div className="auth-card-inner">
          <Fragment>
            <div className="auth-header">
              <div className="bank-logo" aria-hidden="true">
                <FontAwesomeIcon icon={faUniversity} />
              </div>
              <h1>Face Recognition Login</h1>
              <p>Sign in to continue to Banking Assistant</p>
            </div>
            
            {error && typeof error === 'string' && (
              <div className="auth-alert error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            
            {success && typeof success === 'string' && (
              <div className="auth-alert success" role="status" aria-live="polite">
                {success}
              </div>
            )}
            
            <div className="webcam-container">
              <Fragment>
                <div className="visually-hidden" aria-live="polite">
                    Webcam view for face recognition login. Position your face in the center.
                </div>

                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 400,
                    height: 400,
                    facingMode: "user"
                  }}
                  className="webcam"
                  aria-label="Webcam feed for face recognition login"
                />
                
                <button
                  onClick={captureImage}
                  disabled={isProcessing || isCapturing}
                  className={`auth-button ${isProcessing || isCapturing ? 'loading' : ''}`}
                  aria-label={
                     isProcessing || isCapturing ? 'Processing face for login...' :
                     'Capture face for login.'
                  }
                >
                  {isProcessing || isCapturing ? [
                    <FontAwesomeIcon key="spinner" icon={faSpinner} spin aria-hidden="true" />,
                    <span key="processing">Processing...</span>
                  ] : [
                    <FontAwesomeIcon key="camera" icon={faCamera} aria-hidden="true" />,
                    <span key="capture">Capture Face for Login</span>
                  ]}
                </button>
              </Fragment>
            </div>
            
            <div className="auth-footer">
              <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up for a new account</Link></p>
              <p>Or <Link to="/login-password" className="auth-link">Login with password</Link></p>
            </div>
          </Fragment>
        </div>
        
        <div className="auth-decoration" aria-hidden="true">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Login; 