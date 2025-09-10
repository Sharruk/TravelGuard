// Bridge to Flask backend - starts Python Flask server and Express frontend proxy
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";
import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from 'http-proxy-middleware';

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

// Create Express app for frontend and API proxy
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Proxy API requests to Flask backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Backend unavailable' });
  }
}));

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Setup Vite for frontend in development
(async () => {
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, undefined);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, "0.0.0.0", () => {
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
