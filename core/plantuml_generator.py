"""
PlantUML Generator module.
Generates PlantUML diagrams from entity relationships.
"""
import logging


class PlantUmlGenerator:
    """
    Generates PlantUML diagrams from entity relationships.
    Handles diagram layout optimization.
    """
    
    def __init__(self):
        """Initialize the PlantUML generator."""
        self.logger = logging.getLogger(__name__)
    
    def generate_diagram(self, entities, relationships):
        """
        Generate a PlantUML diagram.
        
        Args:
            entities (dict): Dictionary of entities
            relationships (list): List of relationship dictionaries
            
        Returns:
            str: PlantUML diagram code
        """
        diagram = []
        
        # Start diagram
        diagram.append('@startuml')
        diagram.append('left to right direction')
        diagram.append('')
        
        # Layout optimization hint
        diagram.append('skinparam nodesep 80')
        diagram.append('skinparam ranksep 60')
        diagram.append('')
        
        # Define entities
        for entity_name, entity in entities.items():
            diagram.append(f'entity {entity_name} {{')
            
            # Add primary key (if available)
            if entity['primary_key']:
                diagram.append(f'  +{entity["primary_key"]}')
            
            # Add other fields
            for field in entity['fields']:
                if field != entity['primary_key']:
                    diagram.append(f'  {field}')
            
            diagram.append('}')
            diagram.append('')
        
        # Define relationships
        added_relationships = set()  # To avoid duplicates
        
        for rel in relationships:
            # Create a unique identifier for this relationship
            rel_id = f"{rel['source_table']}.{rel['source_field']} -> {rel['target_table']}.{rel['target_field']}"
            
            if rel_id in added_relationships:
                continue
                
            added_relationships.add(rel_id)
            
            source = rel['source_table']
            target = rel['target_table']
            label = f"\"{rel['source_field']} = {rel['target_field']}\""
            
            diagram.append(f'{source} --> {target} : {label}')
        
        # End diagram
        diagram.append('@enduml')
        
        return '\n'.join(diagram)
    
    def optimize_layout(self, diagram):
        """
        Optimize the layout of the PlantUML diagram.
        
        Args:
            diagram (str): PlantUML diagram code
            
        Returns:
            str: Optimized PlantUML diagram code
        """
        # Add layout optimization hints
        lines = diagram.split('\n')
        
        # Add LAYOUT_WITH_ITERATIONS if not present
        if not any('LAYOUT_WITH_ITERATIONS' in line for line in lines):
            # Find the index after @startuml
            for i, line in enumerate(lines):
                if line.strip() == '@startuml':
                    lines.insert(i + 1, '!pragma layout smetana')
                    lines.insert(i + 2, '')
                    break
        
        return '\n'.join(lines)
    
    def generate_svg(self, diagram):
        """
        Generate SVG from PlantUML diagram.
        This requires a PlantUML server to be available.
        
        Args:
            diagram (str): PlantUML diagram code
            
        Returns:
            str: Path to SVG file
        """
        try:
            import plantuml
            
            # Create a PlantUML server connection
            # Default to public PlantUML server if no local server is specified
            server = plantuml.PlantUML(url='http://www.plantuml.com/plantuml/svg/')
            
            # Generate SVG
            output_path = 'output.svg'
            server.processes(diagram, outfile=output_path)
            
            return output_path
            
        except ImportError:
            self.logger.error("plantuml module not installed")
            return None
        except Exception as e:
            self.logger.error(f"Error generating SVG: {str(e)}")
            return None 