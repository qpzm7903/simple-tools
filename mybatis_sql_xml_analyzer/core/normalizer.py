"""
Data Normalizer module.
Normalizes table and field names, merges duplicate entities.
"""
import logging
import re


class Normalizer:
    """
    Normalizes data from SQL relationship extraction.
    Handles case normalization and entity merging.
    """
    
    def __init__(self):
        """Initialize the normalizer."""
        self.logger = logging.getLogger(__name__)
    
    def normalize_relationships(self, relationships):
        """
        Normalize relationships by removing duplicates and handling aliases.
        
        Args:
            relationships (list): Extracted relationships
            
        Returns:
            list: Normalized relationships
        """
        filtered = []
        
        # 首先过滤掉可能是别名的表名
        for rel in relationships:
            source_table = rel['source_table'].lower()
            target_table = rel['target_table'].lower()
            
            # 过滤可能是别名的表名（单个字母或非常短的名称）
            if len(source_table) <= 1 or len(target_table) <= 1:
                continue
                
            # 过滤常见别名模式 (扩展为更多常见的别名)
            common_aliases = [
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
                'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
                'tmp', 'temp', 'alias', 'subquery', 'result', 'tab',
                'tb', 't1', 't2', 't3', 'ta', 'tb', 'tc', 'td',
                'su', 'sa', 'sb', 'sc', 'sd', 'st', 'sr', 
                'ua', 'ub', 'uc', 'ud', 'ut', 'us', 'ur'
            ]
            if source_table in common_aliases or target_table in common_aliases:
                continue
                
            # 过滤明显是别名的表名模式 (扩展为更多的别名模式)
            alias_patterns = [
                r'^[a-z]{1,2}\d*$',        # 1-2个字母后跟可选数字 (a, b1, su, t1, t2, ab, ab1)
                r'^[a-z]{1,3}_[a-z]{1,2}$', # 短前缀_短后缀 (sys_u, t_u, d_t)
                r'^tmp\d*$',               # tmp开头 (tmp, tmp1, tmp2)
                r'^temp\d*$',              # temp开头 (temp, temp1, temp2)
                r'^subq\d*$',              # subq开头 (subq, subq1, subq2)
                r'^alias\d*$',             # alias开头 (alias, alias1, alias2)
                r'^result\d*$',            # result开头 (result, result1, result2)
                r'^[a-z]{1,2}[A-Z]$'       # 短前缀大写字母 (tA, uB)
            ]
            
            is_alias = False
            for pattern in alias_patterns:
                if (re.match(pattern, source_table) or re.match(pattern, target_table)):
                    is_alias = True
                    break
                    
            if is_alias:
                continue
                
            # 专门针对JOIN语句中常见的别名进行过滤
            join_aliases = [
                'str', 'st', 'su', 'sp', 'sa', 'sb', 'sc', 'sd', 'se',  # sys_table_relation缩写
                'us', 'ut', 'ur', 'up',  # user_table缩写
                'pt', 'pc', 'pr'  # product_table缩写
            ]
            if source_table in join_aliases or target_table in join_aliases:
                continue
                
            # 过滤UNION查询中通常用作别名的表名
            union_aliases = ['union_result', 'union_subquery', 'unioned', 'combined', 'merged']
            if source_table in union_aliases or target_table in union_aliases:
                continue
                
            # UNION查询中的特殊情况：明显是UNION结果的别名的表
            if 'union' in source_table or 'union' in target_table:
                continue
                
            filtered.append(rel)
        
        # 然后进行标准化处理
        normalized = []
        relationship_map = {}  # 用于跟踪和合并双向关系
        
        for rel in filtered:
            normalized_rel = {
                'source_table': rel['source_table'].lower(),
                'source_field': rel['source_field'].lower(),
                'target_table': rel['target_table'].lower(),
                'target_field': rel['target_field'].lower(),
                'relationship_type': rel['relationship_type'],
                'source_file': rel['source_file']
            }
            
            # 对特殊情况进行处理 - 表名缩写
            # 如果表名长度超短(2-3个字符)并且不是主要表名，可能是缩写
            if len(normalized_rel['source_table']) <= 3 or len(normalized_rel['target_table']) <= 3:
                # 检查是否是已知的主要表名
                primary_tables = ['sys', 'user', 'role', 'menu', 'dept', 'log', 'doc', 'file']
                source_is_primary = any(normalized_rel['source_table'] == pt for pt in primary_tables)
                target_is_primary = any(normalized_rel['target_table'] == pt for pt in primary_tables)
                
                if not source_is_primary and not target_is_primary:
                    continue
            
            # 处理双向关系 - 检查是否存在反向的关系
            # 例如: A.id = B.a_id 和 B.a_id = A.id 本质上是同一关系
            
            # 创建关系的正向和反向键
            forward_key = (
                normalized_rel['source_table'],
                normalized_rel['source_field'],
                normalized_rel['target_table'],
                normalized_rel['target_field']
            )
            
            reverse_key = (
                normalized_rel['target_table'],
                normalized_rel['target_field'],
                normalized_rel['source_table'],
                normalized_rel['source_field']
            )
            
            # 检查反向关系是否已经存在
            if reverse_key in relationship_map:
                # 已存在反向关系，我们需要决定保留哪个方向
                # 通常外键指向主键的方向更有意义（例如：user_id -> id）
                
                # 检查哪个字段更可能是主键
                current_is_pk = self._is_likely_primary_key(normalized_rel['target_field'])
                reverse_is_pk = self._is_likely_primary_key(normalized_rel['source_field'])
                
                # 如果当前关系的目标字段是主键，保留这个方向
                if current_is_pk and not reverse_is_pk:
                    # 用当前关系替换已存在的反向关系
                    rel_index = relationship_map[reverse_key]
                    normalized[rel_index] = normalized_rel
                    # 更新映射
                    relationship_map.pop(reverse_key)
                    relationship_map[forward_key] = rel_index
                # 否则保留已存在的反向关系
                continue
            
            # 检查正向关系是否已经存在
            if forward_key in relationship_map:
                # 正向关系已存在，跳过（重复）
                continue
                
            # 新关系，添加到结果中
            normalized.append(normalized_rel)
            relationship_map[forward_key] = len(normalized) - 1
        
        return normalized
    
    def _is_likely_primary_key(self, field_name):
        """
        判断一个字段是否可能是主键。
        
        Args:
            field_name (str): 字段名称
            
        Returns:
            bool: 如果字段可能是主键返回True
        """
        field_name = field_name.lower()
        
        # 常见的主键命名模式
        primary_key_patterns = [
            r'^id$',                     # 精确匹配"id"
            r'^pk_',                     # 以pk_开头
            r'^primary',                 # 以primary开头
            r'_pk$',                     # 以_pk结尾
            r'_id$',                     # 以_id结尾（如table_id）
            r'^uuid$',                   # 精确匹配"uuid"
            r'^guid$'                    # 精确匹配"guid"
        ]
        
        for pattern in primary_key_patterns:
            if re.search(pattern, field_name):
                return True
                
        return False
    
    def extract_entities(self, relationships):
        """
        Extract entities from relationships.
        
        Args:
            relationships (list): List of relationship dictionaries
            
        Returns:
            dict: Dictionary of entities with their fields
        """
        entities = {}
        
        for rel in relationships:
            # Process source table
            source_table = rel['source_table']
            source_field = rel['source_field']
            
            if source_table not in entities:
                entities[source_table] = {'fields': set(), 'primary_key': None}
            
            entities[source_table]['fields'].add(source_field)
            
            # Process target table
            target_table = rel['target_table']
            target_field = rel['target_field']
            
            if target_table not in entities:
                entities[target_table] = {'fields': set(), 'primary_key': None}
            
            entities[target_table]['fields'].add(target_field)
            
            # Heuristic: If field name is 'id', it's likely a primary key
            if source_field.lower() == 'id':
                entities[source_table]['primary_key'] = 'id'
            
            if target_field.lower() == 'id':
                entities[target_table]['primary_key'] = 'id'
        
        # Convert field sets to sorted lists
        for entity in entities.values():
            entity['fields'] = sorted(list(entity['fields']))
        
        return entities
    
    def merge_duplicates(self, entities):
        """
        Merge duplicate entity definitions.
        
        Args:
            entities (dict): Dictionary of entities
            
        Returns:
            dict: Merged entities
        """
        # Already merged in extract_entities using a dictionary
        return entities
    
    def resolve_primary_keys(self, entities, relationships):
        """
        Resolve primary keys based on relationships.
        
        Args:
            entities (dict): Dictionary of entities
            relationships (list): List of relationship dictionaries
            
        Returns:
            dict: Entities with resolved primary keys
        """
        # Count how many times each field is used as a target field
        field_references = {}
        
        for rel in relationships:
            target_key = f"{rel['target_table']}.{rel['target_field']}"
            if target_key not in field_references:
                field_references[target_key] = 0
            field_references[target_key] += 1
        
        # Fields with most references are likely primary keys
        for entity_name, entity in entities.items():
            if entity['primary_key'] is None:
                max_refs = 0
                primary_key = None
                
                for field in entity['fields']:
                    key = f"{entity_name}.{field}"
                    refs = field_references.get(key, 0)
                    
                    if refs > max_refs:
                        max_refs = refs
                        primary_key = field
                
                if primary_key:
                    entity['primary_key'] = primary_key
        
        return entities 