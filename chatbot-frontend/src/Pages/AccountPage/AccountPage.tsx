import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AccountPage_styles.css';  // Import CSS file

interface UserInfo {
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
}

interface AccountPageProps {
  token: string | null;
}

export const AccountPage: React.FC<AccountPageProps> = ({ token }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) {
        setError('You need to be logged in to view this page.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:3001/api/account', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched User Info:', response.data);
        setUserInfo(response.data);
      } catch (err) {
        console.error('Error fetching user info:', err);
        setError('Failed to fetch user info. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [token]);

  if (loading) {
    return <p className="loading-message">Loading...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="account-page">
      <div className="user-info">
        <h2>Account Information</h2>
        <strong>Username:</strong> <span>{userInfo?.username || 'Not provided'}</span>
        <strong>Email:</strong> <span>{userInfo?.email || 'Not provided'}</span>
        <strong>Full Name:</strong> <span>{userInfo?.fullName || 'Not provided'}</span>
        <strong>Tell:</strong> <span>{userInfo?.phoneNumber || 'Not provided'}</span>
        <strong>Address:</strong> <span>{userInfo?.address || 'Not provided'}</span>
      </div>
    </div>
  );
};

export default AccountPage;
