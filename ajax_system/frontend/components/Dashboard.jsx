import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import ChatBox from './ChatBox.jsx';
import SocialIntegrations from './SocialIntegrations.jsx';

/**
 * Dashboard component ties together the sidebar, chat and timeline.  It
 * maintains local state for the current mode and tasks timeline.  The
 * user can toggle between Logan and Ajax modes via a button in the
 * header.  Tasks are periodically refreshed from the backend.
 */
export default function Dashboard() {
  const [mode, setMode] = useState('Ajax');
  const [tasks, setTasks] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  const loadMode = () => {
    fetch('/mode')
      .then((res) => res.json())
      .then((data) => setMode(data.mode || 'Ajax'));
  };

  const loadTasks = () => {
    fetch('/tasks')
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []));
  };

  useEffect(() => {
    loadMode();
    loadTasks();
    // Periodically refresh tasks to simulate real-time view
    const interval = setInterval(() => {
      loadTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply or remove the dark class on the root element when darkMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleMode = async () => {
    if (mode === 'Logan') {
      await fetch('/loganin', { method: 'GET' });
    } else {
      await fetch('/loganout', { method: 'GET' });
    }
    loadMode();
  };

  const selectCategory = (project, category) => {
    // Placeholder handler: in a full implementation this would update
    // the main view to show the selected category within a project.
    console.log(`Selected ${category} for ${project}`);
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AJAX Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={toggleMode}
            className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {/* Show both modes in the label; the active mode appears first */}
            {mode === 'Logan' ? 'Logan / Ajax' : 'Ajax / Logan'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>
      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 md:w-64 overflow-y-auto">
          <Sidebar onSelectCategory={selectCategory} />
        </div>
        {/* Main content */}
        <div className="flex-1 grid grid-rows-2 gap-2 p-2">
          {/* Chat and WebView row */}
          <div className="grid grid-cols-2 gap-2 h-full">
            {/* Chat box */}
            <div className="col-span-2 lg:col-span-1 flex flex-col">
              <h2 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">Chat</h2>
              <ChatBox />
            </div>
            {/* WebView / Timeline */}
            <div className="col-span-2 lg:col-span-1 flex flex-col">
              <h2 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">Task Timeline</h2>
              <div className="flex-1 task-timeline bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                {tasks.map((task) => (
                  <div key={task.id} className="task-item text-sm text-gray-800 dark:text-gray-200">
                    <span className="task-icon">{statusIcon(task.status)}</span>
                    <div>
                      <div className="font-medium">{task.description}</div>
                      <div className="text-xs text-gray-500">{new Date(task.timestamp).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Social integrations form */}
          <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
            <h2 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">Social Integrations</h2>
            <SocialIntegrations />
          </div>
        </div>
      </div>
    </div>
  );
}