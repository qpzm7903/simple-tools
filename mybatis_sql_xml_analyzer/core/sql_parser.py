"""
SQL Parser module for MyBatis XML files.
Extracts SQL statements from XML files and handles dynamic tags.
"""
import os
import re
import logging
from lxml import etree


class SqlParser:
    """
    Parser for MyBatis XML files.
    Extracts SQL statements and handles dynamic tags.
    """
    
    # MyBatis SQL statement tags
    SQL_TAGS = [
        'select', 'insert', 'update', 'delete',
        'sql', 'statement', 'procedure'
    ]
    
    # MyBatis dynamic tags to clean
    DYNAMIC_TAGS = [
        'if', 'choose', 'when', 'otherwise',
        'trim', 'where', 'set', 'foreach', 
        'bind', 'include'
    ]
    
    def __init__(self, max_depth=3):
        """
        Initialize the SQL parser.
        
        Args:
            max_depth (int): Maximum depth for nested query parsing
        """
        self.max_depth = max_depth
        self.logger = logging.getLogger(__name__)
    
    def parse_directory(self, directory_path):
        """
        Parse all XML files in a directory.
        
        Args:
            directory_path (str): Path to directory containing MyBatis XML files
            
        Returns:
            list: List of dictionaries containing SQL statements and metadata
        """
        results = []
        
        if not os.path.exists(directory_path):
            self.logger.error(f"Directory not found: {directory_path}")
            return results
            
        for root, _, files in os.walk(directory_path):
            for file in files:
                if file.endswith('.xml'):
                    file_path = os.path.join(root, file)
                    file_results = self.parse_xml_file(file_path)
                    results.extend(file_results)
        
        return results
    
    def parse_xml_file(self, file_path):
        """
        Parse a single MyBatis XML file.
        
        Args:
            file_path (str): Path to the XML file
            
        Returns:
            list: SQL statements and their metadata
        """
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            # Get relative path for reporting
            relative_path = os.path.basename(file_path)
            
            sql_statements = self.extract_sql_statements(xml_content, file_path)
            
            for sql_id, sql_content, line_info in sql_statements:
                normalized_sql = self.normalize_sql(sql_content)
                
                results.append({
                    'sql_id': sql_id,
                    'sql': normalized_sql,
                    'file_path': file_path,
                    'relative_path': relative_path,
                    'line_info': line_info
                })
                
        except Exception as e:
            self.logger.error(f"Error parsing file {file_path}: {str(e)}")
        
        return results
    
    def extract_sql_statements(self, xml_content, file_path):
        """
        Extract SQL statements from XML content.
        
        Args:
            xml_content (str): XML file content
            file_path (str): Path to the file (for error reporting)
            
        Returns:
            list: Tuples of (sql_id, sql_content, line_info)
        """
        statements = []
        
        try:
            # Parse XML
            parser = etree.XMLParser(recover=True)
            root = etree.fromstring(xml_content.encode('utf-8'), parser)
            
            # Find namespace
            namespace = root.tag.split('}')[0] + '}' if '}' in root.tag else ''
            
            # Extract SQL statements
            for tag in self.SQL_TAGS:
                xpath_query = f".//{namespace}{tag}"
                elements = root.xpath(xpath_query)
                
                for element in elements:
                    sql_id = element.get('id', 'unknown')
                    
                    # Get line information
                    line_number = element.sourceline
                    line_info = f"{line_number}-{line_number + 20}"  # Approximate
                    
                    # Extract SQL content
                    sql_content = etree.tostring(element, encoding='unicode', method='text')
                    cleaned_sql = self.clean_dynamic_tags(sql_content)
                    
                    statements.append((sql_id, cleaned_sql, line_info))
        
        except Exception as e:
            self.logger.error(f"Error extracting SQL from {file_path}: {str(e)}")
        
        return statements
    
    def clean_dynamic_tags(self, xml_content):
        """
        Clean dynamic MyBatis tags from XML.
        
        Args:
            xml_content (str): XML content with dynamic tags
            
        Returns:
            str: Cleaned XML content
        """
        # 添加UNION查询的预处理
        # 确保在拆分UNION查询时不会破坏SQL语义
        # 在处理动态标签前先保护UNION关键字
        content = xml_content
        
        # 移除XML注释
        content = re.sub(r'<!--.*?-->', ' ', content, flags=re.DOTALL)
        
        # 将UNION关键字替换为特殊标记，以防被后续处理破坏
        content = re.sub(r'(\s+)UNION(\s+ALL)?(\s+)', r'\1UNION_PROTECTED\3', content, flags=re.IGNORECASE)
        
        # 处理其他动态标签
        for tag in self.DYNAMIC_TAGS:
            # Replace opening tags
            content = re.sub(
                r'<\s*' + tag + r'[^>]*>', 
                ' ', 
                content
            )
            
            # Replace closing tags
            content = re.sub(
                r'<\s*/\s*' + tag + r'\s*>', 
                ' ', 
                content
            )
        
        # 恢复UNION关键字
        content = content.replace('UNION_PROTECTED', 'UNION')
        
        # 清理空白字符
        content = re.sub(r'\s+', ' ', content).strip()
        
        return content
    
    def normalize_sql(self, sql):
        """
        Normalize SQL for easier parsing.
        
        Args:
            sql (str): SQL statement
            
        Returns:
            str: Normalized SQL
        """
        if not sql:
            return ""
            
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', sql).strip()
        
        # Remove SQL comments
        normalized = re.sub(r'--.*?(\n|$)', ' ', normalized)
        normalized = re.sub(r'/\*.*?\*/', ' ', normalized, flags=re.DOTALL)
        
        # Ensure spaces around operators
        operators = [',', '=', '<', '>', '<=', '>=', '<>', '!=', '+', '-', '*', '/', '(', ')']
        for op in operators:
            normalized = normalized.replace(op, f' {op} ')
        
        # Clean up extra spaces
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        # Handle subqueries
        normalized = self.extract_subqueries(normalized, 0)
        
        return normalized
        
    def extract_subqueries(self, sql, depth=0):
        """
        Extract and process subqueries from SQL statement.
        
        Args:
            sql (str): SQL statement
            depth (int): Current recursion depth
            
        Returns:
            str: Processed SQL with subqueries handled
        """
        if depth >= self.max_depth:
            return sql
            
        # Find all subqueries using parentheses matching
        subquery_pattern = r'\(\s*SELECT\s+.+?\)\s*(?:AS\s+([a-zA-Z0-9_]+))?'
        
        def replace_subquery(match):
            # Extract the subquery
            subquery = match.group(0)
            
            # Process nested subqueries recursively
            processed_subquery = self.extract_subqueries(subquery, depth + 1)
            
            return processed_subquery
            
        # Replace subqueries with processed versions
        processed_sql = re.sub(subquery_pattern, replace_subquery, sql, flags=re.IGNORECASE | re.DOTALL)
        
        return processed_sql

    def extract_sql_from_mybatis(self, file_path):
        """
        Extract SQL statements from a MyBatis XML file.
        
        Args:
            file_path (str): Path to MyBatis XML file
            
        Returns:
            list: List of dictionaries containing SQL statements and metadata
        """
        try:
            # 读取XML文件
            with open(file_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            # 保存SQL查询中的特殊关键字，防止它们在处理中被篡改
            protected_keywords = {
                'UNION': 'UNION_PROTECTED',
                'JOIN': 'JOIN_PROTECTED',
                'INNER JOIN': 'INNER_JOIN_PROTECTED',
                'LEFT JOIN': 'LEFT_JOIN_PROTECTED',
                'RIGHT JOIN': 'RIGHT_JOIN_PROTECTED'
            }
            
            # 保护关键字
            for keyword, replacement in protected_keywords.items():
                xml_content = re.sub(r'\b' + keyword + r'\b', replacement, xml_content, flags=re.IGNORECASE)
            
            # 提取SQL语句
            statements = self.extract_sql_statements(xml_content, file_path)
            
            results = []
            
            for sql_id, sql, line_info in statements:
                # 恢复保护的关键字
                for keyword, replacement in protected_keywords.items():
                    sql = re.sub(r'\b' + replacement + r'\b', keyword, sql, flags=re.IGNORECASE)
                
                # 标准化SQL
                sql = self.normalize_sql(sql)
                
                # 移除CDATA标记
                sql = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', sql, flags=re.DOTALL)
                
                # 获取文件的相对路径（用于输出）
                relative_path = os.path.basename(file_path)
                
                # 添加到结果集
                results.append({
                    'sql_id': sql_id,
                    'sql': sql,
                    'absolute_path': file_path,
                    'relative_path': relative_path,
                    'line_info': line_info
                })
                
            return results
        
        except Exception as e:
            self.logger.error(f"Error parsing file {file_path}: {str(e)}")
            return [] 