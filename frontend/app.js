// Simple client-side logic for the GPT Agent dashboard.

document.addEventListener('DOMContentLoaded', () => {
  // Default schedule for daily tasks
  const schedule = [
    { time: '06:30 AM', task: 'Post a reel (yesterday’s slideshow as video)' },
    { time: '08:00 AM', task: 'Comment on 10 contractor/HVAC/plumber accounts' },
    { time: '09:30 AM', task: 'Check and reply to DMs' },
    { time: '11:00 AM', task: 'Generate next slideshow' },
    { time: '01:00 PM', task: 'Post slideshow to IG and TikTok' },
    { time: '03:00 PM', task: 'Scrape trending posts from competitors' },
    { time: '05:00 PM', task: 'Comment again for PM leads' }
  ];

  // Populate daily tasks list
  const dailyList = document.getElementById('dailyTasks');
  schedule.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.time} – ${item.task}`;
    dailyList.appendChild(li);
  });

  // References to DOM elements
  const statusText = document.getElementById('statusText');
  const lastTaskEl = document.getElementById('lastTask');
  const nextTaskEl = document.getElementById('nextTask');
  const queueEl = document.getElementById('taskQueue');
  const historyEl = document.getElementById('taskHistory');
  const chatLog = document.getElementById('chatLog');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');

  // Load queue and history from server
  async function loadQueue() {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      queueEl.innerHTML = '';
      data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.timestamp} – ${item.task}`;
        queueEl.appendChild(li);
      });
      return data;
    } catch (err) {
      console.error('Failed to fetch queue', err);
      queueEl.innerHTML = '<li class="text-red-500">Could not load queue</li>';
      return [];
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      historyEl.innerHTML = '';
      data.slice().reverse().forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.timestamp} – ${item.task}`;
        historyEl.appendChild(li);
      });
      return data;
    } catch (err) {
      console.error('Failed to fetch logs', err);
      historyEl.innerHTML = '<li class="text-red-500">Could not load history</li>';
      return [];
    }
  }

  // Update status based on queue and history
  async function updateStatus() {
    const [queue, history] = await Promise.all([loadQueue(), loadHistory()]);
    // Determine status: running if queue not empty, else idle
    if (queue.length > 0) {
      statusText.textContent = 'Running';
      statusText.classList.remove('text-green-600', 'text-red-600');
      statusText.classList.add('text-blue-600');
      nextTaskEl.textContent = `${queue[0].timestamp} – ${queue[0].task}`;
    } else {
      statusText.textContent = 'Idle';
      statusText.classList.remove('text-blue-600', 'text-red-600');
      statusText.classList.add('text-green-600');
      nextTaskEl.textContent = '—';
    }
    if (history.length > 0) {
      const last = history[history.length - 1];
      lastTaskEl.textContent = `${last.timestamp} – ${last.task}`;
    } else {
      lastTaskEl.textContent = '—';
    }
  }

  // Initial load
  updateStatus();
  // Poll periodically for updates
  setInterval(updateStatus, 30000);

  // Handle chat submissions
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const command = chatInput.value.trim();
    if (!command) return;
    // Append to chat log
    const userMsg = document.createElement('div');
    userMsg.className = 'text-blue-700';
    userMsg.textContent = `You: ${command}`;
    chatLog.appendChild(userMsg);
    chatLog.scrollTop = chatLog.scrollHeight;
    chatInput.value = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      const botMsg = document.createElement('div');
      botMsg.className = 'text-green-700';
      botMsg.textContent = `Agent: queued at ${data.timestamp}`;
      chatLog.appendChild(botMsg);
      chatLog.scrollTop = chatLog.scrollHeight;
      // Refresh status
      updateStatus();
    } catch (err) {
      const errMsg = document.createElement('div');
      errMsg.className = 'text-red-600';
      errMsg.textContent = 'Error sending command';
      chatLog.appendChild(errMsg);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  });

  // Handle file uploads
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = document.getElementById('fileUpload').files;
    const brand = document.getElementById('uploadBrand').value;
    if (!files.length) {
      uploadStatus.textContent = 'No files selected.';
      return;
    }
    const formData = new FormData();
    formData.append('brand', brand);
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });
    uploadStatus.textContent = 'Uploading…';
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        uploadStatus.textContent = `Uploaded: ${data.files.join(', ')}`;
      } else {
        uploadStatus.textContent = 'No files uploaded.';
      }
    } catch (err) {
      uploadStatus.textContent = 'Upload failed.';
    }
    // Clear file input
    document.getElementById('fileUpload').value = '';
  });
});