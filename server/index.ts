// Bridge to Flask backend - starts Python Flask server instead of Express
import { spawn } from "child_process";
import { setupVite, serveStatic } from "./vite";
import express from "express";

console.log("Starting Tourist Safety Management System with Flask backend...");

// Start Flask backend
const flaskProcess = spawn("python", ["app.py"], {
  cwd: "server",
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, PORT: "5000" }
});

flaskProcess.on("error", (err) => {
  console.error("Failed to start Flask backend:", err);
  process.exit(1);
});

flaskProcess.on("exit", (code) => {
  console.log(`Flask backend exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("Terminating Flask backend...");
  flaskProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("Terminating Flask backend...");
  flaskProcess.kill("SIGTERM");
});

console.log("Flask backend started successfully");
