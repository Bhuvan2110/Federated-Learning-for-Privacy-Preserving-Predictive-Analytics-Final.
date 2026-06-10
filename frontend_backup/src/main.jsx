import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global interceptor for 401 Unauthorized errors
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      // Clear auth tokens
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userEmail');
      
      // If we are not already on the login page, redirect the user
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
