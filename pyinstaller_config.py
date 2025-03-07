"""
PyInstaller Configuration for MyBatis SQL Relationship Analyzer
This file contains settings used by build_executable.py to create the Windows executable
"""

# Application name
APP_NAME = "MyBatis SQL Analyzer"

# Application version
APP_VERSION = "1.2.0"

# Icon file (relative to project root)
# 目前没有图标文件，设置为None
ICON_FILE = None

# Hidden imports that PyInstaller might miss
HIDDEN_IMPORTS = [
    'engineio.async_drivers.threading',
    'sqlparse.tokens',
    'sqlparse.sql',
    'lxml.etree',
    'plantuml',
    'six',
    # 添加关键模块以确保它们被正确打包
    'web',
    'web.app',
    'core',
    'core.analyzer',
    'utils',
    'utils.config',
    'utils.exporter',
    'flask',
    'flask.templating',
    'jinja2',
    'werkzeug',
]

# Data files to include
ADDITIONAL_DATA = [
    ('web/templates', 'web/templates'),
    ('web/static', 'web/static'),
    ('examples', 'examples'),
    ('.env.example', '.'),
]

# Excludes packages not needed
EXCLUDES = [
    'matplotlib', 'numpy', 'pandas', 'PyQt5', 'PySide2', 'PIL',
    'tkinter', 'babel', 'sphinx', 'pytest', 'notebook', 'jupyter', 
    'test', 'tests', 'testing'
]

# Runtime hooks
RUNTIME_HOOKS = []

# Paths to exclude from analysis
EXCLUDE_PATHS = [
    '__pycache__',
    '*.pyc',
    '*.pyd',
    '*.pyo',
    '.git',
    '.github',
    '.pytest_cache',
    '*.egg-info',
] 