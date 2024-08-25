import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './Pages/HomePage/HomePage';
import { LoginForm } from './Components/LoginForm';
import { RegisterForm } from './Components/RegisterForm';
import { Navbar } from './Components/NavBar';
import { AccountPage } from './Pages/AccountPage/AccountPage';
import  HelpPage  from './Pages/HelpPage/HelpPage';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token'); // ดึง token จาก localStorage เมื่อโหลดแอป
  });

  const handleLogin = (userToken: string) => {
    setToken(userToken);
    localStorage.setItem('token', userToken); // เก็บ token ไว้ใน localStorage เมื่อเข้าสู่ระบบ
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token'); // ลบ token ออกจาก localStorage เมื่อออกจากระบบ
  };

  useEffect(() => {
    // ตรวจสอบว่า token ที่เก็บไว้ใน localStorage ยังใช้งานได้หรือไม่
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <Router>
      <Navbar isAuthenticated={!!token} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage token={token} setToken={setToken} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/account" element={<AccountPage token={token} />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
};

export default App;
