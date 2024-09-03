import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faPaperPlane, faTimes, faUser } from "@fortawesome/free-solid-svg-icons";
import "./ChatBotWindow_styles.css";

interface ChatBotWindowProps {
  token: string | null;
}

const ChatBotWindow: React.FC<ChatBotWindowProps> = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(() => {
    const savedMessages = token
      ? localStorage.getItem(`messages_${token}`)
      : localStorage.getItem("messages");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("sessionId", sessionId);
    } else {
      localStorage.removeItem("sessionId");
    }
  }, [sessionId]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(`messages_${token}`, JSON.stringify(messages));
    } else {
      localStorage.setItem("messages", JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, token]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleChatWindow = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);

    const userMessage = { sender: "user", text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await axios.post(
        "http://localhost:3001/api/chat",
        { message: input, sessionId },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const botMessage = {
        sender: "bot",
        text: response.data.reply
          .replace(/\\n/g, "<br>") // แปลง \n เป็น <br>
          .replace(/(\d+)\.\s/g, "<li>") // แปลงตัวเลขและจุดให้เป็น <li>
          .replace(/<li>/g, "<li style='margin-bottom: 10px;'>") // เพิ่มการเว้นวรรคระหว่างบรรทัดด้วย margin-bottom
      };

      setMessages([...newMessages, botMessage]);

      if (!sessionId) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = { sender: "bot", text: "ขออภัย ไม่สามารถตอบกลับได้ในขณะนี้" };
      setMessages([...newMessages, errorMessage]);
    }

    setInput("");
    setIsSending(false);
  };

  const handleNavigateHome = () => {
    navigate("/home"); // เปลี่ยนเส้นทางไปยังหน้า HomePage.tsx โดยใช้ path ที่ถูกต้อง
  };

  return (
    <div className="chatbot-container">
      <button className="chat-toggle-button" onClick={toggleChatWindow}>
        {isOpen ? <FontAwesomeIcon icon={faTimes} /> : <FontAwesomeIcon icon={faRobot} />}
      </button>
      {isOpen && (
        <div className="chatbot-window">
          <div className="chat-header">
            <h3>ChatBot</h3>
            <button className="home-button" onClick={handleNavigateHome}>
              <FontAwesomeIcon icon={faRobot} />
            </button>
          </div>
          <div className="chat-body">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-2`}>
                <div className={`message ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}>
                  <FontAwesomeIcon icon={msg.sender === "user" ? faUser : faRobot} className="icon" />
                  <p dangerouslySetInnerHTML={{ __html: msg.text }} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage} disabled={isSending}>
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBotWindow;
