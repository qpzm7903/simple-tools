"""
Flask application for MyBatis SQL Relationship Analyzer.
Provides a web interface for analyzing MyBatis XML files.
"""
import os
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory
from mybatis_sql_xml_analyzer.core.analyzer import Analyzer
from mybatis_sql_xml_analyzer.utils.config import Config
from mybatis_sql_xml_analyzer.utils.exporter import Exporter


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
config = Config()

# Create output directory if it doesn't exist
output_dir = config.get('OUTPUT_DIR', './output')
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Initialize the analyzer
analyzer = Analyzer(max_depth=config.get_int('MAX_DEPTH', 3))

# Initialize the exporter
exporter = Exporter(output_dir=output_dir)

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)


@app.route('/')
def index():
    """Render the index page."""
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze a directory of MyBatis XML files.
    
    Expects:
        directory_path: Path to directory containing MyBatis XML files
        
    Returns:
        JSON with analysis results
    """
    try:
        data = request.get_json()
        directory_path = data.get('directory_path', '')
        
        if not directory_path:
            return jsonify({'error': 'No directory path provided'}), 400
        
        # Analyze the directory
        results = analyzer.analyze_directory(directory_path)
        
        # Export results
        plantuml_path = exporter.export_plantuml(results['diagram'])
        svg_path = exporter.export_svg(results['diagram'])
        csv_path = exporter.export_csv(results['relationships'])
        json_path = exporter.export_json(results)
        markdown_path = exporter.export_markdown(results)
        
        # Prepare response
        response = {
            'success': True,
            'message': f"Analysis complete. Found {results['stats']['total_entities']} tables and {results['stats']['total_relationships']} relationships.",
            'diagram': results['diagram'],
            'entities': list(results['entities'].keys()),
            'relationships': results['relationships'],
            'files': {
                'plantuml': os.path.basename(plantuml_path) if plantuml_path else None,
                'svg': os.path.basename(svg_path) if svg_path else None,
                'csv': os.path.basename(csv_path) if csv_path else None,
                'json': os.path.basename(json_path) if json_path else None,
                'markdown': os.path.basename(markdown_path) if markdown_path else None
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/download/<filename>')
def download_file(filename):
    """
    Download a generated file.
    
    Args:
        filename: Name of the file to download
        
    Returns:
        File for download
    """
    return send_from_directory(output_dir, filename, as_attachment=True)


@app.route('/config')
def get_config():
    """
    Get the current configuration.
    
    Returns:
        JSON with configuration values
    """
    config_values = {
        'debug_mode': config.get_bool('DEBUG_MODE', False),
        'max_depth': config.get_int('MAX_DEPTH', 3),
        'output_dir': config.get('OUTPUT_DIR', './output'),
        'plantuml_server': config.get('PLANTUML_SERVER', 'http://www.plantuml.com/plantuml/svg/'),
        'version': '1.1.0'
    }
    
    return jsonify(config_values)


def create_app():
    """Create and configure the Flask app."""
    return app


def start_app():
    """Start the Flask app."""
    host = config.get('HOST', '0.0.0.0')
    port = config.get_int('PORT', 5000)
    debug = config.get_bool('DEBUG_MODE', False)
    
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    start_app() 