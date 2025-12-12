import React, { useState } from 'react';
import Lottie from 'lottie-react';
import pandaAnimation from './panda.json'; // ✅ We'll add this file next
import './Auth.css';

const Login = ({ embedded }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [coverEyes, setCoverEyes] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
      user.loggedIn = true;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('users', JSON.stringify(users.map(u => u.email === user.email ? user : u)));
      window.location.href = '/chat';
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className={`form-container ${embedded ? 'embedded' : ''}`}>
      <div className="panda-wrapper">
        <Lottie
          animationData={pandaAnimation}
          loop
          className={`panda-animation ${coverEyes ? 'cover-eyes' : ''}`}
        />
      </div>

      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onFocus={() => setCoverEyes(true)}
          onBlur={() => setCoverEyes(false)}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Login;
