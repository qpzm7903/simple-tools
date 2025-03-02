"""
Configuration management module.
Loads and manages application configuration.
"""
import os
import logging
from dotenv import load_dotenv


class Config:
    """
    Configuration manager.
    Loads configuration from .env file and environment variables.
    """
    
    def __init__(self, env_file='.env'):
        """
        Initialize configuration.
        
        Args:
            env_file (str): Path to .env file
        """
        self.logger = logging.getLogger(__name__)
        
        # Load environment variables from .env file if it exists
        if os.path.exists(env_file):
            load_dotenv(env_file)
            self.logger.info(f"Loaded configuration from {env_file}")
        else:
            self.logger.info(f"No {env_file} file found, using default configuration")
        
        # Set default configuration
        self.defaults = {
            'DEBUG_MODE': 'False',
            'MAX_DEPTH': '3',
            'OUTPUT_DIR': './output',
            'PLANTUML_SERVER': 'http://www.plantuml.com/plantuml/svg/',
            'HOST': '0.0.0.0',
            'PORT': '5000'
        }
    
    def get(self, key, default=None):
        """
        Get configuration value.
        
        Args:
            key (str): Configuration key
            default: Default value if key is not found
            
        Returns:
            Value of configuration key
        """
        # First try environment variable
        value = os.environ.get(key)
        
        # If not found, try default configuration
        if value is None:
            value = self.defaults.get(key, default)
        
        return value
    
    def get_int(self, key, default=0):
        """
        Get configuration value as integer.
        
        Args:
            key (str): Configuration key
            default (int): Default value if key is not found
            
        Returns:
            int: Value of configuration key
        """
        value = self.get(key, default)
        
        try:
            return int(value)
        except (ValueError, TypeError):
            self.logger.warning(f"Failed to convert {key}={value} to int, using default {default}")
            return default
    
    def get_bool(self, key, default=False):
        """
        Get configuration value as boolean.
        
        Args:
            key (str): Configuration key
            default (bool): Default value if key is not found
            
        Returns:
            bool: Value of configuration key
        """
        value = self.get(key, default)
        
        if isinstance(value, bool):
            return value
        
        return value.lower() in ('true', 'yes', '1', 'y') 