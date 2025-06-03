import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faTrash, faExclamationCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { DateTime } from 'luxon';
import '../styles/MessageList.css';

const MessageList = ({ messages, onDeleteMessage, isProcessing, processingMessageId, showTypingIndicator }) => {
  const [processedMessages, setProcessedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const listContainerRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Handle scrolling
  const scrollToBottom = () => {
    if (messagesEndRef.current && !userScrolled) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    if (listContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
      // Check if user has scrolled up (not at bottom)
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setUserScrolled(!isAtBottom);
    }
  };

  // Process messages when they change
  useEffect(() => {
    try {
      setIsLoading(true);
      if (messages && messages.length > 0) {
        const grouped = groupMessagesByDate();
        setProcessedMessages(grouped);
      } else {
        setProcessedMessages([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error processing messages:', err);
      setError('Unable to load messages. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [processedMessages]);

  // Add scroll event listener
  useEffect(() => {
    const listContainer = listContainerRef.current;
    if (listContainer) {
      listContainer.addEventListener('scroll', handleScroll);
      return () => {
        listContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Reset userScrolled when a new message comes in from the assistant
  useEffect(() => {
    // If the last message is from the assistant, reset userScrolled
    if (messages.length > 0 && messages[messages.length - 1].type === 'assistant') {
      setUserScrolled(false);
      scrollToBottom();
    }
  }, [messages]);

  // Handle message deletion
  const handleDeleteMessage = (messageId, messageType) => {
    onDeleteMessage(messageId, messageType);
  };

  // Group messages by date for date separators
  const groupMessagesByDate = () => {
    if (!messages || messages.length === 0) return [];
    
    const groupedMessages = [];
    let currentDate = '';
    
    messages.forEach((message) => {
      if (!message) {
        console.warn('Skipping null/undefined message');
        return;
      }
      
      // Parse the time string to DateTime
      let messageDate;
      try {
        // Handle both DateTime objects and strings
        if (typeof message.time === 'string') {
          // Try to extract date from the time string
          const dateTime = DateTime.fromFormat(message.time, 'h:mm a');
          messageDate = dateTime.toFormat('yyyy-MM-dd');
        } else if (message.time instanceof DateTime) {
          messageDate = message.time.toFormat('yyyy-MM-dd');
        } else {
          messageDate = DateTime.now().toFormat('yyyy-MM-dd');
        }
      } catch (e) {
        console.warn('Failed to parse message time:', e);
        messageDate = DateTime.now().toFormat('yyyy-MM-dd');
      }
      
      // Add date separator if this is a new date
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        const formattedDate = DateTime.fromFormat(messageDate, 'yyyy-MM-dd').toFormat('LLLL d, yyyy');
        groupedMessages.push({
          id: `date-${messageDate}`,
          type: 'date-separator',
          content: formattedDate
        });
      }
      
      groupedMessages.push(message);
    });
    
    return groupedMessages;
  };
  
  // Render loading state
  if (isLoading && !processedMessages.length) {
    return (
      <div className="message-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading conversations...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="message-list-error">
        <FontAwesomeIcon icon={faExclamationCircle} size="2x" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
  
  // Render empty state
  if (!processedMessages || processedMessages.length === 0) {
    return (
      <div className="no-messages">
        <p>No messages yet. Start a conversation with the Banking Assistant.</p>
      </div>
    );
  }

  return (
    <div className="message-list-container">
      <div className="message-list" ref={listContainerRef}>
        <TransitionGroup>
          {processedMessages.map((message) => {
            if (!message) {
              return null;
            }
            
            if (message.type === 'date-separator') {
              return (
                <CSSTransition
                  key={message.id}
                  timeout={500}
                  classNames="message-date"
                >
                  <div className="message-date-separator">{message.content}</div>
                </CSSTransition>
              );
            }
            
            // Check if this message is being processed
            const isProcessingThisMessage = isProcessing && processingMessageId === message.id;
            
            return (
              <CSSTransition
                key={message.id}
                timeout={500}
                classNames="message"
              >
                <div 
                  className={`message ${message.type}-message`}
                  onMouseEnter={() => setHoveredMessage(message.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Log message content before rendering */}
                  {console.log('Rendering message:', message.id, 'Content:', message.content, 'Telugu Content:', message.teluguContent)}
                  <div className="message-header">
                    <div className="message-sender-info">
                      {message.type === 'assistant' && (
                        <div className="message-avatar">
                          <FontAwesomeIcon icon={faRobot} />
                        </div>
                      )}
                      <span className="message-sender">
                        {message.type === 'user' ? 'You' : ''}
                      </span>
                    </div>
                    <div className="message-actions">
                      {message.type === 'user' && hoveredMessage === message.id && (
                        <button 
                          className="delete-message-btn"
                          onClick={() => handleDeleteMessage(message.id, message.type)}
                          aria-label="Delete message"
                          title={message.type === 'user' ? "Delete this question and its answer" : "Delete message"}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="message-body">
                    <div className="message-content">
                      <p className="message-text">{message.content}</p>
                      {message.teluguContent && (
                        <>
                          <div className="telugu-label">Telugu Translation:</div>
                          <p className="message-text telugu-text">{message.teluguContent}</p>
                        </>
                      )}
                      {message.type === 'user' && <div className="shine-effect"></div>}
                    </div>
                    {message.type === 'user' ? (
                      <div className="message-time user-time">
                        <span>{message.time}</span>
                      </div>
                    ) : (
                      <div className="message-footer">
                        <span className="message-time">{message.time}</span>
                        {message.timing && (
                          <div className="message-timing">
                            <span>{message.timing}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CSSTransition>
            );
          })}

          {/* Add typing indicator after the messages if processing */}
          {showTypingIndicator && (
            <CSSTransition
              key="typing-indicator"
              timeout={500}
              classNames="message"
            >
              <div className="typing-indicator-container">
                <div className="typing-indicator">
                  <div className="message-avatar">
                    <FontAwesomeIcon icon={faRobot} />
                  </div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </CSSTransition>
          )}
        </TransitionGroup>
        <div ref={messagesEndRef} />
      </div>
      
      {userScrolled && processedMessages.length > 5 && (
        <button 
          className="scroll-to-bottom-btn"
          onClick={() => {
            setUserScrolled(false);
            scrollToBottom();
          }}
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default MessageList; 