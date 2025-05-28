import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faPaperPlane, faStop } from '@fortawesome/free-solid-svg-icons';

const ChatInput = ({ onSubmit, isProcessing, isRecording, onVoiceInput }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    // Auto-focus the textarea on component mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Auto-resize the textarea
    if (textareaRef.current) {
      autoResizeTextarea();
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      // Call the parent component's submit handler
      onSubmit(message);
      // Clear the input field
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
    // Submit on Enter (but not with Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set the height to the scrollHeight
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  return (
    <div className="input-container">
      <form ref={formRef} onSubmit={handleSubmit} className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="form-control border-0 shadow-none"
          placeholder={isProcessing ? "Please wait..." : isRecording ? "Listening..." : "Type your message here..."}
          rows="1"
          aria-label="Type your message"
          disabled={isProcessing}
        />
        <div className="input-buttons">
          <button
            type="button"
            className={`input-button ${isRecording ? 'recording' : ''}`}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
            onClick={onVoiceInput}
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} />
          </button>
          <button
            type="submit"
            className="input-button"
            aria-label="Send message"
            disabled={!message.trim() || isProcessing}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </form>
      <div id="translationPreview" className="input-preview"></div>
    </div>
  );
};

export default ChatInput; 