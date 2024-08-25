import React, { useState } from 'react';

interface ChatBoxProps {
  messages: { sender: string; text: string }[];
  input: string;
  setInput: (input: string) => void;
  handleSendMessage: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, input, setInput, handleSendMessage }) => {
  return (
    <div className="chat-box">
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความของคุณที่นี่..."
        />
        <button onClick={handleSendMessage}>ส่ง</button>
      </div>
    </div>
  );
};
