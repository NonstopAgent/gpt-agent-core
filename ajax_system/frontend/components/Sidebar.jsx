import React, { useState, useEffect } from 'react';

/**
 * Sidebar component listing all projects with collapsible folders.
 *
 * Clicking on a project expands a list of categories (slides, captions,
 * scripts, comments, drafts).  A button at the top allows the user to
 * create a new project by providing a name.  When a project is created,
 * the list is refreshed.
 */
export default function Sidebar({ onSelectCategory }) {
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Load projects from the backend
  const loadProjects = () => {
    fetch('/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []));
  };

  // Load agents from the backend
  const loadAgents = () => {
    fetch('/agents')
      .then((res) => res.json())
      .then((data) => setAgents(data.agents || []));
  };

  useEffect(() => {
    loadProjects();
    loadAgents();
  }, []);

  const toggleProject = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNewProject = async () => {
    const name = window.prompt('Enter a name for the new project');
    if (!name) return;
    await fetch('/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    loadProjects();
  };

  const handleNewAgent = async () => {
    const name = window.prompt('Enter agent name');
    if (!name) return;
    const role = window.prompt('Enter agent role');
    const base_behavior = window.prompt('Describe base behaviour');
    await fetch('/agents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, base_behavior }),
    });
    loadAgents();
  };

  const handleUploadTraining = async (agentName, file) => {
    const formData = new FormData();
    formData.append('file', file);
    await fetch(`/agents/${agentName}/upload_training`, {
      method: 'POST',
      body: formData,
    });
    alert(`Training file uploaded for ${agentName}`);
  };

  const categories = ['slides', 'captions', 'scripts', 'comments', 'drafts'];

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700 space-y-6">
      {/* Projects section */}
      <div>
        <button
          onClick={handleNewProject}
          className="w-full mb-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Project
        </button>
        {projects.map((project) => (
          <div key={project} className="mb-2">
            <div
              className="flex items-center justify-between cursor-pointer p-2 bg-gray-200 dark:bg-gray-700 rounded"
              onClick={() => toggleProject(project)}
            >
              <span>{project}</span>
              <span>{expanded[project] ? '▾' : '▸'}</span>
            </div>
            {expanded[project] && (
              <ul className="ml-4 mt-1 space-y-1">
                {categories.map((cat) => (
                  <li
                    key={cat}
                    className="cursor-pointer hover:underline text-sm text-gray-700 dark:text-gray-300"
                    onClick={() => onSelectCategory && onSelectCategory(project, cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {/* Agents section */}
      <div>
        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Agents</h3>
        <button
          onClick={handleNewAgent}
          className="w-full mb-4 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add AI Agent
        </button>
        {agents.map((agent) => (
          <div key={agent} className="mb-3">
            <div className="text-gray-900 dark:text-gray-100 font-medium">{agent}</div>
            <input
              type="file"
              className="mt-1 text-sm"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleUploadTraining(agent, file);
                e.target.value = '';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}