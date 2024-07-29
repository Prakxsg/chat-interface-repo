import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './ChatInterface.css';

const socket = io('http://localhost:3001');

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingMessage, setTypingMessage] = useState('');
  const [userId] = useState(uuidv4());
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('typing', (data) => {
      setTypingMessage(data ? `${data.username} is typing...` : '');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingMessage('');
      }, 3000); // Clear the typing indicator after 3 seconds of inactivity
    });

    socket.on('stop typing', () => {
      setTypingMessage('');
    });

    return () => {
      socket.off('message');
      socket.off('typing');
      socket.off('stop typing');
    };
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket.emit('typing', { userId, username: 'User' + userId.slice(0, 4), isTyping: e.target.value.length > 0 });
  };

  const handleInputBlur = () => {
    socket.emit('stop typing');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const messageType = file.type.startsWith('image/') ? 'image' :
                            file.type.startsWith('video/') ? 'video' :
                            file.type === 'application/pdf' ? 'pdf' : 'unknown';
        const message = { 
          type: messageType, 
          content: reader.result, 
          userId, 
          username: 'User' + userId.slice(0, 4), 
          timestamp: new Date().toLocaleTimeString() 
        };
        socket.emit('message', message);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkPreview = (link) => {
    return {
      title: link,
      description: 'Link preview not available',
      thumbnail: 'https://via.placeholder.com/150'
    };
  };

  const sendMessage = () => {
    if (input.trim()) {
      const message = { 
        type: 'text', 
        content: input, 
        userId, 
        username: 'User' + userId.slice(0, 4), 
        timestamp: new Date().toLocaleTimeString() 
      };
      socket.emit('message', message);
      setInput('');
      socket.emit('stop typing');
    }
  };

  const renderMessage = (message) => {
    if (message.type === 'image') {
      return <img src={message.content} alt="preview" />;
    }
    if (message.type === 'video') {
      return <video controls src={message.content} />;
    }
    if (message.type === 'pdf') {
      return (
        <iframe
          src={message.content}
          width="100%"
          height="500px"
          title="PDF Preview"
          frameBorder="0"
        ></iframe>
      );
    }
    if (message.type === 'link') {
      const preview = handleLinkPreview(message.content);
      return (
        <div className="link-preview">
          <img src={preview.thumbnail} alt="thumbnail" />
          <div>
            <strong>{preview.title}</strong>
            <p>{preview.description}</p>
          </div>
        </div>
      );
    }
    return <div>{message.content}</div>;
  };

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <div className="message-header">
              <span className="username">{msg.username}</span>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <div className="message-content">
              {renderMessage(msg)}
            </div>
          </div>
        ))}
        <div className="typing-indicator">{typingMessage}</div>
      </div>
      <div className="input">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current.click()}>Attach</button>
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatInterface;
