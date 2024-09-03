// src/Components/NavBar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NavBar_styles.css';
import { faRobot } from '@fortawesome/free-solid-svg-icons'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCog, faSignOutAlt, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    const storedTheme = localStorage.getItem('isNightMode');
    return storedTheme === 'true';
  });

  useEffect(() => {
    if (isNightMode) {
      document.body.classList.add('night-mode');
      localStorage.setItem('isNightMode', 'true');
    } else {
      document.body.classList.remove('night-mode');
      localStorage.setItem('isNightMode', 'false');
    }
  }, [isNightMode]);

  const handleLogout = () => {
    const confirmLogout = window.confirm('คุณต้องการออกจากระบบหรือไม่?');
    if (confirmLogout) {
      localStorage.removeItem('token');
      onLogout();
      navigate('/');
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleNightMode = () => {
    setIsNightMode(!isNightMode);
  };
  return (
    <div className="navbar">
      <Link className="nav-link flex items-center" to="/"> {/* เพิ่ม class flex และ items-center */}
        {/* เพิ่มไอคอน faRobot ไว้ด้านหน้าข้อความ "CHATBOT" */}
        <FontAwesomeIcon icon={faRobot} size="2x" className="mr-1" /> {/* ลดระยะห่างด้วย mr-1 */}
        <h1>CHATBOT</h1>
      </Link>
      <div id="help-menu" className="flex items-center">
        <button onClick={toggleNightMode} className="toggle-theme-btn">
          <FontAwesomeIcon icon={isNightMode ? faSun : faMoon} size="2x" />
        </button>
        {isAuthenticated ? (
          <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleDropdown}>
              <FontAwesomeIcon icon={faUserCircle} size="2x" />
            </div>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <Link to="/account" className="dropdown-item">
                  <FontAwesomeIcon icon={faCog} />
                  <span>บัญชี</span>
                </Link>
                <div onClick={handleLogout} className="dropdown-item">
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>ออกจากระบบ</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link className="p-4 mx-2 hover:opacity-80 hover:bg-overlay hover:text-whitesmoke" to="/login">
              เข้าสู่ระบบ
            </Link>
            <Link className="p-4 mx-2 hover:opacity-80 hover:bg-overlay hover:text-whitesmoke" to="/register">
              สมัครบัญชี
            </Link>
          </>
        )}
      </div>
    </div>
  );
  
};
