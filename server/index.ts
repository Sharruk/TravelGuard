// Hybrid setup: Flask backend + Express frontend with Vite
import { spawn } from "child_process";
import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

console.log("Starting Tourist Safety Management System with Flask backend...");

// Start Flask backend on port 5001
const flaskProcess = spawn("python", ["app.py"], {
  cwd: "server",
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, PORT: "5001" }
});

flaskProcess.on("error", (err) => {
  console.error("Failed to start Flask backend:", err);
  process.exit(1);
});

flaskProcess.on("exit", (code) => {
  console.log(`Flask backend exited with code ${code}`);
  process.exit(code || 0);
});

// Create Express app just for frontend serving and API proxy
const app = express();

// API proxy to Flask - use middleware with proper body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', async (req, res) => {
  try {
    const flaskUrl = `http://localhost:5001${req.originalUrl}`;
    
    const fetchOptions: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(flaskUrl, fetchOptions);
    const data = await response.text();
    
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(data);
    
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Backend unavailable' });
  }
});

// Setup frontend serving
(async () => {
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`Frontend serving on port ${port}, API proxied to Flask backend on 5001`);
  });
})();

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("Terminating Flask backend...");
  flaskProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("Terminating Flask backend...");
  flaskProcess.kill("SIGTERM");
});
