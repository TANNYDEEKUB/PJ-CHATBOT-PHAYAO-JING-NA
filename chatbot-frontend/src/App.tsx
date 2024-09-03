import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './Pages/HomePage/HomePage';
import { LoginForm } from './Components/LoginForm';
import { RegisterForm } from './Components/RegisterForm';
import { Navbar } from './Components/NavBar';
import { AccountPage } from './Pages/AccountPage/AccountPage';
import HelpPage from './Pages/HelpPage/HelpPage';
import MainPage from './Pages/MainPage/MainPage';  // Import MainPage

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const handleLogin = (userToken: string) => {
    setToken(userToken);
    localStorage.setItem('token', userToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <Router>
      <Navbar isAuthenticated={!!token} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<MainPage />} />  {/* Set MainPage as the default */}
        <Route path="/home" element={<HomePage token={token} setToken={setToken} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/account" element={<AccountPage token={token} />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Router>
  );
};

export default App;
