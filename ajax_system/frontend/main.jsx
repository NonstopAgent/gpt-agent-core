import React from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './components/Dashboard.jsx';
import './style.css';

// Mount the Dashboard component into the root element.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
);