#!/usr/bin/env python3
"""
Run the Flask application directly without Express/Node.js
"""

import os
import sys

# Add the server directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from app import app

if __name__ == '__main__':
    print("Starting Tourist Safety Management System (Flask Only)")
    port = int(os.environ.get('PORT', 5000))
    print(f"Running on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)