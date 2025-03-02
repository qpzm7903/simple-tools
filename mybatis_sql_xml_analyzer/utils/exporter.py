"""
Exporter module.
Exports analysis results to different formats.
"""
import os
import csv
import json
import logging
import plantuml


class Exporter:
    """
    Exports analysis results to different formats.
    Supports PNG, SVG, CSV, and JSON formats.
    """
    
    def __init__(self, output_dir='./output'):
        """
        Initialize the exporter.
        
        Args:
            output_dir (str): Directory to store exported files
        """
        self.logger = logging.getLogger(__name__)
        self.output_dir = output_dir
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def export_csv(self, relationships, filename='relationships.csv'):
        """
        Export relationships to CSV.
        
        Args:
            relationships (list): List of relationship dictionaries
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Source Table', 'Source Field', 'Target Table', 'Target Field', 'Source File', 'FK Relationship'])
                
                for rel in relationships:
                    writer.writerow([
                        rel['source_table'],
                        rel['source_field'],
                        rel['target_table'],
                        rel['target_field'],
                        rel['source_file'],
                        'Yes' if rel.get('is_potential_fk', False) else 'No'
                    ])
            
            self.logger.info(f"Exported CSV to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting CSV: {str(e)}")
            return None
    
    def export_json(self, results, filename='analysis_results.json'):
        """
        Export analysis results to JSON.
        
        Args:
            results (dict): Analysis results including entities and relationships
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            # Prepare JSON-serializable data
            export_data = {
                'entities': [],
                'relationships': results['relationships'],
                'stats': results['stats']
            }
            
            # Convert entities to a list format for JSON
            for entity_name, entity_data in results['entities'].items():
                entity_json = {
                    'name': entity_name,
                    'fields': entity_data['fields'],
                    'primary_key': entity_data['primary_key']
                }
                export_data['entities'].append(entity_json)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2)
            
            self.logger.info(f"Exported JSON to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting JSON: {str(e)}")
            return None
    
    def export_plantuml(self, diagram, filename='diagram.puml'):
        """
        Export diagram to PlantUML file.
        
        Args:
            diagram (str): PlantUML diagram code
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(diagram)
            
            self.logger.info(f"Exported PlantUML to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting PlantUML: {str(e)}")
            return None
    
    def export_svg(self, diagram, filename='diagram.svg'):
        """
        Export diagram to SVG.
        
        Args:
            diagram (str): PlantUML diagram code
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            # Create a PlantUML server connection
            # Default to public PlantUML server if no local server is specified
            server = plantuml.PlantUML(url='http://www.plantuml.com/plantuml/svg/')
            
            # Generate SVG
            server.processes(diagram, outfile=output_path)
            
            self.logger.info(f"Exported SVG to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting SVG: {str(e)}")
            return None
    
    def export_png(self, diagram, filename='diagram.png'):
        """
        Export diagram to PNG.
        
        Args:
            diagram (str): PlantUML diagram code
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            # Create a PlantUML server connection for PNG
            server = plantuml.PlantUML(url='http://www.plantuml.com/plantuml/png/')
            
            # Generate PNG
            server.processes(diagram, outfile=output_path)
            
            self.logger.info(f"Exported PNG to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting PNG: {str(e)}")
            return None
    
    def export_markdown(self, results, filename='relationships.md'):
        """
        Export analysis results to Markdown.
        
        Args:
            results (dict): Analysis results including entities and relationships
            filename (str): Output filename
            
        Returns:
            str: Path to exported file
        """
        output_path = os.path.join(self.output_dir, filename)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                # Write title
                f.write("# Database Table Relationships\n\n")
                
                # Write PlantUML diagram
                f.write("## Entity Relationship Diagram\n\n")
                f.write("```plantuml\n")
                f.write(results['diagram'])
                f.write("\n```\n\n")
                
                # Write entities
                f.write("## Entities\n\n")
                for entity_name, entity_data in results['entities'].items():
                    f.write(f"### {entity_name}\n\n")
                    
                    if entity_data['primary_key']:
                        f.write(f"- Primary Key: **{entity_data['primary_key']}**\n")
                    
                    f.write("- Fields:\n")
                    for field in entity_data['fields']:
                        if entity_data['primary_key'] == field:
                            f.write(f"  - **{field}** (PK)\n")
                        else:
                            f.write(f"  - {field}\n")
                    
                    f.write("\n")
                
                # Write relationships
                f.write("## Relationships\n\n")
                f.write("| Source Table | Source Field | Target Table | Target Field | Type | Source File |\n")
                f.write("|-------------|-------------|-------------|-------------|------|------------|\n")
                
                for rel in results['relationships']:
                    fk_indicator = " (FK)" if rel.get('is_potential_fk', False) else ""
                    f.write(f"| {rel['source_table']} | {rel['source_field']}{fk_indicator} | {rel['target_table']} | {rel['target_field']} | {rel['relationship_type']} | {rel['source_file']} |\n")
            
            self.logger.info(f"Exported Markdown to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error exporting Markdown: {str(e)}")
            return None 