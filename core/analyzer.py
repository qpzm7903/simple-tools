"""
Main Analyzer module.
Orchestrates the entire analysis process.
"""
import logging
from mybatis_sql_xml_analyzer.core.sql_parser import SqlParser
from mybatis_sql_xml_analyzer.core.relationship_extractor import RelationshipExtractor
from mybatis_sql_xml_analyzer.core.normalizer import Normalizer
from mybatis_sql_xml_analyzer.core.plantuml_generator import PlantUmlGenerator


class Analyzer:
    """
    Main analyzer class that orchestrates the entire analysis process.
    Integrates SQL parsing, relationship extraction, and diagram generation.
    """
    
    def __init__(self, max_depth=3):
        """
        Initialize the analyzer.
        
        Args:
            max_depth (int): Maximum depth for nested query parsing
        """
        self.logger = logging.getLogger(__name__)
        self.sql_parser = SqlParser(max_depth=max_depth)
        self.relationship_extractor = RelationshipExtractor()
        self.normalizer = Normalizer()
        self.plantuml_generator = PlantUmlGenerator()
    
    def analyze_directory(self, directory_path):
        """
        Analyze all MyBatis XML files in a directory.
        
        Args:
            directory_path (str): Path to directory containing MyBatis XML files
            
        Returns:
            dict: Analysis results
        """
        self.logger.info(f"Analyzing directory: {directory_path}")
        
        # Parse SQL statements
        sql_data = self.sql_parser.parse_directory(directory_path)
        self.logger.info(f"Found {len(sql_data)} SQL statements")
        
        # Extract relationships
        all_relationships = []
        for data in sql_data:
            relationships = self.relationship_extractor.extract_relationships(data)
            all_relationships.extend(relationships)
        
        self.logger.info(f"Extracted {len(all_relationships)} relationships")
        
        # Normalize relationships
        normalized_relationships = self.normalizer.normalize_relationships(all_relationships)
        
        # Extract and merge entities
        entities = self.normalizer.extract_entities(normalized_relationships)
        entities = self.normalizer.resolve_primary_keys(entities, normalized_relationships)
        
        self.logger.info(f"Identified {len(entities)} entities")
        
        # Generate PlantUML diagram
        diagram = self.plantuml_generator.generate_diagram(entities, normalized_relationships)
        optimized_diagram = self.plantuml_generator.optimize_layout(diagram)
        
        # Prepare results
        results = {
            'relationships': normalized_relationships,
            'entities': entities,
            'diagram': optimized_diagram,
            'stats': {
                'total_sql_statements': len(sql_data),
                'total_relationships': len(normalized_relationships),
                'total_entities': len(entities)
            }
        }
        
        return results
    
    def get_table_list(self, results):
        """
        Get a list of tables from analysis results.
        
        Args:
            results (dict): Analysis results
            
        Returns:
            list: List of table names
        """
        return sorted(list(results['entities'].keys()))
    
    def get_relationship_table(self, results):
        """
        Get relationship data in tabular format.
        
        Args:
            results (dict): Analysis results
            
        Returns:
            list: List of relationship rows (source_table, source_field, target_table, target_field, source_file)
        """
        table = []
        
        for rel in results['relationships']:
            row = [
                rel['source_table'],
                rel['source_field'],
                rel['target_table'],
                rel['target_field'],
                rel['source_file']
            ]
            table.append(row)
        
        return table
    
    def export_csv(self, results, output_path):
        """
        Export relationships to CSV.
        
        Args:
            results (dict): Analysis results
            output_path (str): Path to output CSV file
            
        Returns:
            bool: Success status
        """
        try:
            import csv
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Source Table', 'Source Field', 'Target Table', 'Target Field', 'Source File'])
                
                for rel in results['relationships']:
                    writer.writerow([
                        rel['source_table'],
                        rel['source_field'],
                        rel['target_table'],
                        rel['target_field'],
                        rel['source_file']
                    ])
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error exporting CSV: {str(e)}")
            return False 