import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faCamera, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Webcam from 'react-webcam';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

const FaceLogin = () => {
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
    
    if (!hasAnnounced.current) {
      synth.current.cancel();
      const utterance = new SpeechSynthesisUtterance("Welcome to face recognition login. Please position your face in the camera view.");
      synth.current.speak(utterance);
      hasAnnounced.current = true;
    }
    
    return () => {
      document.body.classList.remove('auth-background');
      synth.current.cancel();
      hasAnnounced.current = false;
    };
  }, []);

  const captureImage = async () => {
    if (webcamRef.current) {
      setIsCapturing(true);
      const imageSrc = webcamRef.current.getScreenshot();
      
      try {
        setIsProcessing(true);
        setError('');
        
        // Convert base64 to blob
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('face_image', blob, 'face.jpg');
        
        // Send to backend
        const result = await login({ face_image: formData });
        
        if (result.success) {
          setSuccess('Face recognition successful! Redirecting...');
          document.querySelector('.auth-card').classList.add('success-animation');
          
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setError(result.message || 'Face recognition failed. Please try again.');
          addToast({
            title: 'Login Failed',
            message: 'Face recognition failed. Please try again.',
            type: 'error'
          });
        }
      } catch (err) {
        setError('An error occurred during face recognition.');
        addToast({
          title: 'Error',
          message: 'An error occurred during face recognition.',
          type: 'error'
        });
      } finally {
        setIsProcessing(false);
        setIsCapturing(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-inner">
          <div className="auth-header">
            <div className="bank-logo">
              <FontAwesomeIcon icon={faUniversity} />
            </div>
            <h1>Face Recognition Login</h1>
            <p>Position your face in the camera view</p>
          </div>
          
          {error && (
            <div className="auth-alert error">
              {error}
            </div>
          )}
          
          {success && (
            <div className="auth-alert success">
              {success}
            </div>
          )}
          
          <div className="webcam-container">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 400,
                height: 400,
                facingMode: "user"
              }}
              className="webcam"
            />
            
            <button
              onClick={captureImage}
              disabled={isProcessing || isCapturing}
              className={`auth-button ${isProcessing ? 'loading' : ''}`}
            >
              {isProcessing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCamera} />
                  <span>Capture Face</span>
                </>
              )}
            </button>
          </div>
          
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link></p>
          </div>
        </div>
        
        <div className="auth-decoration">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default FaceLogin; 