#!/usr/bin/env python
"""
Entry point for MyBatis SQL Relationship Analyzer.
This script simplifies running the application from the project root.
"""
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import the web app starter
from mybatis_sql_xml_analyzer.web.app import start_app

if __name__ == "__main__":
    print("Starting MyBatis SQL Relationship Analyzer...")
    start_app() 