#!/usr/bin/env python3
"""
Startup script for Tourist Safety Management System - Flask Backend
This script starts both the Flask backend and Vite dev server for the frontend.
"""

import os
import sys
import subprocess
import signal
import time
from threading import Thread

def start_flask():
    """Start the Flask backend server"""
    print("Starting Flask backend...")
    os.chdir('server')
    os.environ['PORT'] = '5001'  # Use different port to avoid conflict
    os.execvp('python', ['python', 'app.py'])

def start_vite():
    """Start the Vite development server"""
    print("Starting Vite frontend...")
    os.environ['VITE_API_URL'] = 'http://localhost:5001'  # Point to Flask backend
    subprocess.run(['npm', 'run', 'build'], check=True)
    # Serve built files
    os.chdir('dist')
    subprocess.run(['python', '-m', 'http.server', '5000'], check=True)

if __name__ == '__main__':
    # For now, just start Flask on port 5001
    print("Starting Tourist Safety Management System with Flask backend...")
    os.environ['PORT'] = '5001'
    os.chdir('server')
    os.execvp('python', ['python', 'app.py'])