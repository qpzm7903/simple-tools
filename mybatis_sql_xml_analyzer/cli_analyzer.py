#!/usr/bin/env python
"""
Command-line tool for MyBatis SQL Relationship Analyzer.
Allows running analysis from the command line.
"""
import os
import sys
import argparse
import logging
from core.analyzer import Analyzer
from utils.config import Config
from utils.exporter import Exporter


def main():
    """Main entry point for the CLI tool."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    # Load configuration
    config = Config()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='MyBatis SQL Relationship Analyzer CLI',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument('--path', '-p', required=True,
                        help='Path to directory containing MyBatis XML files')
    
    parser.add_argument('--output', '-o', default='diagram.puml',
                        help='Output file path for PlantUML diagram')
    
    parser.add_argument('--csv', default=None,
                        help='Output file path for CSV relationships list')
    
    parser.add_argument('--svg', default=None,
                        help='Output file path for SVG diagram')
    
    parser.add_argument('--png', default=None,
                        help='Output file path for PNG diagram')
    
    parser.add_argument('--max-depth', type=int, default=config.get_int('MAX_DEPTH', 3),
                        help='Maximum depth for nested query parsing')
    
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Enable verbose output')
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Verify input directory
    if not os.path.exists(args.path):
        logger.error(f"Directory not found: {args.path}")
        return 1
    
    logger.info(f"Analyzing directory: {args.path}")
    
    try:
        # Initialize the analyzer
        analyzer = Analyzer(max_depth=args.max_depth)
        
        # Analyze the directory
        results = analyzer.analyze_directory(args.path)
        
        logger.info(f"Analysis complete. Found {results['stats']['total_entities']} tables "
                   f"and {results['stats']['total_relationships']} relationships.")
        
        # Initialize the exporter
        output_dir = os.path.dirname(os.path.abspath(args.output))
        exporter = Exporter(output_dir=output_dir)
        
        # Export PlantUML
        puml_path = exporter.export_plantuml(results['diagram'], os.path.basename(args.output))
        logger.info(f"PlantUML diagram saved to: {puml_path}")
        
        # Export CSV if requested
        if args.csv:
            csv_path = exporter.export_csv(results['relationships'], os.path.basename(args.csv))
            if csv_path:
                logger.info(f"CSV relationships saved to: {csv_path}")
        
        # Export SVG if requested
        if args.svg:
            svg_path = exporter.export_svg(results['diagram'], os.path.basename(args.svg))
            if svg_path:
                logger.info(f"SVG diagram saved to: {svg_path}")
        
        # Export PNG if requested
        if args.png:
            png_path = exporter.export_png(results['diagram'], os.path.basename(args.png))
            if png_path:
                logger.info(f"PNG diagram saved to: {png_path}")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error in analysis: {str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main()) 