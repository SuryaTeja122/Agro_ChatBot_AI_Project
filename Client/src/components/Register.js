import React, { useState } from 'react';
import './Auth.css';

const Register = ({ embedded }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState("");


  const handleRegister = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setSuccess('');
      return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const existing = users.find((u) => u.email === email);

    if (existing) {
      setError('User already exists');
      setSuccess('');
    } else {
      const newUser = { email, password, loggedIn: false };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      setSuccess('Registered successfully! You can now log in.');
      setError('');
      setEmail('');
      setPassword('');
    }
  };

  
  return (
    <div className={`form-container ${embedded ? 'embedded' : ''}`}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
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
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />


        <button type="submit">Register</button>
      </form>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
};

export default Register;
