import React, { useState, useEffect } from 'react';

/**
 * SocialIntegrations allows users to connect social media accounts to a
 * selected project.  Supported platforms include TikTok, Instagram,
 * Facebook and Gmail.  Depending on the platform the user may provide
 * either a token or username/password.  Credentials are sent to the
 * backend and appended to the `.env` file.
 */
export default function SocialIntegrations() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [platform, setPlatform] = useState('');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0) {
          setProject(data.projects[0]);
        }
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { project, platform };
    if (token) body.token = token;
    if (username) body.username = username;
    if (password) body.password = password;
    const res = await fetch('/connect_platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Saved credentials for ${platform} on ${project}.`);
      // Clear fields
      setToken('');
      setUsername('');
      setPassword('');
    } else {
      setMessage(data.error || 'Failed to save credentials');
    }
  };

  const renderCredentialsFields = () => {
    if (!platform) return null;
    const lower = platform.toLowerCase();
    if (['tiktok', 'instagram', 'facebook'].includes(lower)) {
      return (
        <div className="mt-2">
          <label className="block text-sm mb-1">Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      );
    }
    // Default to username/password for Gmail and others
    return (
      <div className="mt-2 space-y-2">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Project</label>
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
        >
          <option value="">Select a platform</option>
          <option value="TikTok">TikTok</option>
          <option value="Instagram">Instagram</option>
          <option value="Facebook">Facebook</option>
          <option value="Gmail">Gmail</option>
        </select>
      </div>
      {renderCredentialsFields()}
      <button
        type="submit"
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Connect
      </button>
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
    </form>
  );
}