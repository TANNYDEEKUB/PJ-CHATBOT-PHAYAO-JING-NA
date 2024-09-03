import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './LoginForm_styles.css';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("Submitting login with:", { username, password });

      const response = await axios.post('http://localhost:3001/api/auth/login', {
        username,
        password,
      });

      console.log("Login Response:", response.data);

      const token = response.data.token;
      onLogin(token);

      localStorage.setItem('authToken', token);

      navigate('/home'); // เปลี่ยนเส้นทางไปยังหน้า HomePage
    } catch (err: any) {
      console.error("Login Error:", err.response || err);
      if (err.response && err.response.status === 400) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.response && err.response.status === 500) {
        setError('เกิดข้อผิดพลาดในเซิร์ฟเวอร์. โปรดลองอีกครั้ง.');
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ. โปรดลองอีกครั้ง.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome To Chatbot</h2>
      <div className="auth-icon">
        <FontAwesomeIcon icon={faUser} size="6x" />
      </div>
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <FontAwesomeIcon icon={faUser} className="input-icon" />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="input-container">
          <FontAwesomeIcon icon={faLock} className="input-icon" />
          <input
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FontAwesomeIcon
            icon={isPasswordVisible ? faEyeSlash : faEye}
            className="eye-icon"
            onClick={togglePasswordVisibility}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
