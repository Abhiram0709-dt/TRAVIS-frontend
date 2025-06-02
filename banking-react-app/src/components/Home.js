import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { 
  faRobot,
  faUser,
  faSignOutAlt,
  faCog,
  faChevronDown,
  faMoon,
  faSun,
  faArrowDown,
  faCheckCircle,
  faLanguage,
  faComments,
  faClock,
  faBrain,
  faVolumeUp,
  faShieldAlt,
  faTachometerAlt,
  faPaperPlane,
  faPlay,
  faMicrophone,
  faKeyboard,
  faChartLine,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { 
  faGithub,
  faLinkedin,
  faTwitter
} from '@fortawesome/free-brands-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Home = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [reviews, setReviews] = useState([]);
    const [showReviewSuccess, setShowReviewSuccess] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme, isHighContrast } = useTheme();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const profileRef = useRef(null);
    const statsRef = useRef(null);
    const featuresRef = useRef(null);
    const aboutRef = useRef(null);
    const contactRef = useRef(null);
    const [isTTSEnabled, setIsTTSEnabled] = useState(true);
    const synth = window.speechSynthesis;
    const voices = useRef([]);

    useEffect(() => {
        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: false,
            mirror: true,
            offset: 50
        });

        // Fetch reviews from API
        const fetchReviews = async () => {
            try {
                const response = await fetch(`${API_URL}/api/reviews?limit=3&sort_by=newest`);
                if (!response.ok) throw new Error('Failed to fetch reviews');
                const data = await response.json();
                if (data.success) {
                    setReviews(data.reviews);
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };

        fetchReviews();

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
            
            // Update active section based on scroll position
            const sections = ['hero', 'stats', 'features', 'about', 'contact'];
            const currentSection = sections.find(section => {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    return rect.top <= 100 && rect.bottom >= 100;
                }
                return false;
            });
            
            if (currentSection) {
                setActiveSection(currentSection);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleGetStarted = () => {
        if (isAuthenticated) {
            navigate('/chat');
        } else {
            navigate('/login');
            addToast({
                title: 'Authentication Required',
                message: 'Please login to access the chat interface',
                type: 'info'
            });
        }
    };

    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        await logout();
        addToast({
            title: 'Logged Out',
            message: 'You have been successfully logged out',
            type: 'success'
        });
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            addToast({
                title: 'Authentication Required',
                message: 'Please login to submit a review',
                type: 'warning'
            });
            navigate('/login');
            return;
        }

        if (rating === 0) {
            addToast({
                title: 'Rating Required',
                message: 'Please select a rating before submitting',
                type: 'warning'
            });
            return;
        }

        const reviewData = {
            user_id: user.id,
            username: user.username,
            rating: rating,
            message: reviewText
        };

        // Log the API URL and review data
        console.log('API URL:', `${API_URL}/api/reviews`);
        console.log('Review data:', reviewData);
        console.log('Auth token:', localStorage.getItem('token'));

        try {
            // First, check if the API server is reachable
            const healthCheck = await fetch(`${API_URL}/test`);
            if (!healthCheck.ok) {
                throw new Error('API server is not responding. Please check if the server is running.');
            }

            const response = await fetch(`${API_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(reviewData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            if (data.success) {
                // Show success message
                setShowReviewSuccess(true);
                setTimeout(() => setShowReviewSuccess(false), 3000);

                // Reset form
                setRating(0);
                setReviewText('');

                // Refresh reviews
                const reviewsResponse = await fetch(`${API_URL}/api/reviews?limit=3&sort_by=newest`);
                if (reviewsResponse.ok) {
                    const reviewsData = await reviewsResponse.json();
                    if (reviewsData.success) {
                        setReviews(reviewsData.reviews);
                    }
                }
            } else {
                throw new Error(data.message || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            // More specific error messages based on the error type
            let errorMessage = 'Failed to submit review. Please try again.';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to the server. Please check if the server is running.';
            } else if (error.message.includes('not responding')) {
                errorMessage = 'Server is not responding. Please try again later.';
            }

            addToast({
                title: 'Error',
                message: errorMessage,
                type: 'error'
            });
        }
    };

    // Initialize speech synthesis
    useEffect(() => {
        const loadVoices = () => {
            voices.current = synth.getVoices();
            if (voices.current.length === 0) {
                synth.onvoiceschanged = () => {
                    voices.current = synth.getVoices();
                    speakWelcomeMessage();
                };
            } else {
                speakWelcomeMessage();
            }
        };

        loadVoices();

        // Backup initialization after a short delay
        const timeoutId = setTimeout(() => {
            if (voices.current.length === 0) {
                loadVoices();
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, []);

    const speakWelcomeMessage = () => {
        const welcomeText = "Welcome to TRAVIS. Press Alt + H for help.";
        speak(welcomeText);
    };

    const speak = (text) => {
        if (!isTTSEnabled) return;
        
        try {
            // Cancel any ongoing speech
            synth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Try to use a female voice
            const femaleVoice = voices.current.find(voice => voice.name.includes('female'));
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            synth.speak(utterance);
        } catch (error) {
            console.error('Error in speech synthesis:', error);
        }
    };

    // Add keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Alt + C: Go to chat page
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                navigate('/chat');
            }
            
            // Alt + L: Login/Logout based on auth status
            if (e.altKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                if (isAuthenticated) {
                    handleLogout();
                } else {
                    navigate('/login');
                }
            }
            
            // Alt + S: Go to signup page (only when not authenticated)
            if (e.altKey && e.key.toLowerCase() === 's' && !isAuthenticated) {
                e.preventDefault();
                navigate('/signup');
            }
            
            // Alt + H: Help
            if (e.altKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                const helpMessage = isAuthenticated 
                    ? "Available shortcuts: Alt + C to go to chat page, Alt + L to logout, and Alt + H for help."
                    : "Available shortcuts: Alt + C to go to chat page, Alt + L to login, Alt + S to signup, and Alt + H for help.";
                speak(helpMessage);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigate, isAuthenticated]);

    return (
        <div className="home">
            {/* Navigation */}
            <nav className={`navbar navbar-expand-lg navbar-dark ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container">
                    <Link className="navbar-brand" to="/">
                        <FontAwesomeIcon icon={faRobot} className="me-2" />
                        TRAVIS
                    </Link>
                    <div className="d-flex align-items-center">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'features' ? 'active' : ''}`} 
                                    href="#features"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('features');
                                    }}
                                >
                                    Features
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'stats' ? 'active' : ''}`} 
                                    href="#stats"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('stats');
                                    }}
                                >
                                    Stats
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} 
                                    href="#about"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('about');
                                    }}
                                >
                                    About
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`} 
                                    href="#contact"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('contact');
                                    }}
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                        
                        {isAuthenticated && user && (
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
                        
                        {!isAuthenticated && (
                            <>
                                <Link className="nav-link" to="/login">
                                    <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                                    Login
                                </Link>
                                <Link className="nav-link" to="/signup">
                                    <FontAwesomeIcon icon={faUser} className="me-1" />
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero" id="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1>
                            <FontAwesomeIcon icon={faRobot} className="me-3" />
                            TRAVIS
                        </h1>
                        <p className="hero-subtitle">Transformer Based Help Desk for Visually Impaired Service Agents</p>
                        <p className="hero-description">
                            Empowering bank representatives with AI-powered assistance for seamless customer service
                        </p>
                        <div className="hero-features">
                            <div className="feature-pill">
                                <FontAwesomeIcon icon={faMicrophone} />
                                <span>Voice Input</span>
                            </div>
                            <div className="feature-pill">
                                <FontAwesomeIcon icon={faKeyboard} />
                                <span>Text Input</span>
                            </div>
                            <div className="feature-pill">
                                <FontAwesomeIcon icon={faChartLine} />
                                <span>Real-time Analysis</span>
                            </div>
                        </div>
                        <button onClick={handleGetStarted} className="cta-button">
                            {isAuthenticated ? (
                                <>
                                    <FontAwesomeIcon icon={faComments} className="me-2" />
                                    Go to Chat
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                                    Get Started
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* Demo Section */}
            <section className="demo-section" id="demo">
                <div className="container">
                    <h2 className="section-title">See TRAVIS in Action</h2>
                    <div className="demo-container" data-aos="fade-up">
                        <div className="demo-preview">
                            <div className="demo-header">
                                <div className="demo-controls">
                                    <span className="control-dot"></span>
                                    <span className="control-dot"></span>
                                    <span className="control-dot"></span>
                                </div>
                                <div className="demo-title">TRAVIS Demo</div>
                            </div>
                            <div className="demo-content">
                                <div className="demo-message user">
                                    <div className="message-content">
                                        What's the process to activate card my ATM card? Please guide me.
                                    </div>
                                </div>
                                <div className="demo-message assistant">
                                    <div className="message-content">
                                        The procedure to activate your atm card:
                                        1. Follow the instruction to Visit your nearest bank ATM with your new ATM card.
                                        2. It is important to Insert the ATM card into the machine and select the "Activate Card" option.
                                        3. Make sure to Enter the required details, such as your account number or temporary PIN if provided.
                                        4. You must Set a new 4-digit or 6-digit PIN as instructed on the screen.
                                        5. Do not forget to Complete the activation process and wait for the confirmation message before removing your card.
                                    </div>
                                </div>
                                <div className="demo-message user">
                                    <div className="message-content">
                                        I need instructions to apply loan personal my account?
                                    </div>
                                </div>
                                <div className="demo-message assistant">
                                    <div className="message-content">
                                        Below are the steps to apply for a personal loan:
                                        1. Make sure to Visit your bank s website or mobile app and log in to your account.
                                        2. Make sure to Navigate to the Loan Services or Personal Loan section.
                                        3. Proceed to Choose the loan amount, tenure, and purpose of the loan (e.g., debt consolidation, medical expenses, home renovation).
                                        4. It is important to Fill in the application form with required personal, financial, and employment details (e.g., ID proof, income proof, employment letter).
                                        5. Proceed to Submit your application; you will receive a reference number, and the bank will notify you about document verification, loan approval, and next steps.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="demo-features">
                            <div className="demo-feature" data-aos="fade-up" data-aos-delay="100">
                                <FontAwesomeIcon icon={faMicrophone} className="feature-icon" />
                                <h3>Voice Input</h3>
                                <p>Speak naturally to interact with TRAVIS</p>
                            </div>
                            <div className="demo-feature" data-aos="fade-up" data-aos-delay="200">
                                <FontAwesomeIcon icon={faBrain} className="feature-icon" />
                                <h3>Smart Responses</h3>
                                <p>Context-aware answers for better assistance</p>
                            </div>
                            <div className="demo-feature" data-aos="fade-up" data-aos-delay="300">
                                <FontAwesomeIcon icon={faShieldAlt} className="feature-icon" />
                                <h3>Secure & Reliable</h3>
                                <p>Bank-grade security for all interactions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="section" ref={statsRef}>
                <div className="container">
                    <h2 className="section-title">Our Impact</h2>
                    <div className="row g-4">
                        <div className="col-md-3">
                            <div className="stats-card" data-aos="fade-up">
                                <FontAwesomeIcon icon={faCheckCircle} className="stats-icon" />
                                <div className="stats-number">95%</div>
                                <div className="stats-label">Query Accuracy</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stats-card" data-aos="fade-up" data-aos-delay="100">
                                <FontAwesomeIcon icon={faLanguage} className="stats-icon" />
                                <div className="stats-number">1</div>
                                <div className="stats-label">Language Support</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stats-card" data-aos="fade-up" data-aos-delay="200">
                                <FontAwesomeIcon icon={faComments} className="stats-icon" />
                                <div className="stats-number">100+</div>
                                <div className="stats-label">Queries Handled</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stats-card" data-aos="fade-up" data-aos-delay="300">
                                <FontAwesomeIcon icon={faClock} className="stats-icon" />
                                <div className="stats-number">24/7</div>
                                <div className="stats-label">Support</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="section bg-light" ref={featuresRef}>
                <div className="container">
                    <h2 className="section-title">Key Features</h2>
                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="feature-card" data-aos="fade-up">
                                <FontAwesomeIcon icon={faBrain} className="feature-icon" />
                                <h3>Transformer-Based AI</h3>
                                <p>Advanced transformer models for accurate query processing and response generation.</p>
                                <ul className="feature-list">
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Natural Language Understanding</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Context-Aware Responses</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Continuous Learning</li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="100">
                                <FontAwesomeIcon icon={faLanguage} className="feature-icon" />
                                <h3>Language Support</h3>
                                <p>Currently supporting English with plans for additional languages in the future.</p>
                                <ul className="feature-list">
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> English Language Support</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Clear Communication</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Easy to Understand</li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="200">
                                <FontAwesomeIcon icon={faVolumeUp} className="feature-icon" />
                                <h3>Voice Assistance</h3>
                                <p>Integrated text-to-speech functionality for easy communication.</p>
                                <ul className="feature-list">
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> High-Quality Voice Synthesis</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Clear Pronunciation</li>
                                    <li><FontAwesomeIcon icon={faCheckCircle} /> Adjustable Speech Rate</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-5">
                        <button onClick={handleGetStarted} className="cta-button">
                            {isAuthenticated ? (
                                <>
                                    <FontAwesomeIcon icon={faComments} className="me-2" />
                                    Start Chatting
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                                    Try Now
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="section" ref={aboutRef}>
                <div className="container">
                    <h2 className="section-title">About TRAVIS</h2>
                    <div className="row">
                        <div className="col-lg-8 mx-auto">
                            <div className="about-content" data-aos="fade-up">
                                <p className="text-center">
                                    TRAVIS is an innovative AI system designed to empower visually impaired bank representatives 
                                    in handling customer queries efficiently. Our system processes input queries, classifies them 
                                    into standardized categories, and provides clear, concise responses.
                                </p>
                                <p className="text-center">
                                    Built using advanced transformer-based models, TRAVIS focuses on providing 
                                    accurate, timely responses while ensuring accessibility for visually impaired service agents.
                                </p>
                                <div className="about-features">
                                    <div className="row g-4 mt-4">
                                        <div className="col-md-6">
                                            <div className="about-feature-item" data-aos="fade-up" data-aos-delay="100">
                                                <FontAwesomeIcon icon={faShieldAlt} />
                                                <h4>Secure & Reliable</h4>
                                                <p>Bank-grade security with encrypted communications</p>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="about-feature-item" data-aos="fade-up" data-aos-delay="200">
                                                <FontAwesomeIcon icon={faTachometerAlt} />
                                                <h4>High Performance</h4>
                                                <p>Fast response times with minimal latency</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-4">
                                    <button onClick={handleGetStarted} className="cta-button">
                                        {isAuthenticated ? (
                                            <>
                                                <FontAwesomeIcon icon={faComments} className="me-2" />
                                                Start Chatting
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faUser} className="me-2" />
                                                Join Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="section bg-light" ref={contactRef}>
                <div className="container">
                    <h2 className="section-title">Share Your Experience</h2>
                    <div className="row">
                        <div className="col-lg-6 mx-auto">
                            <form className="contact-form" data-aos="fade-up" onSubmit={handleReviewSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Your Rating</label>
                                    <div className="rating-stars">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <FontAwesomeIcon
                                                key={star}
                                                icon={faStar}
                                                className={`star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Your Review</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="5" 
                                        placeholder="Share your experience with TRAVIS"
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        required
                                    ></textarea>
                                </div>
                                <button type="submit" className="cta-button">
                                    <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                                    Submit Review
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Review Success Popup */}
            {showReviewSuccess && (
                <div className="review-success-popup">
                    <div className="popup-content">
                        <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
                        <h3>Thank You!</h3>
                        <p>Your review has been submitted successfully.</p>
                    </div>
                </div>
            )}

            {/* Reviews Section - Only shown when there are reviews */}
            {reviews && reviews.length > 0 && (
                <section id="reviews" className="section">
                    <div className="container">
                        <h2 className="section-title">What Our Users Say</h2>
                        <div className="row g-4">
                            {reviews.slice(0, 3).map(review => (
                                <div key={review.id} className="col-md-4">
                                    <div className="review-card" data-aos="fade-up">
                                        <div className="review-header">
                                            <div className="reviewer-avatar">
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                            <div className="reviewer-info">
                                                <h4>{review.name}</h4>
                                                <div className="review-rating">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FontAwesomeIcon 
                                                            key={i} 
                                                            icon={faStar} 
                                                            className={i < review.rating ? 'active' : ''}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="review-text">{review.message}</p>
                                        <div className="review-date">
                                            {new Date(review.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-5">
                            <Link to="/reviews" className="cta-button">
                                <FontAwesomeIcon icon={faComments} className="me-2" />
                                View All Reviews
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="row">
                        <div className="col-md-4">
                            <h4>
                                <FontAwesomeIcon icon={faRobot} className="me-2" />
                                TRAVIS
                            </h4>
                            <p>Empowering visually impaired service agents with AI technology.</p>
                        </div>
                        <div className="col-md-4">
                            <h5>Quick Links</h5>
                            <ul className="footer-links">
                                <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
                                <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a></li>
                                <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a></li>
                                <li><Link to="/login">Login</Link></li>
                            </ul>
                        </div>
                        <div className="col-md-4">
                            <h5>Connect With Us</h5>
                            <div className="social-links">
                                <a href="https://github.com/Abhiram0709-dt/TRAVIS" target="_blank" rel="noopener noreferrer">
                                    <FontAwesomeIcon icon={faGithub} />
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer">
                                    <FontAwesomeIcon icon={faLinkedin} />
                                </a>
                                <a href="#" target="_blank" rel="noopener noreferrer">
                                    <FontAwesomeIcon icon={faTwitter} />
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} TRAVIS. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home; 