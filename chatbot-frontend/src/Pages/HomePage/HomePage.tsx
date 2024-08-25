import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "../../Components/NavBar";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRobot,
  faUserCircle,
  faTrash,
  faSave,
  faPaperPlane,
  faPlus,
  faEdit,
  faBars,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import "./HomePage_styles.css";

// Interface สำหรับกำหนด props ที่จะส่งเข้ามาใน component
interface HomePageProps {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ token, setToken }) => {
  // กำหนด state สำหรับเก็บข้อมูลข้อความในแชท
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(() => {
    const savedMessages = token ? localStorage.getItem(`messages_${token}`) : localStorage.getItem("messages");
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  // กำหนด state สำหรับ input ของผู้ใช้
  const [input, setInput] = useState("");

  // กำหนด state สำหรับประวัติการสนทนา
  const [chatHistory, setChatHistory] = useState<{ _id: string; name: string; messages: { sender: string; text: string }[] }[]>(() => {
    const savedChatHistory = token ? localStorage.getItem(`chatHistory_${token}`) : localStorage.getItem("chatHistory");
    return savedChatHistory ? JSON.parse(savedChatHistory) : [];
  });

  // กำหนด sessionId สำหรับแยกเซสชันการสนทนาแต่ละครั้ง
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));

  // กำหนดชื่อของการสนทนา
  const [chatName, setChatName] = useState<string>("");

  // กำหนด state สำหรับการแก้ไขชื่อการสนทนา
  const [isEditingName, setIsEditingName] = useState<string | null>(null);

  // กำหนดสถานะของผู้ใช้ว่าเข้าสู่ระบบหรือยัง
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);

  // กำหนดสถานะของการส่งข้อความ
  const [isSending, setIsSending] = useState<boolean>(false);

  // กำหนดสถานะเปิด/ปิดของหน้าต่างประวัติการสนทนา
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

  // กำหนดคำค้นหาในประวัติการสนทนา
  const [searchTerm, setSearchTerm] = useState("");

  // ใช้ ref เพื่อเลื่อนหน้าจอไปยังข้อความล่าสุด
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ฟังก์ชันเพื่อดึงประวัติการสนทนาเมื่อผู้ใช้เข้าสู่ระบบ
  useEffect(() => {
    if (!token) return;

    const fetchChatHistory = async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/chat/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChatHistory(response.data);
        localStorage.setItem(`chatHistory_${token}`, JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [token]);

  // บันทึก sessionId ใน localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("sessionId", sessionId);
    } else {
      localStorage.removeItem("sessionId");
    }
  }, [sessionId]);

  // บันทึกข้อความในแชทใน localStorage ทุกครั้งที่ข้อความเปลี่ยนแปลง
  useEffect(() => {
    if (token) {
      localStorage.setItem(`messages_${token}`, JSON.stringify(messages));
    } else {
      localStorage.setItem("messages", JSON.stringify(messages));
    }
    scrollToBottom(); // เลื่อนหน้าจอไปยังข้อความล่าสุด
  }, [messages, token]);

  // ฟังก์ชันเพื่อเลื่อนหน้าจอไปยังข้อความล่าสุด
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ฟังก์ชันสำหรับส่งข้อความ
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
      const botMessage = { sender: "bot", text: response.data.reply };
      setMessages([...newMessages, botMessage]);

      if (!sessionId) {
        setSessionId(response.data.sessionId);
        const updatedHistory = [...chatHistory, { _id: response.data.sessionId, name: "การสนทนาใหม่", messages: [...newMessages, botMessage] }];
        setChatHistory(updatedHistory);
        localStorage.setItem(`chatHistory_${token}`, JSON.stringify(updatedHistory));
      } else {
        const updatedChatHistory = chatHistory.map((chat) =>
          chat._id === sessionId
            ? { ...chat, messages: [...chat.messages, userMessage, botMessage] }
            : chat
        );
        setChatHistory(updatedChatHistory);
        localStorage.setItem(`chatHistory_${token}`, JSON.stringify(updatedChatHistory));
      }

      // รีเซ็ตความสูงของ textarea หลังจากส่งข้อความ
      document.querySelector("textarea").style.height = "40px"; // ค่าเริ่มต้น
    } catch (error) {
      console.error(error);
      const errorMessage = { sender: "bot", text: "ขออภัย ไม่สามารถตอบกลับได้ในขณะนี้" };
      setMessages([...newMessages, errorMessage]);
    }

    setInput("");
    setIsSending(false);
  };

  // ฟังก์ชันสำหรับโหลดการสนทนาที่มีอยู่แล้ว
  const loadSession = (session: { _id: string; name: string; messages: { sender: string; text: string }[] }) => {
    if (isEditingName !== null) return;

    setMessages(session.messages);
    setSessionId(session._id);
    setChatName(session.name);
    localStorage.setItem("sessionId", session._id);
  };

  // ฟังก์ชันสำหรับลบเซสชันการสนทนา
  const handleDeleteSession = async (id: string) => {
    try {
      await axios.delete(`http://localhost:3001/api/chat/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedHistory = chatHistory.filter((chat) => chat._id !== id);
      setChatHistory(updatedHistory);
      localStorage.setItem(`chatHistory_${token}`, JSON.stringify(updatedHistory));
      if (sessionId === id) {
        setMessages([]);
        setSessionId(null);
        setChatName("");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  // ฟังก์ชันสำหรับบันทึกชื่อการสนทนาใหม่
  const handleSaveChatName = async (id: string, newName: string) => {
    try {
      await axios.post(`http://localhost:3001/api/chat/history/name/${id}`, { name: newName }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedChatHistory = chatHistory.map((chat) => (chat._id === id ? { ...chat, name: newName } : chat));
      setChatHistory(updatedChatHistory);
      localStorage.setItem(`chatHistory_${token}`, JSON.stringify(updatedChatHistory));
      setIsEditingName(null);
    } catch (error) {
      console.error("Error saving chat name:", error);
    }
  };

  // ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    setMessages([]);
    setChatHistory([]);
    setSessionId(null);
    setChatName("");
    localStorage.removeItem("messages");
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("sessionId");
  };

  // ฟังก์ชันสำหรับสร้างการสนทนาใหม่
  const handleNewChat = () => {
    if (isEditingName !== null) return;

    setMessages([]);
    setSessionId(null);
    setChatName("");
  };

  // ฟังก์ชันสำหรับสลับสถานะการแสดงผลประวัติการสนทนา
  const toggleChatHistory = () => {
    setIsChatHistoryOpen(!isChatHistoryOpen);

    const sidebar = document.querySelector(".chat-history-container");
    const toggleBtn = document.querySelector(".chat-history-toggle-btn");

    // ตรวจสอบว่า sidebar และ toggleBtn ถูกต้องหรือไม่
    if (sidebar && toggleBtn) {
      if (!isChatHistoryOpen) {
        // เมื่อเปิด ให้แสดง sidebar และปรับตำแหน่งปุ่ม
        sidebar.classList.add("open");
        toggleBtn.style.left = `${sidebar.getBoundingClientRect().width + 10}px`;
      } else {
        // เมื่อปิด ให้ซ่อน sidebar และปรับตำแหน่งปุ่มกลับ
        sidebar.classList.remove("open");
        toggleBtn.style.left = "0.5rem";
      }
    }
  };

  // ฟังก์ชันสำหรับจัดการการค้นหา
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // กรองการสนทนาตามคำค้นหา
  const filteredChats = chatHistory.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // จัดการการปรับขนาดหน้าจอ
  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.querySelector(".chat-history-container");
      const toggleBtn = document.querySelector(".chat-history-toggle-btn");
      if (sidebar && toggleBtn && sidebar.classList.contains("open")) {
        toggleBtn.style.left = `${sidebar.getBoundingClientRect().width + 10}px`;
      }
    };

    window.addEventListener("resize", handleResize);

    // ล้าง event listener เมื่อ component ถูก unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      {/* ปุ่มเปิด/ปิดเมนูประวัติการสนทนา */}
      <button onClick={toggleChatHistory} className="chat-history-toggle-btn">
        <FontAwesomeIcon icon={isChatHistoryOpen ? faTimes : faBars} />
      </button>

      <div className={`chat-container ${isChatHistoryOpen ? "with-sidebar" : ""}`}>
        {/* ส่วนประวัติการสนทนา */}
        <div className={`chat-history-container ${isChatHistoryOpen ? "open" : ""}`}>
          <h2>ประวัติการสนทนา</h2>
          {/* ช่องค้นหา */}
          <input
            type="text"
            placeholder="ค้นหาการสนทนา..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input w-full bg-blue-500 text-white p-2 rounded-lg mb-2"
          />
          {/* ปุ่ม New Chat 5555*/}
          <button
            onClick={handleNewChat}
            className="w-full bg-blue-500 text-white p-2 rounded-lg mt-2 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faPlus} className="text-lg mr-2" />
            New Chat
          </button>
          {isAuthenticated ? (
            <>
              <div id="message-list" className="flex flex-col items-center mb-2 mt-2" style={{ overflowY: "auto" }}>
                {filteredChats.map((chat, index) => (
                  <div
                    key={index}
                    className="chat-item w-full flex items-center justify-between mb-2 bg-blue-500 text-white rounded-lg p-2"
                    style={{ cursor: "pointer" }}
                  >
                    {isEditingName === chat._id ? (
                      <>
                        <input
                          type="text"
                          value={chatName}
                          onChange={(e) => setChatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveChatName(chat._id, chatName);
                          }}
                          className="w-full p-2 text-xl rounded-lg text-black text-center"
                        />
                        <button onClick={() => handleSaveChatName(chat._id, chatName)} className="ml-2 text-green-600">
                          <FontAwesomeIcon icon={faSave} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="block w-full p-3 text-2xl bg-blue-500 rounded-lg text-center text-white"
                          style={{
                            height: "50px",
                            justifyContent: "center",
                            textAlign: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => loadSession(chat)}
                        >
                          {chat.name || `การสนทนา ${index + 1}`}
                        </button>
                        <div className="icon-buttons flex items-center space-x-2 absolute right-0 top-0 opacity-0 transition-opacity duration-300 hover:opacity-100">
                          <button
                            className="text-white ml-2"
                            onClick={() => {
                              setIsEditingName(chat._id);
                              setChatName(chat.name);
                            }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="text-red-600 ml-2" onClick={() => handleDeleteSession(chat._id)}>
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center">คุณยังไม่ได้ล็อกอิน แต่สามารถถามคำถามได้</p>
          )}
        </div>

        {/* ส่วนเนื้อหาการสนทนา */}
        <div className={`chat-content-container ${isChatHistoryOpen ? "with-sidebar" : ""}`}>
          {/* เพิ่มส่วนแสดงชื่อการสนทนา */}
          {chatName && (
            <div className="chat-name w-full text-center text-2xl font-semibold text-gray-800 p-4 bg-blue-200 rounded-t-lg">
              {chatName}
            </div>
          )}

          <div id="message-container" className="w-[90%] h-[97%] mt-4 mx-auto bg-[#FFFAF0] border-solid border-2 border-b-0 border-jet rounded-t-lg">
            {/* เนื้อหาของข้อความที่ส่งไปมา */}
            <div id="message-log" className="w-full h-[80%] overflow-y-auto p-4">
              {messages.length === 0 && <div className="empty-chat-message">CHATBOT</div>}
              {messages.map((message, index) => (
                <div key={index} className={`flex items-start mb-10 ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <FontAwesomeIcon icon={message.sender === "user" ? faUserCircle : faRobot} className="text-4xl m-2" />
                  <p
                    className={`py-2 px-4 rounded-lg max-w-[75%] whitespace-pre-wrap break-words ${
                      message.sender === "user" ? "user-bubble" : "bot-bubble"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div id="chat" className="text-xl flex flex-row gap-4 m-4">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto"; // รีเซ็ตความสูงก่อน
                  e.target.style.height = `${e.target.scrollHeight}px`; // ปรับความสูงให้พอดีกับเนื้อหา
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isSending) {
                    e.preventDefault();
                    handleSendMessage(); // เรียกฟังก์ชันส่งคำถาม
                  }
                }}
                placeholder="ช่องใส่คำถาม"
                className="w-full py-2 px-4 rounded-lg border-solid border-jet border-2 focus:ring-0 focus:outline-none focus:border-secondary resize-none"
                style={{ overflow: "hidden", minHeight: "40px", maxHeight: "150px" }}
                rows={1}
                disabled={isEditingName !== null || isSending}
              />
              <button
                onClick={handleSendMessage}
                className="py-2 px-3 rounded-full bg-secondary text-whitesmoke hover:scale-95 hover:rotate-45 hover:opacity-80"
                disabled={isEditingName !== null || isSending}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-3xl" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
