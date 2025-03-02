"""
Unit tests for RelationshipExtractor.
"""
import unittest
from core.relationship_extractor import RelationshipExtractor


class TestRelationshipExtractor(unittest.TestCase):
    """Test cases for RelationshipExtractor."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.extractor = RelationshipExtractor()
        
        # Sample SQL data with JOIN
        self.join_sql_data = {
            'sql_id': 'getUserWithDepartment',
            'sql': 'SELECT u.id, u.username, u.department_id, d.name FROM user u JOIN department d ON u.department_id = d.id WHERE u.id = 1',
            'file_path': '/path/to/UserMapper.xml',
            'relative_path': 'UserMapper.xml',
            'line_info': '10-30'
        }
        
        # Sample SQL data with WHERE relation
        self.where_sql_data = {
            'sql_id': 'getOrdersForUser',
            'sql': 'SELECT o.id, o.amount FROM order o WHERE o.user_id = u.id',
            'file_path': '/path/to/OrderMapper.xml',
            'relative_path': 'OrderMapper.xml',
            'line_info': '40-60'
        }
        
        # Sample SQL with complex JOINs and aliases
        self.complex_sql_data = {
            'sql_id': 'getFullUserData',
            'sql': '''
            SELECT u.id, u.name, d.name as dept_name, r.name as role_name
            FROM user u
            INNER JOIN department d ON u.department_id = d.id
            LEFT JOIN user_role ur ON u.id = ur.user_id
            LEFT JOIN role r ON ur.role_id = r.id
            WHERE u.active = 1
            ''',
            'file_path': '/path/to/ComplexMapper.xml',
            'relative_path': 'ComplexMapper.xml',
            'line_info': '70-90'
        }
    
    def test_extract_join_relationships(self):
        """Test extracting JOIN relationships."""
        relationships = self.extractor.extract_relationships(self.join_sql_data)
        
        # Check if relationship was extracted
        self.assertEqual(len(relationships), 1)
        
        # Check relationship details
        relationship = relationships[0]
        self.assertEqual(relationship['source_table'], 'user')
        self.assertEqual(relationship['source_field'], 'department_id')
        self.assertEqual(relationship['target_table'], 'department')
        self.assertEqual(relationship['target_field'], 'id')
        self.assertEqual(relationship['relationship_type'], 'JOIN')
        self.assertEqual(relationship['source_file'], 'UserMapper.xml (L10-30)')
    
    def test_extract_where_relationships(self):
        """Test extracting WHERE relationships."""
        relationships = self.extractor.extract_relationships(self.where_sql_data)
        
        # Check if relationship was extracted
        self.assertEqual(len(relationships), 1)
        
        # Check relationship details
        relationship = relationships[0]
        self.assertEqual(relationship['source_table'], 'order')
        self.assertEqual(relationship['source_field'], 'user_id')
        self.assertEqual(relationship['target_table'], 'u')  # Note: This is an alias, not resolved in this test
        self.assertEqual(relationship['target_field'], 'id')
        self.assertEqual(relationship['relationship_type'], 'WHERE')
        self.assertEqual(relationship['source_file'], 'OrderMapper.xml (L40-60)')
    
    def test_extract_complex_relationships(self):
        """Test extracting relationships from complex SQL with multiple JOINs."""
        relationships = self.extractor.extract_relationships(self.complex_sql_data)
        
        # Check if all relationships were extracted
        self.assertEqual(len(relationships), 3)
        
        # Create a set of relationship strings for easier comparison
        relation_strings = set()
        for rel in relationships:
            relation_str = f"{rel['source_table']}.{rel['source_field']} -> {rel['target_table']}.{rel['target_field']}"
            relation_strings.add(relation_str)
        
        # Check if expected relationships are present
        self.assertIn('user.department_id -> department.id', relation_strings)
        self.assertIn('user.id -> user_role.user_id', relation_strings)
        self.assertIn('user_role.role_id -> role.id', relation_strings)
    
    def test_extract_table_aliases(self):
        """Test extracting table aliases."""
        # Parse the SQL to get a parsed statement
        import sqlparse
        sql = self.complex_sql_data['sql']
        parsed = sqlparse.parse(sql)
        stmt = parsed[0]
        
        # Extract aliases
        aliases = self.extractor.extract_table_aliases(stmt)
        
        # Check alias mappings
        self.assertEqual(aliases.get('u'), 'user')
        self.assertEqual(aliases.get('d'), 'department')
        self.assertEqual(aliases.get('ur'), 'user_role')
        self.assertEqual(aliases.get('r'), 'role')


if __name__ == '__main__':
    unittest.main() 