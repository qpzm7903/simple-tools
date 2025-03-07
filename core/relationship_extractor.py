"""
Relationship Extractor module.
Extracts table relationships from SQL statements.
"""
import re
import logging
import sqlparse
from sqlparse.sql import IdentifierList, Identifier, Comparison
from sqlparse.tokens import Keyword, DML


class RelationshipExtractor:
    """
    Extracts table relationships from SQL statements.
    Handles JOIN operations, WHERE conditions, and subqueries.
    """
    
    def __init__(self):
        """Initialize the relationship extractor."""
        self.logger = logging.getLogger(__name__)
    
    def extract_relationships(self, sql_data):
        """
        Extract relationships from SQL data.
        
        Args:
            sql_data (dict): SQL data from the parser
            
        Returns:
            list: Extracted relationships
        """
        relationships = []
        
        try:
            sql = sql_data['sql']
            file_info = f"{sql_data['relative_path']} (L{sql_data['line_info']})"
            
            # 检查SQL是否包含UNION
            if re.search(r'\bUNION\b', sql, re.IGNORECASE):
                # 处理UNION查询
                return self._handle_union_query(sql, file_info)
            
            # Parse the SQL
            parsed = sqlparse.parse(sql)
            if not parsed:
                return relationships
                
            # Get the first statement
            stmt = parsed[0]
            
            # Extract table aliases
            aliases = self.extract_table_aliases(stmt)
            
            # Extract JOIN relationships
            join_relations = self.extract_join_relationships(stmt, aliases)
            for rel in join_relations:
                rel['source_file'] = file_info
                # Add potential FK/PK information
                rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                relationships.append(rel)
            
            # Extract WHERE relationships
            where_relations = self.extract_where_relationships(stmt, aliases)
            for rel in where_relations:
                rel['source_file'] = file_info
                # Add potential FK/PK information
                rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                relationships.append(rel)

            # Extract relationships from subqueries
            subquery_relations = self.extract_subquery_relationships(stmt, aliases)
            for rel in subquery_relations:
                rel['source_file'] = file_info
                # Add potential FK/PK information
                rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                relationships.append(rel)
                
        except Exception as e:
            self.logger.error(f"Error extracting relationships: {str(e)}")
        
        return relationships
    
    def extract_table_aliases(self, stmt):
        """
        Extract table aliases from a SQL statement.
        
        Args:
            stmt: Parsed SQL statement
            
        Returns:
            dict: Mapping of aliases to table names
        """
        aliases = {}
        
        # 使用正则表达式直接从SQL文本中提取所有表和别名
        sql_str = str(stmt)
        
        # 处理FROM子句中的表别名 - 匹配 FROM table [AS] alias
        from_patterns = [
            r'FROM\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)(?:\s*,|\s+(?:WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|GROUP|ORDER|HAVING|LIMIT|UNION)|\s*$)',
            r'FROM\s+([a-zA-Z0-9_\.]+)\s+([a-zA-Z0-9_]+)(?:\s*,|\s+(?:WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|GROUP|ORDER|HAVING|LIMIT|UNION)|\s*$)'
        ]
        
        for pattern in from_patterns:
            matches = re.finditer(pattern, sql_str, re.IGNORECASE)
            for match in matches:
                table, alias = match.groups()
                aliases[alias.lower()] = table.lower()
        
        # 处理JOIN子句中的表别名 - 匹配 JOIN table [AS] alias
        join_patterns = [
            r'(INNER|LEFT|RIGHT|FULL|CROSS)?\s+JOIN\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)',
            r'JOIN\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)'
        ]
        
        for pattern in join_patterns:
            matches = re.finditer(pattern, sql_str, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) == 3:  # 带JOIN类型的模式
                    join_type, table, alias = match.groups()
                    aliases[alias.lower()] = table.lower()
                elif len(match.groups()) == 2:  # 简单JOIN模式
                    table, alias = match.groups()
                    aliases[alias.lower()] = table.lower()
        
        # 处理逗号分隔的多表 - 匹配 FROM table1 [AS] alias1, table2 [AS] alias2
        comma_list_pattern = r'FROM\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)(?:\s*,\s*([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+))+(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+LIMIT|\s*$)'
        matches = re.finditer(comma_list_pattern, sql_str, re.IGNORECASE)
        for match in matches:
            all_groups = match.groups()
            for i in range(0, len(all_groups), 2):
                if i+1 < len(all_groups) and all_groups[i] and all_groups[i+1]:
                    table, alias = all_groups[i], all_groups[i+1]
                    aliases[alias.lower()] = table.lower()
                    
        return aliases
    
    def extract_join_relationships(self, stmt, aliases):
        """
        Extract relationships from JOIN clauses.
        
        Args:
            stmt: Parsed SQL statement
            aliases (dict): Table aliases
            
        Returns:
            list: Extracted relationships
        """
        relationships = []
        
        # Simple regex-based approach for JOIN extraction
        sql_str = str(stmt)
        
        # 更新JOIN模式，更准确地匹配表和别名
        # 格式：JOIN 表名 [AS] 别名 ON 条件
        join_patterns = [
            # 包含JOIN类型(INNER|LEFT|RIGHT)的模式
            r'(INNER|LEFT|RIGHT|FULL|CROSS)?\s+JOIN\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)',
            # 简单JOIN模式
            r'JOIN\s+([a-zA-Z0-9_\.]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)'
        ]
        
        for pattern in join_patterns:
            join_matches = re.finditer(pattern, sql_str, re.IGNORECASE)
            
            for match in join_matches:
                try:
                    if len(match.groups()) >= 7:  # Full pattern with join type
                        join_type, right_table, right_alias, left_table_alias, left_field, right_table_alias, right_field = match.groups()
                    else:  # Simple JOIN pattern
                        right_table, right_alias, left_table_alias, left_field, right_table_alias, right_field = match.groups()
                    
                    # 关键修复：正确处理JOIN中的表别名映射
                    # 确保将别名添加到aliases字典中
                    aliases[right_alias.lower()] = right_table.lower()
                    
                    # 解析表名和字段名
                    left_table = self._resolve_table_name(left_table_alias, aliases)
                    right_table = self._resolve_table_name(right_table_alias, aliases)
                    
                    # 创建关系
                    relationship = {
                        'source_table': left_table,
                        'source_field': left_field,
                        'target_table': right_table,
                        'target_field': right_field,
                        'relationship_type': 'JOIN'
                    }
                    
                    relationships.append(relationship)
                except Exception as e:
                    self.logger.error(f"Error parsing JOIN relationship: {str(e)}")
        
        return relationships
    
    def extract_where_relationships(self, stmt, aliases):
        """
        Extract relationships from WHERE clauses.
        
        Args:
            stmt: Parsed SQL statement
            aliases (dict): Table aliases
            
        Returns:
            list: Extracted relationships
        """
        relationships = []
        
        # Find WHERE clause
        where_clause = None
        where_seen = False
        
        for token in stmt.tokens:
            if where_seen:
                where_clause = token
                break
            elif token.ttype is Keyword and token.value.upper() == 'WHERE':
                where_seen = True
        
        if not where_clause:
            return relationships
        
        # Extract comparisons from WHERE clause
        comparisons = self._extract_comparisons(where_clause)
        
        for left, operator, right in comparisons:
            if operator != '=':
                continue
                
            # Check if both sides have table.column format
            left_parts = left.split('.')
            right_parts = right.split('.')
            
            if len(left_parts) == 2 and len(right_parts) == 2:
                left_table_alias, left_field = left_parts
                right_table_alias, right_field = right_parts
                
                # Resolve table names from aliases
                left_table = self._resolve_table_name(left_table_alias, aliases)
                right_table = self._resolve_table_name(right_table_alias, aliases)
                
                # Create relationship
                relationship = {
                    'source_table': left_table,
                    'source_field': left_field,
                    'target_table': right_table,
                    'target_field': right_field,
                    'relationship_type': 'WHERE'
                }
                
                relationships.append(relationship)
        
        return relationships
    
    def extract_subquery_relationships(self, stmt, aliases):
        """
        Extract relationships from subqueries.
        
        Args:
            stmt: Parsed SQL statement
            aliases (dict): Table aliases
            
        Returns:
            list: Extracted relationships
        """
        relationships = []
        
        # Get the SQL as string
        sql_str = str(stmt)
        
        # Find subqueries with aliases
        subquery_pattern = r'\(\s*(SELECT\s+.+?)\)\s+AS\s+([a-zA-Z0-9_]+)'
        subquery_matches = re.finditer(subquery_pattern, sql_str, flags=re.IGNORECASE | re.DOTALL)
        
        for match in subquery_matches:
            try:
                subquery_sql = match.group(1)
                subquery_alias = match.group(2)
                
                # Parse the subquery
                parsed_subquery = sqlparse.parse(subquery_sql)
                if not parsed_subquery:
                    continue
                    
                subquery_stmt = parsed_subquery[0]
                
                # Extract subquery table aliases and add to main aliases
                subquery_aliases = self.extract_table_aliases(subquery_stmt)
                for alias, table in subquery_aliases.items():
                    aliases[alias] = table
                
                # Add the subquery alias itself
                aliases[subquery_alias.lower()] = f"subquery_{subquery_alias.lower()}"
                
                # Extract JOIN relationships from the subquery
                subquery_join_relations = self.extract_join_relationships(subquery_stmt, aliases)
                relationships.extend(subquery_join_relations)
                
                # Extract WHERE relationships from the subquery
                subquery_where_relations = self.extract_where_relationships(subquery_stmt, aliases)
                relationships.extend(subquery_where_relations)
                
            except Exception as e:
                self.logger.error(f"Error extracting subquery relationships: {str(e)}")
        
        return relationships
    
    def _extract_comparisons(self, where_clause):
        """
        Extract comparisons from a WHERE clause.
        
        Args:
            where_clause: WHERE clause tokens
            
        Returns:
            list: Extracted comparisons as (left, operator, right) tuples
        """
        comparisons = []
        
        # Simple regex-based approach for comparison extraction
        sql_str = str(where_clause)
        
        # Find comparisons in the form table1.col1 = table2.col2
        comparison_pattern = r'([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s*(=|<>|!=|>|<|>=|<=)\s*([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)'
        comp_matches = re.finditer(comparison_pattern, sql_str)
        
        for match in comp_matches:
            left, operator, right = match.groups()
            comparisons.append((left, operator, right))
        
        return comparisons
    
    def _resolve_table_name(self, alias, aliases):
        """
        Resolve a table name from an alias.
        
        Args:
            alias (str): Table alias
            aliases (dict): Alias mappings
            
        Returns:
            str: Resolved table name
        """
        if not alias:
            return 'unknown'
            
        alias_lower = alias.lower()
        
        # 直接在别名映射中查找
        if alias_lower in aliases:
            return aliases[alias_lower]
            
        # 检查是否是已知表的别名别名（嵌套别名情况）
        # 例如：t1 -> customer, t2 -> t1，则t2实际指向customer
        checked_aliases = set()  # 防止循环引用
        current_alias = alias_lower
        
        while current_alias in aliases and current_alias not in checked_aliases:
            checked_aliases.add(current_alias)
            current_alias = aliases[current_alias].lower()
            if current_alias in aliases:
                return aliases[current_alias]
        
        # 假设是一个表名而不是别名
        # 但首先检查一个关键情况：别名不应该是其他表的别名
        for a, table in aliases.items():
            # 如果有表的别名是当前名称，则当前名称不太可能是表名
            if alias_lower == a:
                # 返回该别名对应的实际表名
                return table
        
        # 如果值存在于别名映射的值中，则很可能是一个真实表名
        # 例如：如果别名映射中有 {'t': 'customer', 'a': 'address'}
        # 当检查 'customer' 时，会返回 'customer'
        if any(alias_lower == table_name.lower() for table_name in aliases.values()):
            return alias_lower
        
        # 否则，可能是一个未在当前上下文中定义别名的表名
        return alias_lower
        
    def _is_potential_foreign_key(self, source_field, target_field):
        """
        Determine if the relationship is likely a foreign key relationship.
        
        Args:
            source_field (str): Source field name
            target_field (str): Target field name
            
        Returns:
            bool: True if likely a FK relationship
        """
        # Common patterns for foreign keys
        target_field_lower = target_field.lower()
        source_field_lower = source_field.lower()
        
        # If target is 'id' and source ends with '_id', likely a FK
        if target_field_lower == 'id' and source_field_lower.endswith('_id'):
            return True
            
        # If fields have the same name and one is 'id', likely a FK
        if (target_field_lower == 'id' and 'id' in source_field_lower) or \
           (source_field_lower == 'id' and 'id' in target_field_lower):
            return True
            
        # If identical field names, might be a relationship
        if source_field_lower == target_field_lower:
            return True
            
        return False
    
    def _handle_union_query(self, sql, file_info):
        """
        处理UNION查询，分别分析每个SELECT语句。
        
        Args:
            sql (str): 包含UNION的SQL字符串
            file_info (str): 文件信息
            
        Returns:
            list: 提取的关系列表
        """
        relationships = []
        
        try:
            # 使用正则表达式分割UNION查询的各个部分
            # 注意：这里假设UNION关键字不会出现在引号中
            union_pattern = r'\s+UNION\s+(ALL\s+)?'
            query_parts = re.split(union_pattern, sql, flags=re.IGNORECASE)
            
            # 过滤掉可能的"ALL"关键字
            select_queries = [part for part in query_parts if part and part.upper() != 'ALL']
            
            # 分别处理每个SELECT查询
            for query in select_queries:
                # 确保以SELECT开头
                if not re.match(r'^\s*SELECT\b', query, re.IGNORECASE):
                    query = f"SELECT {query}"
                
                # 解析子查询
                parsed = sqlparse.parse(query)
                if not parsed:
                    continue
                    
                stmt = parsed[0]
                
                # 提取表别名
                aliases = self.extract_table_aliases(stmt)
                
                # 提取JOIN关系
                join_relations = self.extract_join_relationships(stmt, aliases)
                for rel in join_relations:
                    rel['source_file'] = file_info
                    rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                    relationships.append(rel)
                
                # 提取WHERE关系
                where_relations = self.extract_where_relationships(stmt, aliases)
                for rel in where_relations:
                    rel['source_file'] = file_info
                    rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                    relationships.append(rel)
                
                # 提取子查询关系
                subquery_relations = self.extract_subquery_relationships(stmt, aliases)
                for rel in subquery_relations:
                    rel['source_file'] = file_info
                    rel['is_potential_fk'] = self._is_potential_foreign_key(rel['source_field'], rel['target_field'])
                    relationships.append(rel)
                    
        except Exception as e:
            self.logger.error(f"Error handling UNION query: {str(e)}")
            
        return relationships 