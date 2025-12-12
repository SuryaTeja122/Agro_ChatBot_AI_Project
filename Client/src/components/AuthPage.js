import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import './Auth.css';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="avatar">
          <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="avatar" />
        </div>

        <div className="tabs">
          <div
            className={`tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </div>
          <div
            className={`tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'login' ? <Login embedded={true} /> : <Register embedded={true} />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
