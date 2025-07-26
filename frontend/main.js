document.getElementById('app').innerText = 'Welcome to GPT Agent!';

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

sendBtn.onclick = async () => {
  const message = userInput.value;
  if (!message.trim()) return;

  chatBox.innerHTML += `<div><strong>You:</strong> ${message}</div>`;
  userInput.value = '';

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    chatBox.innerHTML += `<div><strong>GPT:</strong> ${data.reply}</div>`;
  } catch (err) {
    chatBox.innerHTML += `<div style="color:red;"><strong>Error:</strong> ${err.message}</div>`;
  }
};
