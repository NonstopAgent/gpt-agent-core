// utils/logger.js

const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../logs/agent.log");

function log(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, entry);
}

module.exports = { log };
