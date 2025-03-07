#!/usr/bin/env python
"""
Main entry point for MyBatis SQL Relationship Analyzer.
Starts the web application.
"""
import os
import sys

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Use absolute imports instead of relative imports
from web.app import start_app

if __name__ == "__main__":
    start_app() 