"""
Unit tests for SqlParser.
"""
import unittest
import os
import tempfile
from core.sql_parser import SqlParser


class TestSqlParser(unittest.TestCase):
    """Test cases for SqlParser."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = SqlParser()
        
        # Create a temporary XML file
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_file_path = os.path.join(self.temp_dir.name, 'test_mapper.xml')
        
        # Sample XML content
        self.xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.UserMapper">
    <select id="getUserWithDepartment" resultType="User">
        SELECT 
            u.id, 
            u.username, 
            u.department_id,
            d.name as department_name
        FROM user u
        JOIN department d ON u.department_id = d.id
        WHERE u.id = #{id}
    </select>
    
    <select id="getUsersByDepartment" resultType="User">
        SELECT 
            u.id, 
            u.username
        FROM user u
        WHERE 
            <if test="departmentId != null">
                u.department_id = #{departmentId}
            </if>
    </select>
</mapper>
"""
        
        with open(self.temp_file_path, 'w', encoding='utf-8') as f:
            f.write(self.xml_content)
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.temp_dir.cleanup()
    
    def test_parse_xml_file(self):
        """Test parsing an XML file."""
        results = self.parser.parse_xml_file(self.temp_file_path)
        
        # Check if two SQL statements were extracted
        self.assertEqual(len(results), 2)
        
        # Check first SQL
        self.assertEqual(results[0]['sql_id'], 'getUserWithDepartment')
        self.assertIn('JOIN department', results[0]['sql'])
        
        # Check second SQL
        self.assertEqual(results[1]['sql_id'], 'getUsersByDepartment')
        self.assertIn('FROM user', results[1]['sql'])
    
    def test_clean_dynamic_tags(self):
        """Test cleaning dynamic tags from SQL."""
        # SQL with dynamic tags
        sql_with_tags = """
        SELECT * FROM user
        WHERE 
            <if test="name != null">
                name = #{name}
            </if>
            <if test="age != null">
                AND age = #{age}
            </if>
        """
        
        cleaned_sql = self.parser.clean_dynamic_tags(sql_with_tags)
        
        # Check if tags were removed
        self.assertNotIn('<if', cleaned_sql)
        self.assertNotIn('</if>', cleaned_sql)
        
        # Check if content remains
        self.assertIn('SELECT * FROM user', cleaned_sql)
        self.assertIn('name = #{name}', cleaned_sql)
        self.assertIn('AND age = #{age}', cleaned_sql)
    
    def test_normalize_sql(self):
        """Test SQL normalization."""
        # SQL with extra whitespace and operators
        messy_sql = """
        SELECT  id,name,   age
        FROM    user
        WHERE   id=1 AND name='test'
        """
        
        normalized_sql = self.parser.normalize_sql(messy_sql)
        
        # Check spacing around operators
        self.assertIn('id = 1', normalized_sql)
        
        # Check extraneous whitespace removed
        self.assertNotIn('  ', normalized_sql)
    
    def test_parse_directory(self):
        """Test parsing a directory of XML files."""
        results = self.parser.parse_directory(self.temp_dir.name)
        
        # Check if files in directory were parsed
        self.assertEqual(len(results), 2)  # Two SQL statements from one file


if __name__ == '__main__':
    unittest.main() 