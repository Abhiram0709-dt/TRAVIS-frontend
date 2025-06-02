import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons';

const VoiceChat = ({ className = '', onMessageSent }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ctrl + Shift + C: Focus chat
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                document.getElementById('chatInput').focus();
            }
            
            // Ctrl + Shift + Q: Toggle voice
            if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
                e.preventDefault();
                setIsSpeaking(!isSpeaking);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isSpeaking]);

    const handleSend = async () => {
        if (!message.trim()) return;

        // Add user message to chat
        const userMessage = { text: message, sender: 'user' };
        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');

        // Notify parent component if callback provided
        if (onMessageSent) {
            onMessageSent(message);
        }

        try {
            // Send to your FastAPI backend
            const response = await axios.post('/ask', {
                question: message
            });

            if (response.data.success) {
                // Add bot response to chat
                const botMessage = { 
                    text: response.data.answer, 
                    sender: 'bot',
                    audioUrl: response.data.audio_path 
                };
                setChatHistory(prev => [...prev, botMessage]);

                // Play audio if available and voice is enabled
                if (isSpeaking && response.data.audio_path) {
                    const audio = new Audio(response.data.audio_path);
                    audio.play();
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setChatHistory(prev => [...prev, {
                text: 'Sorry, there was an error processing your request.',
                sender: 'bot'
            }]);
        }
    };

    const handleDeleteMessage = (index) => {
        setChatHistory(prev => prev.filter((_, i) => i !== index));
    };

    const handleDownloadAudio = (audioUrl) => {
        if (audioUrl) {
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = 'response.mp3';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className={`chat-container ${className}`}>
            <div className="chat-header">
                <h2>AI Assistant</h2>
                <div className="voice-toggle" onClick={() => setIsSpeaking(!isSpeaking)}>
                    <FontAwesomeIcon 
                        icon={isSpeaking ? faVolumeUp : faVolumeMute} 
                        className={isSpeaking ? 'voice-active' : 'voice-inactive'}
                    />
                </div>
            </div>

            <div className="chat-messages">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}-message`}>
                        {msg.text}
                        <div className="message-actions">
                            {msg.sender === 'bot' && msg.audioUrl && (
                                <button 
                                    className="message-action-btn"
                                    onClick={() => handleDownloadAudio(msg.audioUrl)}
                                    title="Download Audio"
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                </button>
                            )}
                            <button 
                                className="message-action-btn"
                                onClick={() => handleDeleteMessage(index)}
                                title="Delete Message"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="chat-input">
                <input
                    id="chatInput"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default VoiceChat; 