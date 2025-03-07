"""
PyInstaller钩子文件 - 处理web.app模块及其依赖

该文件帮助PyInstaller正确处理web.app模块和相关依赖。
PyInstaller会自动使用该文件作为钩子，无需显式指定。
"""
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 收集web包及其子模块
hiddenimports = [
    'web',
    'web.app',
    'core',
    'core.analyzer', 
    'utils',
    'utils.config',
    'utils.exporter',
    'flask.templating',
    'jinja2.ext',
    'werkzeug.routing',
    'werkzeug.exceptions',
    'werkzeug.security',
]

# 收集数据文件
datas = collect_data_files('web')

# 添加模板和静态文件
datas += [
    ('web/templates', 'web/templates'),
    ('web/static', 'web/static'),
] 