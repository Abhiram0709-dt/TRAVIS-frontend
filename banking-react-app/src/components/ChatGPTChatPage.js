import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  faPauseCircle,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import config from '../config';
import '../styles/ChatGPTChatPage.css';
import { DateTime } from 'luxon';

// API base URL from config
const API_BASE_URL = config.API_BASE_URL;

// Enable/disable development features
const DEV_MODE = config.IS_DEVELOPMENT;

const ChatGPTChatPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'Welcome to Banking Assistant! How can I help you today?',
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

  // Initialize chat
  useEffect(() => {
    // Initialize speech recognition
    initializeSpeechRecognition();

    // Show welcome toast
    addToast({
      title: 'Welcome!',
      message: 'How can I assist with your banking needs today?',
      type: 'success',
      duration: config.TOAST_DURATION.MEDIUM
    });

    // Set theme
    document.body.setAttribute('data-theme', theme);
  }, []);

  // Save message to MongoDB
  const saveMessageToDatabase = useCallback(async (message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: message.content,
          type: message.type,
          time: message.time,
          audioPath: message.audioPath
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }
    } catch (error) {
      console.error('Error saving message:', error);
      addToast({
        title: 'Error',
        message: 'Failed to save message to history',
        type: 'error'
      });
    }
  }, [addToast]);

  // Load chat history from MongoDB
  const loadChatHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        // Add welcome message if no history
        setMessages([{
          id: 'welcome',
          type: 'assistant',
          content: 'Welcome to Banking Assistant! How can I help you today?',
          audioPath: null,
          time: DateTime.now().toISO()
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      addToast({
        title: 'Error',
        message: 'Failed to load chat history',
        type: 'error'
      });
    }
  }, [addToast]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Modified addMessage to save to database
  const addMessage = useCallback((message) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, message];
      // Save to database
      saveMessageToDatabase(message);
      return newMessages;
    });
  }, [saveMessageToDatabase]);

  // Modified clearChat to clear database history
  const clearChat = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      // Reset messages to welcome message
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: 'Welcome to Banking Assistant! How can I help you today?',
        audioPath: null,
        time: DateTime.now().toISO()
      }]);

      addToast({
        title: 'Success',
        message: 'Chat history cleared',
        type: 'success'
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      addToast({
        title: 'Error',
        message: 'Failed to clear chat history',
        type: 'error'
      });
    }
  }, [addToast]);

  // Modified handleDeleteMessage to delete from database
  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/history/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      addToast({
        title: 'Error',
        message: 'Failed to delete message',
        type: 'error'
      });
    }
  }, [addToast]);

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
            }
          } finally {
            // Remove from active requests
            delete activeRequests.current[currentRequestId.current];
            
            // Only reset processing state if this was the current request
            if (currentRequestId.current === messageId) {
              setIsProcessing(false);
              currentRequestId.current = null;
            }
          }
        } else {
          addToast({
            title: 'No Voice Input Detected',
            message: 'Please speak clearly.',
            type: 'info',
            duration: config.TOAST_DURATION.SHORT
          });
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        let errorMessage = 'An error occurred with voice input.';
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errorMessage = 'Please allow microphone access to use voice input.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Could not capture audio. Please check your microphone.';
            break;
          case 'network':
            errorMessage = 'Network error with voice input. Please check your connection.';
            break;
        }
        addToast({
          title: 'Voice Input Error',
          message: errorMessage,
          type: 'error'
        });
      };

      setRecognition(recognitionInstance);
    } catch (e) {
      console.error('Error initializing speech recognition:', e);
      addToast({
        title: 'Voice Input Error',
        message: 'Could not initialize voice input.',
        type: 'error'
      });
    }
  };

  const handleSpeechRecognition = () => {
    if (recognition) {
      if (isRecording) {
        recognition.stop();
      } else {
        // Cancel any active API requests before starting new voice input
        if (currentRequestId.current && activeRequests.current[currentRequestId.current]) {
          activeRequests.current[currentRequestId.current].abort();
          console.log(`Aborted request with ID: ${currentRequestId.current}`);
          delete activeRequests.current[currentRequestId.current];
          currentRequestId.current = null;
          setIsProcessing(false);
        }
        recognition.start();
      }
    }
  };

  const handleSubmit = useCallback(async (message) => {
    if (!message.trim() || isProcessing) return;

    // Abort any ongoing voice recording if a text message is sent
    if (isRecording && recognition) {
      recognition.stop();
    }

    // Create user message object with unique ID
    const messageId = `user-${Date.now()}`;
    const userMsg = {
      id: messageId,
      type: 'user',
      content: message.trim(),
      time: DateTime.now().toLocaleString(DateTime.TIME_SIMPLE)
    };

    // Add user message to chat
    addMessage(userMsg);

    // Show processing notification
    addToast({
      title: 'Message Sent',
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
      console.log('Sending API request for:', message.trim());
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message.trim(),
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
        console.error('Error sending message:', error);

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
          title: 'Request Failed',
          message: 'Could not get response from the server.',
          type: 'error'
        });
      }
    } finally {
      // Remove the request controller from active requests
      delete activeRequests.current[currentRequestId.current];
      currentRequestId.current = null;
      setIsProcessing(false);
    }
  }, [isProcessing, isRecording, recognition, addMessage, autoVoiceOutput, addToast]);

  const playAudio = useCallback((messageId, audioPath) => {
    if (!audioPath) return;

    // Stop any currently playing audio
    if (currentlyPlayingAudio && currentlyPlayingAudio.id !== messageId) {
      pauseAudio(currentlyPlayingAudio.id);
    }

    const audio = audioRefs.current[messageId];

    if (audio) {
      // If audio is already loaded, play it
      if (audio.readyState >= 2) { // Check if audio is ready to play
        audio.play().then(() => {
          setCurrentlyPlayingAudio({ id: messageId, audio: audio });
          console.log(`Playing audio for message ${messageId}`);
        }).catch(error => console.error(`Error playing audio for ${messageId}:`, error));
      } else {
        // If not loaded, wait for it to load and then play
        console.log(`Audio for ${messageId} not ready, waiting for canplaythrough...`);
        audio.oncanplaythrough = () => {
          audio.play().then(() => {
            setCurrentlyPlayingAudio({ id: messageId, audio: audio });
            console.log(`Playing audio for message ${messageId} after load`);
          }).catch(error => console.error(`Error playing audio for ${messageId} after load:`, error));
        };
        audio.load(); // Request audio load
      }

      audio.onended = () => {
        setCurrentlyPlayingAudio(null);
        console.log(`Finished playing audio for message ${messageId}`);
      };

      audio.onerror = (event) => {
        console.error(`Audio error for message ${messageId}:`, event);
        setCurrentlyPlayingAudio(null);
        addToast({
          title: 'Audio Playback Error',
          message: 'Could not play the audio response.',
          type: 'error',
          duration: config.TOAST_DURATION.MEDIUM
        });
      };

    } else {
      // If audio element doesn't exist, create and load it
      console.log(`Creating audio element for message ${messageId} with path ${audioPath}`);
      const newAudio = new Audio(audioPath);
      newAudio.volume = volume;
      audioRefs.current[messageId] = newAudio;
      playAudio(messageId, audioPath); // Try playing again now that the element exists
    }
  }, [currentlyPlayingAudio, volume, addToast]);

  const pauseAudio = useCallback((messageId) => {
    const audio = audioRefs.current[messageId];
    if (audio) {
      audio.pause();
      setCurrentlyPlayingAudio(null);
      console.log(`Paused audio for message ${messageId}`);
    }
  }, []);

  const toggleVoiceOutput = useCallback(() => {
    setAutoVoiceOutput(prev => {
      const newValue = !prev;
      localStorage.setItem('voiceOutput', newValue);
      addToast({
        title: 'Voice Output Toggled',
        message: `Voice output ${newValue ? 'enabled' : 'disabled'}`,
        type: 'info',
        duration: config.TOAST_DURATION.SHORT
      });
      // If disabling, stop any currently playing audio
      if (!newValue && currentlyPlayingAudio) {
        pauseAudio(currentlyPlayingAudio.id);
      }
      return newValue;
    });
  }, [addToast, currentlyPlayingAudio, pauseAudio]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // Update volume of any currently playing audio
    if (currentlyPlayingAudio) {
      currentlyPlayingAudio.audio.volume = newVolume;
    }
  }, [currentlyPlayingAudio]);

  const downloadChatHistory = useCallback(() => {
    if (messages.length <= 1) {
      addToast({
        title: 'No Chat History',
        message: 'There are no messages to download.',
        type: 'info',
        duration: config.TOAST_DURATION.SHORT
      });
      return;
    }

    const historyText = messages.map(msg => {
      const sender = msg.type === 'user' ? 'You' : 'Banking Assistant';
      return `[${msg.time}] ${sender}: ${msg.content}`;
    }).join('\n');

    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chat_history.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast({
      title: 'Download Complete',
      message: 'Chat history downloaded successfully.',
      type: 'success',
      duration: config.TOAST_DURATION.SHORT
    });
  }, [messages, addToast]);

  const isQuestionButNoQuestionMark = (text) => {
    // This is a simple heuristic and might not be perfect
    text = text.trim();
    if (text.length < 5) return false; // Too short to be a complex question
    if (text.endsWith('?')) return false; // Already has a question mark
    if (/[.!?,;:]$/.test(text)) return false; // Ends with other punctuation

    // Look for common question starters (case-insensitive)
    const questionStarters = ['what', 'where', 'when', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'am', 'is', 'are', 'was', 'were'];
    const lowerText = text.toLowerCase();
    if (questionStarters.some(starter => lowerText.startsWith(starter + ' '))) return true;

    // Look for phrases that often indicate a question
    if (lowerText.includes('tell me about') || lowerText.includes('explain') || lowerText.includes('guide me')) return true;

    return false;
  };

  return (
    <div className="chatgpt-layout">
      {/* Sidebar */}
      <div className="chatgpt-sidebar">
        <div className="sidebar-header">
          <button className="new-chat-button">
            <FontAwesomeIcon icon={faPlus} /> New Chat
          </button>
        </div>
        <div className="chat-history">
          {/* Chat history will be populated here */}
        </div>
        <div className="sidebar-footer">
          <button onClick={clearChat} disabled={messages.length <= 1 || isProcessing}>
            <FontAwesomeIcon icon={faTrashAlt} /> Clear Conversations
          </button>
          <button onClick={downloadChatHistory} disabled={messages.length <= 1}>
            <FontAwesomeIcon icon={faDownload} /> Export Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chatgpt-main">
        <div className="chatgpt-message-area" ref={chatBodyRef}>
          <MessageList 
            messages={messages}
            onDeleteMessage={handleDeleteMessage}
            isProcessing={isProcessing}
            processingMessageId={currentRequestId.current}
            showTypingIndicator={isProcessing}
            isPlaying={currentlyPlayingAudio?.id}
            onPlay={playAudio}
            onPause={pauseAudio}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />
          <div ref={messagesEndRef} />
        </div>
        <div className="chatgpt-input-area">
          <ChatInput
            onSubmit={handleSubmit}
            isProcessing={isProcessing}
            isRecording={isRecording}
            handleSpeechRecognition={handleSpeechRecognition}
            toggleVoiceOutput={toggleVoiceOutput}
            autoVoiceOutput={autoVoiceOutput}
            volume={volume}
            handleVolumeChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatGPTChatPage; 