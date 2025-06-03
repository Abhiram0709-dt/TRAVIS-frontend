import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRobot, 
  faUser, 
  faTrashAlt, 
  faDownload, 
  faMicrophone, 
  faPaperPlane, 
  faStop, 
  faVolumeUp, 
  faVolumeMute,
  faPlayCircle,
  faPauseCircle
} from '@fortawesome/free-solid-svg-icons';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import '../styles/ChatPage.css';

// API base URL from config
const API_BASE_URL = config.API_BASE_URL;

// Enable/disable development features
const DEV_MODE = config.IS_DEVELOPMENT;

const ChatPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'Welcome to TRAVIS chat! You can type your message or use voice input. Press Alt + O to enable typing, then press Enter to send message, Alt + V to start voice input, Alt + B to go back to home, Alt + L to logout, and Alt + H for help.',
      audioPath: null,
      time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const chatBodyRef = useRef(null);
  const [autoVoiceOutput, setAutoVoiceOutput] = useState(() => {
    const savedValue = localStorage.getItem('voiceOutput');
    return savedValue !== null ? savedValue !== 'false' : config.DEFAULT_AUTO_VOICE_OUTPUT;
  });
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState(null);
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('audioVolume') || config.DEFAULT_VOLUME.toString());
  });
  const audioRefs = useRef({});
  const messagesEndRef = useRef(null);
  const hasAnnounced = useRef(false);
  const synth = useRef(window.speechSynthesis);
  
  // Use the toast context
  const { addToast } = useToast();
  
  // Use the theme context
  const { theme } = useTheme();
  
  // Track active API requests
  const activeRequests = useRef({});
  const currentRequestId = useRef(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    console.log('Messages updated:', messages);
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Update theme when it changes
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Save volume preference to localStorage
  useEffect(() => {
    localStorage.setItem('audioVolume', volume.toString());
  }, [volume]);
  
  const speak = (text) => {
    if (!autoVoiceOutput) return;
    
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      synth.speak(utterance);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
    }
  };
  
  const addMessage = (message) => {
    console.log('Adding message:', message);
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      console.log('New messages state:', newMessages);
      return newMessages;
    });
  };
  
  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      addToast({
        title: 'Voice Input Not Supported',
        message: 'Your browser does not support voice input',
        type: 'warning',
        duration: config.TOAST_DURATION.MEDIUM
      });
      return false;
    }
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsRecording(true);
        console.log('Speech recognition started');
      };
      
      recognitionInstance.onend = () => {
        setIsRecording(false);
        console.log('Speech recognition ended');
      };
      
      recognitionInstance.onresult = async (event) => {
        console.log('Speech recognition result:', event.results);
        const transcript = event.results[0][0].transcript;
        
        if (transcript.trim()) {
          console.log('Processing voice input:', transcript);
          
          // Format question if needed
          let question = transcript.trim();
          if (isQuestionButNoQuestionMark(question)) {
            question += '?';
          }
          
          // Create user message object with unique ID
          const messageId = `user-${Date.now()}`;
          const userMsg = {
            id: messageId,
            type: 'user',
            content: question,
            time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
          };
          
          // Add user message to chat
          console.log('Adding user message to chat:', userMsg);
          addMessage(userMsg);
          
          // Show processing notification
          addToast({
            title: 'Message Recorded',
            message: 'Processing your request...',
            type: 'success',
            duration: config.TOAST_DURATION.SHORT
          });
          
          // Set processing state
          setIsProcessing(true);
          
          try {
            // Create an AbortController for this request
            const controller = new AbortController();
            const signal = controller.signal;
            
            // Store the controller reference with the message ID
            activeRequests.current[messageId] = controller;
            currentRequestId.current = messageId;
            
            // Make API call
            console.log('Sending API request for:', question);
            const response = await fetch(`${API_BASE_URL}/ask`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: question,
                language: localStorage.getItem('preferredLanguage') || 'en'
              }),
              signal // Pass the abort signal to fetch
            });
            
            // Check if the request was aborted
            if (signal.aborted) {
              console.log('Request was aborted, not processing response');
              return;
            }
            
            const data = await response.json();
            console.log('API response:', data);
            
            // Check again if the request was aborted while waiting for JSON parsing
            if (signal.aborted) {
              console.log('Request was aborted after response, not adding to chat');
              return;
            }
            
            if (data.success) {
              // Create assistant message
              const assistantMsg = {
                id: `assistant-${Date.now()}`,
                type: 'assistant',
                content: data.answer || "I'm sorry, I couldn't generate a text response.",
                audioPath: data.audio_path ? `${API_BASE_URL}${data.audio_path}` : null,
                time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
              };
              
              // Add assistant message to chat
              console.log('Adding assistant response to chat:', assistantMsg);
              addMessage(assistantMsg);
              
              // Play audio if enabled
              if (autoVoiceOutput && data.audio_path) {
                playAudio(assistantMsg.id, `${API_BASE_URL}${data.audio_path}`);
              }
            } else {
              throw new Error(data.error || 'Failed to get response');
            }
          } catch (error) {
            // Only show error if the request wasn't aborted
            if (error.name !== 'AbortError') {
              console.error('Error processing voice input:', error);
              
              // Add error message to chat
              const errorMsg = {
                id: `error-${Date.now()}`,
                type: 'assistant',
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
              };
              addMessage(errorMsg);
              
              // Show error toast
              addToast({
                title: 'Connection Error',
                message: 'Could not connect to the server. Please try again.',
                type: 'error'
              });
            } else {
              console.log('Request was aborted:', error);
            }
          } finally {
            // Remove from active requests
            delete activeRequests.current[messageId];
            
            // Only reset processing state if this was the current request
            if (currentRequestId.current === messageId) {
              setIsProcessing(false);
              currentRequestId.current = null;
            }
          }
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        addToast({
          title: 'Voice Input Error',
          message: 'Please try again or type your message. Error: ' + event.error,
          type: 'error'
        });
      };
      
      setRecognition(recognitionInstance);
      console.log('Speech recognition initialized');
      return true;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      addToast({
        title: 'Voice Input Error',
        message: 'Could not initialize speech recognition',
        type: 'error'
      });
      return false;
    }
  };
  
  const handleSpeechRecognition = useCallback(() => {
    if (!recognition) {
      console.error("Speech recognition not initialized.");
      addToast({ title: 'Error', message: 'Voice input is not ready.', type: 'error' });
      // Attempt to re-initialize if null
      if (!initializeSpeechRecognition()) {
        return; // Return if initialization still fails
      }
    }

    // Use the initialized recognition instance
    const currentRecognition = recognition;
    if (currentRecognition) {
      if (isRecording) {
        console.log('Stopping speech recognition');
        currentRecognition.stop();
        setIsRecording(false);
      } else {
        console.log('Starting speech recognition');
        try {
          currentRecognition.start();
          speak("Listening");
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          setIsRecording(false);
          addToast({
            title: 'Voice Input Error',
            message: 'Could not start voice input. Please try again shortly.',
            type: 'warning'
          });
        }
      }
    }
  }, [recognition, isRecording, addToast]);
  
  const handleSubmit = useCallback(async (message) => {
    if (!message.trim() || isProcessing) return;

    const requestId = Date.now().toString();
    currentRequestId.current = requestId;

    try {
      setIsProcessing(true);

      // Add user message with timing
      const userMsg = {
        id: `user-${requestId}`,
        type: 'user',
        content: message,
        time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
      };
      addMessage(userMsg);

      // Create abort controller for this request
      const controller = new AbortController();
      activeRequests.current[requestId] = controller;

      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: message }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      let combinedMessage = null;
      let timingInfo = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'english') {
              console.log('Processing English message:', data.text);
              if (!combinedMessage) {
                combinedMessage = {
                  id: `response-${requestId}`,
                  type: 'assistant',
                  content: data.text,
                  teluguContent: '',
                  time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
                };
                setMessages(prev => [...prev, combinedMessage]);
              } else {
                setMessages(prev => prev.map(msg => 
                  msg.id === combinedMessage.id 
                    ? { ...msg, content: data.text }
                    : msg
                ));
              }
            } else if (data.type === 'telugu') {
              console.log('Processing Telugu message:', data.text);
              if (combinedMessage) {
                setMessages(prev => prev.map(msg => 
                  msg.id === combinedMessage.id 
                    ? { ...msg, teluguContent: data.text }
                    : msg
                ));
              }
            } else if (data.type === 'complete') {
              console.log('Processing complete message:', data);
              if (data.timing) {
                // Format timing information
                const timing = data.timing;
                timingInfo = `Answer Generation: ${timing.answer_generation.toFixed(2)}s | Translation: ${timing.translation.toFixed(2)}s | Audio: ${timing.audio_generation.toFixed(2)}s | Total: ${timing.total_time.toFixed(2)}s`;
                
                // Add timing info to the message
                setMessages(prev => prev.map(msg => 
                  msg.id === combinedMessage.id 
                    ? { ...msg, timing: timingInfo }
                    : msg
                ));
              }
              if (data.audio_path && autoVoiceOutput) {
                const audioMessageId = `audio-${requestId}`;
                playAudio(audioMessageId, `${API_BASE_URL}${data.audio_path}`);
              }
            } else if (data.type === 'error') {
              console.error('Server error:', data.error);
              setMessages(prev => [...prev, {
                id: `error-${requestId}`,
                type: 'assistant',
                content: `Error: ${data.error}`,
                time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
              }]);
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error:', error);
        setMessages(prev => [...prev, {
          id: `error-${requestId}`,
          type: 'assistant',
          content: `Error: ${error.message}`,
          time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
        }]);
      }
    } finally {
      setIsProcessing(false);
      currentRequestId.current = null;
      delete activeRequests.current[requestId];
    }
  }, [isProcessing, addMessage, autoVoiceOutput]);
  
  const playAudio = useCallback((messageId, audioPath) => {
    // Stop any currently playing audio
    if (currentlyPlayingAudio) {
      const audio = audioRefs.current[currentlyPlayingAudio];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    
    // Create or get audio element
    let audio = audioRefs.current[messageId];
    if (!audio) {
      audio = new Audio(audioPath);
      audio.volume = volume;
      
      // Add event listeners
      audio.addEventListener('ended', () => {
        setCurrentlyPlayingAudio(null);
      });
      
      // Store reference
      audioRefs.current[messageId] = audio;
    }
    
    // Play the audio
    audio.play().catch(error => {
      console.error('Audio playback error:', error);
      
      addToast({
        title: 'Audio Playback Error',
        message: 'Could not play audio response',
        type: 'warning'
      });
    });
    
    setCurrentlyPlayingAudio(messageId);
  }, [volume, addToast, currentlyPlayingAudio]);
  
  const pauseAudio = (messageId) => {
    const audio = audioRefs.current[messageId];
    if (audio) {
      audio.pause();
      setCurrentlyPlayingAudio(null);
    }
  };
  
  const toggleVoiceOutput = () => {
    const newValue = !autoVoiceOutput;
    setAutoVoiceOutput(newValue);
    localStorage.setItem('voiceOutput', newValue.toString());
    
    addToast({
      title: newValue ? 'Voice Output Enabled' : 'Voice Output Disabled',
      message: newValue 
        ? 'Responses will be read aloud' 
        : 'Responses will be shown as text only',
      type: 'info',
      duration: config.TOAST_DURATION.SHORT
    });
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    // Update volume for all audio elements
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.volume = newVolume;
      }
    });
  };
  
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      // Stop any playing audio
      if (currentlyPlayingAudio) {
        const audio = audioRefs.current[currentlyPlayingAudio];
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        setCurrentlyPlayingAudio(null);
      }
      
      // Abort any active requests
      Object.values(activeRequests.current).forEach(controller => {
        controller.abort();
      });
      activeRequests.current = {};
      currentRequestId.current = null;
      setIsProcessing(false);
      
      setMessages([
        {
          id: 'welcome',
          type: 'assistant',
          content: 'Welcome to TRAVIS chat! You can type your message or use voice input. Press Alt + O to enable typing, then press Enter to send message, Alt + V to start voice input, Alt + B to go back to home, Alt + L to logout, and Alt + H for help.',
          audioPath: null,
          time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
        }
      ]);
      
      // Clear audio references
      audioRefs.current = {};
      
      addToast({
        title: 'Chat Cleared',
        message: 'Your chat history has been cleared',
        type: 'info',
        duration: config.TOAST_DURATION.SHORT
      });
    }
  };
  
  const handleDeleteMessage = (messageId) => {
    // If this is the message with an active request, abort it
    if (activeRequests.current[messageId]) {
      console.log('Aborting request for deleted message:', messageId);
      activeRequests.current[messageId].abort();
      delete activeRequests.current[messageId];
      
      // Reset processing state if this was the current request
      if (currentRequestId.current === messageId) {
        setIsProcessing(false);
        currentRequestId.current = null;
      }
    }
    
    // Get the message to be deleted
    const messageToDelete = messages.find(msg => msg.id === messageId);
    
    // If it's a user message, we also need to find and delete the corresponding answer
    if (messageToDelete && messageToDelete.type === 'user') {
      setMessages(prevMessages => {
        const msgIndex = prevMessages.findIndex(msg => msg.id === messageId);
        
        // If the message is found and it's not the last message
        if (msgIndex !== -1 && msgIndex < prevMessages.length - 1) {
          // Check if the next message is an assistant response
          const nextMessage = prevMessages[msgIndex + 1];
          if (nextMessage && nextMessage.type === 'assistant') {
            // It's an answer to the deleted question, remove both
            console.log('Removing question and its answer:', messageId, nextMessage.id);
            
            // Clean up audio for answer if it exists
            if (audioRefs.current[nextMessage.id]) {
              const audio = audioRefs.current[nextMessage.id];
              audio.pause();
              audio.currentTime = 0;
              delete audioRefs.current[nextMessage.id];
              
              // Reset current audio playing if needed
              if (currentlyPlayingAudio === nextMessage.id) {
                setCurrentlyPlayingAudio(null);
              }
            }
            
            // Show toast for deleting both question and answer
            addToast({
              title: 'Messages Deleted',
              message: 'Question and its answer have been removed',
              type: 'info',
              duration: config.TOAST_DURATION.SHORT
            });
            
            // Filter out both the question and its answer
            return prevMessages.filter((_, index) => index !== msgIndex && index !== msgIndex + 1);
          }
        }
        
        // No matching answer found, just remove the question
        addToast({
          title: 'Message Deleted',
          message: 'The question has been removed from the chat',
          type: 'info',
          duration: config.TOAST_DURATION.SHORT
        });
        
        // Otherwise just remove the message itself
        return prevMessages.filter(msg => msg.id !== messageId);
      });
    } else {
      // Just remove the single message (not a user question)
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      // Show standard toast for single message deletion
      addToast({
        title: 'Message Deleted',
        message: 'The question has been removed from the chat',
        type: 'info',
        duration: config.TOAST_DURATION.SHORT
      });
    }
    
    // Remove audio reference if it exists
    if (audioRefs.current[messageId]) {
      const audio = audioRefs.current[messageId];
      audio.pause();
      audio.currentTime = 0;
      delete audioRefs.current[messageId];
    }
    
    // If this was the currently playing audio, reset the state
    if (currentlyPlayingAudio === messageId) {
      setCurrentlyPlayingAudio(null);
    }
  };
  
  const downloadChatHistory = () => {
    const messagesText = messages.map(msg => {
      return `[${msg.time}] ${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    }).join('\n\n');
    
    const blob = new Blob([messagesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${DateTime.now().toFormat('yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addToast({
      title: 'Download Complete',
      message: 'Chat history has been downloaded to your device',
      type: 'success',
      duration: config.TOAST_DURATION.SHORT
    });
  };
  
  // Helper function to check if text is a question without question mark
  const isQuestionButNoQuestionMark = (text) => {
    const questionStarters = [
      'what', 'how', 'why', 'when', 'where', 'which', 'who', 'whom', 'whose',
      'can', 'could', 'will', 'would', 'should', 'may', 'might', 'is', 'are',
      'am', 'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'shall'
    ];
    
    const lowerText = text.toLowerCase();
    return !text.endsWith('?') && 
           questionStarters.some(starter => 
              lowerText.startsWith(starter + ' ') || 
              lowerText === starter
           );
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + O: Enable typing
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        const textarea = document.querySelector('textarea.form-control');
        if (textarea) {
          textarea.focus();
          textarea.disabled = false;
          speak("Chat input enabled. Type your message and press Enter to send.");
        }
      }
      
      // Alt + V: Toggle voice and start recording
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (!isRecording) {
          handleSpeechRecognition();
        }
      }

      // Alt + B: Go back to home
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        navigate('/');
        speak("Going back to home page");
      }

      // Alt + L: Logout
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (isAuthenticated) {
          logout();
          navigate('/');
          speak("Logged out successfully");
          addToast({
            title: 'Logged Out',
            message: 'You have been logged out successfully',
            type: 'success',
            duration: config.TOAST_DURATION.MEDIUM
          });
        } else {
          speak("You are not logged in");
          addToast({
            title: 'Not Logged In',
            message: 'You are not currently logged in',
            type: 'warning',
            duration: config.TOAST_DURATION.MEDIUM
          });
        }
      }

      // Alt + H: Help
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        speak("Available shortcuts: Alt + O to enable typing, then press Enter to send message, Alt + V to start voice input, Alt + B to go back to home, Alt + L to logout, and Alt + H for help.");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, handleSubmit, handleSpeechRecognition, navigate, isAuthenticated, addToast, logout]);

  // Initialize chat
  useEffect(() => {
    // Initialize speech recognition
    initializeSpeechRecognition();
    
    // Speak welcome message only once
    if (!hasAnnounced.current) {
      // Cancel any ongoing speech
      synth.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance("Welcome to TRAVIS chat. Press Alt + H for help.");
      synth.current.speak(utterance);
      hasAnnounced.current = true;
    }
    
    // Show welcome toast
    addToast({
      title: 'Welcome!',
      message: 'How can I assist with your banking needs today?',
      type: 'success',
      duration: config.TOAST_DURATION.MEDIUM
    });
    
    // Set theme
    document.body.setAttribute('data-theme', theme);

    // Clean up
    return () => {
      synth.current.cancel();
      hasAnnounced.current = false;
    };
  }, []);

  return (
    <main id="main-content" className="main-container">
      <div className="chat-container">
        <div className="chat-header">
          <div className="d-flex justify-content-between align-items-center">
            <div className="chat-header-title">
              <span className="status-indicator"></span>
              <FontAwesomeIcon icon={faRobot} className="me-2" />
              <span>Banking Assistant</span>
            </div>
            <div className="chat-controls">
              <button 
                onClick={clearChat} 
                aria-label="Clear chat"
                disabled={isProcessing}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
              <button 
                onClick={downloadChatHistory} 
                aria-label="Download chat"
                disabled={isProcessing}
              >
                <FontAwesomeIcon icon={faDownload} />
              </button>
            </div>
          </div>
        </div>

        <div className="chat-body" ref={chatBodyRef}>
          <MessageList 
            messages={messages}
            onDeleteMessage={handleDeleteMessage}
            isProcessing={isProcessing}
            processingMessageId={currentRequestId.current}
            showTypingIndicator={isProcessing}
          />
        </div>

        <ChatInput 
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          isRecording={isRecording}
          onVoiceInput={handleSpeechRecognition}
        />
      </div>
      
      <div className="sr-only" aria-live="polite" id="sr-announcer"></div>
    </main>
  );
};

export default ChatPage;