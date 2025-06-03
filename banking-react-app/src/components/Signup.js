import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUniversity, 
  faUserPlus,
  faCheck,
  faCamera,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Webcam from 'react-webcam';
import '../styles/Auth.css';

// API base URL - change this to your FastAPI server URL
const API_BASE_URL = 'http://localhost:5000';

const Signup = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
  });
  
  // Start directly at the username step or face registration step
  const [step, setStep] = useState(1); // We can adjust this based on the flow
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const hasAnnounced = useRef(false);
  const synth = useRef(window.speechSynthesis);
  
  const usernameInputRef = useRef(null); // Ref for the username input
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { signup, loading: authLoading, devLogin } = useAuth();

  useEffect(() => {
    document.body.classList.add('auth-background');
    
    if (!hasAnnounced.current) {
      synth.current.cancel();
      let utteranceText = "Welcome to the signup page. Please enter a username to create your account. Step 1 of 2.";
      if (step === 2) utteranceText = "You are now on Step 2 of 2. Please register your face for login.";
      const utterance = new SpeechSynthesisUtterance(utteranceText);
      
      // Focus the username input after the welcome message is spoken if on step 1
      if (step === 1) {
        utterance.onend = () => {
          hasAnnounced.current = false; // Reset announce flag
          // Use a small timeout to ensure the input is rendered and ready to be focused
          setTimeout(() => {
            if (usernameInputRef.current) {
              usernameInputRef.current.focus();
            }
          }, 100);
        };
      } else {
         utterance.onend = () => { hasAnnounced.current = false; };
      }
      synth.current.speak(utterance);
      hasAnnounced.current = true;
    }
    
    return () => {
      document.body.classList.remove('auth-background');
      synth.current.cancel();
      hasAnnounced.current = false;
    };
  }, [step]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) {
      setError('');
      synth.current.cancel();
    }
  };

  const validateStep1 = () => {
    if (!formData.username) {
      setError('Please enter a username.');
      addToast({
        title: 'Validation Error',
        message: 'Please enter a username.',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setError('');
      const card = document.querySelector('.auth-card-inner');
      card.classList.add('flip-out');
      synth.current.cancel();
      addToast({
        title: 'Username Set',
        message: 'Please register your face for login.',
        type: 'info'
      });
      setTimeout(() => {
        setStep(2); // Transition to face registration step
        card.classList.remove('flip-out');
        card.classList.add('flip-in');
        setTimeout(() => { card.classList.remove('flip-in'); }, 500);
      }, 400);
    }
  };

  const prevStep = () => {
    // Not needed in this simplified flow, but keeping for structure if needed later
  };

  const handleFaceRegistration = async () => {
    if (webcamRef.current) {
      setIsCapturing(true);
      setLoading(true);
      setError('');
      setSuccess('');
      synth.current.cancel();
      const captureUtterance = new SpeechSynthesisUtterance("Capturing image and processing face registration.");
      synth.current.speak(captureUtterance);

      try {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log("Captured image:", imageSrc.substring(0, 50) + "..."); // Log first 50 chars of base64
        
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        console.log("Blob size:", blob.size); // Log blob size
        
        const formDataPayload = new FormData();
        formDataPayload.append('face_image', blob, 'face.jpg');
        formDataPayload.append('name', formData.username);
        
        console.log("Sending request to:", `${API_BASE_URL}/api/register-face`);
        const registerResponse = await fetch(`${API_BASE_URL}/api/register-face`, {
            method: 'POST',
            body: formDataPayload
        });

        console.log("Response status:", registerResponse.status);
        const registerResult = await registerResponse.json();
        console.log("Response data:", registerResult);
        
        if (registerResult.success) {
          setFaceRegistered(true);
          setSuccess('Face registered successfully! You can now complete your signup.');
          addToast({
            title: 'Face Registered',
            message: 'Face registered successfully! You can now complete your signup.',
            type: 'success'
          });
          synth.current.cancel();
          const successUtterance = new SpeechSynthesisUtterance("Face registered successfully.");
          synth.current.speak(successUtterance);
        } else {
          const errorMessage = registerResult.message || 'Face registration failed. Please try again.';
          console.error("Registration failed:", errorMessage);
          setError(errorMessage);
          addToast({
            title: 'Face Registration Failed',
            message: errorMessage,
            type: 'error'
          });
          synth.current.cancel();
          const errorUtterance = new SpeechSynthesisUtterance(`Face registration failed. ${errorMessage}`);
          synth.current.speak(errorUtterance);
        }
      } catch (err) {
        console.error("Error during face registration:", err);
        const errorMessage = err.message || 'An error occurred during face registration.';
        setError(errorMessage);
        addToast({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        });
        synth.current.cancel();
        const errorUtterance = new SpeechSynthesisUtterance(errorMessage);
        synth.current.speak(errorUtterance);
      } finally {
        setLoading(false);
        setIsCapturing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!faceRegistered) {
        setError('Please register your face first.');
        addToast({
            title: 'Action Required',
            message: 'Please register your face first.',
            type: 'warning'
        });
        synth.current.cancel();
        const warningUtterance = new SpeechSynthesisUtterance("Please register your face first.");
        synth.current.speak(warningUtterance);

        return;
    }

    // Send username to backend to check for existence and complete signup
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          // Include a placeholder password as the backend requires it, even if not used for face login
          password: "face_auth_only", 
          // Include other required fields with dummy data or fetch from a previous step if implemented
          email: `${formData.username}@example.com`, 
          first_name: formData.username, 
          last_name: "User"
        })
      });

      const data = await response.json();

      if (response.status === 400 && data.message === "Username already exists") {
        setError('Username already exists. Please try a different username.');
        addToast({
          title: 'Signup Failed',
          message: 'Username already exists. Please try a different username.',
          type: 'error'
        });
        synth.current.cancel();
        const errorUtterance = new SpeechSynthesisUtterance("Username already exists. Please try a different username.");
        synth.current.speak(errorUtterance);
        setLoading(false); // Stop loading on error
      } else if (data.success) {
        // Handle successful signup
        setSuccess('Account created successfully! Redirecting...');
        document.querySelector('.auth-card').classList.add('success-animation');

        synth.current.cancel();
        const utterance = new SpeechSynthesisUtterance("Account created successfully. Redirecting to login.");
        synth.current.speak(utterance);

        // Navigate immediately after speaking the success message
        addToast({
            title: 'Signup Complete',
            message: 'Account created successfully!',
            type: 'success'
        });
        navigate('/login');
        
        setLoading(false); // Stop loading on success
      } else {
        // Handle other potential backend errors
        const errorMessage = data.message || 'An unexpected error occurred during signup.';
        setError(errorMessage);
        addToast({
          title: 'Signup Failed',
          message: errorMessage,
          type: 'error'
        });
        synth.current.cancel();
        const errorUtterance = new SpeechSynthesisUtterance(errorMessage);
        synth.current.speak(errorUtterance);
        setLoading(false); // Stop loading on error
      }

    } catch (error) {
      console.error("Signup API error:", error);
      const errorMessage = 'An error occurred while communicating with the server.';
      setError(errorMessage);
      addToast({
        title: 'Connection Error',
        message: errorMessage,
        type: 'error'
      });
      synth.current.cancel();
      const errorUtterance = new SpeechSynthesisUtterance(errorMessage);
      synth.current.speak(errorUtterance);
      setLoading(false); // Stop loading on error
    }
  };

  const statusMessage = (
    step === 1 ? "Step 1: Enter your username." :
    step === 2 ? 
      (loading ? "Step 2: Face Registration. Processing..." :
       faceRegistered ? "Step 2: Face Registration. Face registered successfully." :
       "Step 2: Face Registration. Position your face in the camera view and capture.")
    : ""
  );

  return (
    <div className="auth-container">
      <div role="status" aria-live="polite" className="visually-hidden">
        {statusMessage}
      </div>

      <div className="auth-card">
        <div className={`auth-card-inner ${step === 1 ? '' : step === 2 ? '' : ''}`}>
          <div className="auth-header">
            <div className="bank-logo" aria-hidden="true">
              <FontAwesomeIcon icon={faUniversity} />
            </div>
            <h1>Sign Up</h1>
            <p>{step === 1 ? 'Create Username' : 'Register Face ID'}</p>
          </div>

          <div className="progress-indicator" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`} aria-current={step === 1 ? 'step' : undefined}>
              <div className="step-number">1</div>
              <span className="step-label">Username</span>
            </div>
            <div className="progress-line" aria-hidden="true"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`} aria-current={step === 2 ? 'step' : undefined}>
              <div className="step-number">2</div>
              <span className="step-label">Face ID</span>
            </div>
          </div>
          
          {error && (
            <div className="auth-alert error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}
          
          {success && (
            <div className="auth-alert success" role="status" aria-live="polite">
              {success}
            </div>
          )}

          {/* Step 1: Username */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="auth-form">
               <div className="form-group">
                <FontAwesomeIcon icon={faUserPlus} className="input-icon" aria-hidden="true" />
                 <label htmlFor="username" className="visually-hidden">Username</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  ref={usernameInputRef}
                />
              </div>
             
              <button type="submit" className="auth-button primary">Next: Face ID</button>
            </form>
          )}
          
          {/* Step 2: Face Registration */}
          {step === 2 && (
              <div className="auth-form">
                 <div className="webcam-container">
                    <div className="visually-hidden" aria-live="polite">
                         Webcam view. Position your face in the center.
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
                        aria-label="Webcam feed for face registration"
                    />
                    
                    <button
                        onClick={handleFaceRegistration}
                        disabled={loading || isCapturing || faceRegistered}
                        className={`auth-button ${loading || isCapturing ? 'loading' : ''}`}
                        aria-label={
                           loading || isCapturing ? 'Processing face...' :
                           faceRegistered ? 'Face registered successfully.' :
                           'Capture face for registration.'
                        }
                    >
                         {loading || isCapturing ? [
                            <FontAwesomeIcon key="spinner" icon={faSpinner} spin aria-hidden="true" />,
                            <span key="processing">Processing...</span>
                         ] : faceRegistered ? [
                            <FontAwesomeIcon key="check" icon={faCheck} aria-hidden="true" />,
                            <span key="registered">Face Registered!</span>
                         ] : [
                            <FontAwesomeIcon key="camera" icon={faCamera} aria-hidden="true" />,
                            <span key="capture">Capture Face for Registration</span>
                         ]}
                    </button>
                </div>

                <div className="auth-footer" style={{ marginTop: '2rem' }}>
                    <div className="form-actions">
                        {/* No previous step button in this flow */}
                        <button
                            type="button"
                            className="auth-button primary"
                            onClick={handleSubmit}
                            disabled={loading || !faceRegistered}
                            aria-label={loading && !isCapturing ? 'Signing up...' : 'Complete Signup'}
                        >
                            {loading && !isCapturing ? [
                                <FontAwesomeIcon key="spinner" icon={faSpinner} spin aria-hidden="true" />,
                                <span key="signing">Signing Up...</span>
                            ] : [
                                <FontAwesomeIcon key="user" icon={faUserPlus} aria-hidden="true" />,
                                <span key="complete">Complete Signup</span>
                            ]}
                        </button>
                    </div>
                </div>
              </div>
          )}

          <div className="auth-footer" style={{ marginTop: step !== 2 ? '1.5rem' : '0' }}>
            <p>Already have an account? <Link to="/login" className="auth-link">Login to your account</Link></p>
          </div>
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

export default Signup;