#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MyBatis SQL Relationship Analyzer
Windows可执行文件入口点 - 独立版本
这个文件集成了必要的Flask应用程序代码，避免模块导入问题
"""
import os
import sys
import webbrowser
import threading
import time
import logging
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory

# 设置应用程序根目录
if getattr(sys, 'frozen', False):
    # 我们在一个PyInstaller包中
    APP_DIR = Path(sys._MEIPASS)
    print(f"运行在打包环境中, APP_DIR: {APP_DIR}")
else:
    # 在正常的Python环境中运行
    APP_DIR = Path(__file__).resolve().parent
    print(f"运行在开发环境中, APP_DIR: {APP_DIR}")

# 将项目根目录添加到系统路径
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))
    print(f"已添加 {APP_DIR} 到系统路径")

print(f"系统路径: {sys.path}")
print(f"当前目录: {os.getcwd()}")

# 确保可以导入必要的模块
try:
    print("尝试导入核心模块...")
    from core.analyzer import Analyzer
    from utils.config import Config
    from utils.exporter import Exporter
    print("成功导入核心模块")
except ImportError as e:
    print(f"无法导入核心模块: {e}")
    print("尝试调整导入路径...")
    
    # 这是一个备用方案，尝试在打包环境下找到正确的模块
    if getattr(sys, 'frozen', False):
        # 列出可用目录
        print(f"可用目录: {os.listdir(APP_DIR)}")
        
        # 探测各种可能的路径
        possible_paths = [
            os.path.join(APP_DIR, 'core'),
            os.path.join(APP_DIR, 'utils'),
            os.path.join(APP_DIR, 'web'),
            # 更多可能的路径...
        ]
        
        for path in possible_paths:
            if os.path.exists(path) and path not in sys.path:
                sys.path.append(path)
                print(f"添加路径: {path}")
        
        try:
            # 再次尝试导入
            from core.analyzer import Analyzer
            from utils.config import Config
            from utils.exporter import Exporter
            print("成功导入核心模块(第二次尝试)")
        except ImportError as e2:
            print(f"所有导入尝试都失败: {e2}")
            print("启动失败，程序将退出")
            time.sleep(10)  # 给用户时间阅读错误信息
            sys.exit(1)

# 为输出创建目录
output_dir = os.path.join(os.getcwd(), 'output')
if not os.path.exists(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print(f"创建输出目录: {output_dir}")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 加载配置
config = Config()

# 初始化分析器
analyzer = Analyzer(max_depth=config.get_int('MAX_DEPTH', 3))

# 初始化导出器
exporter = Exporter(output_dir=output_dir)

# 创建Flask应用
app = Flask(__name__, 
            template_folder=os.path.join(APP_DIR, 'web', 'templates'),
            static_folder=os.path.join(APP_DIR, 'web', 'static'))
app.config['SECRET_KEY'] = os.urandom(24)

@app.route('/')
def index():
    """渲染首页"""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    分析MyBatis XML文件目录
    
    期望:
        directory_path: 包含MyBatis XML文件的目录路径
        
    返回:
        包含分析结果的JSON
    """
    try:
        data = request.get_json()
        directory_path = data.get('directory_path', '')
        
        if not directory_path:
            return jsonify({'error': '未提供目录路径'}), 400
        
        # 分析目录
        results = analyzer.analyze_directory(directory_path)
        
        # 导出结果
        plantuml_path = exporter.export_plantuml(results['diagram'])
        svg_path = exporter.export_svg(results['diagram'])
        csv_path = exporter.export_csv(results['relationships'])
        json_path = exporter.export_json(results)
        markdown_path = exporter.export_markdown(results)
        
        # 准备响应
        response = {
            'success': True,
            'message': f"分析完成。找到 {results['stats']['total_entities']} 个表和 {results['stats']['total_relationships']} 个关系。",
            'diagram': results['diagram'],
            'entities': list(results['entities'].keys()),
            'relationships': results['relationships'],
            'files': {
                'plantuml': os.path.basename(plantuml_path) if plantuml_path else None,
                'svg': os.path.basename(svg_path) if svg_path else None,
                'csv': os.path.basename(csv_path) if csv_path else None,
                'json': os.path.basename(json_path) if json_path else None,
                'markdown': os.path.basename(markdown_path) if markdown_path else None
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"分析过程中出错: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """
    下载生成的文件
    
    Args:
        filename: 要下载的文件名
        
    Returns:
        要下载的文件
    """
    return send_from_directory(output_dir, filename, as_attachment=True)

@app.route('/config')
def get_config():
    """
    获取当前配置
    
    Returns:
        包含配置值的JSON
    """
    config_values = {
        'debug_mode': config.get_bool('DEBUG_MODE', False),
        'max_depth': config.get_int('MAX_DEPTH', 3),
        'output_dir': config.get('OUTPUT_DIR', './output'),
        'plantuml_server': config.get('PLANTUML_SERVER', 'http://www.plantuml.com/plantuml/svg/'),
        'version': '1.2.0'
    }
    
    return jsonify(config_values)

# 自动打开浏览器的函数
def open_browser():
    """等待服务器启动后自动打开浏览器"""
    # 等待2秒，确保Flask服务器已经启动
    time.sleep(2)
    
    # 尝试打开浏览器
    try:
        print("正在打开浏览器...")
        webbrowser.open('http://localhost:5000')
    except Exception as e:
        print(f"无法打开浏览器: {e}")
        print("请手动访问: http://localhost:5000")

# 打印欢迎信息
def print_welcome():
    """打印欢迎信息和使用说明"""
    print("\n" + "="*70)
    print(" "*20 + "MyBatis SQL Relationship Analyzer")
    print("="*70)
    print("\n欢迎使用MyBatis SQL Relationship Analyzer！")
    print("\n本工具将帮助您分析MyBatis XML文件，提取数据库表关系并生成ER图。")
    print("\n使用说明:")
    print("1. 浏览器将自动打开应用界面")
    print("2. 如未自动打开，请手动访问: http://localhost:5000")
    print("3. 在应用界面中输入MyBatis XML文件目录并点击'分析'按钮")
    print("4. 生成的文件将保存到: " + output_dir)
    print("\n请保持此窗口打开。关闭此窗口将终止应用程序。")
    print("="*70 + "\n")

# 启动Flask应用
def start_app():
    """启动Flask应用"""
    host = config.get('HOST', '0.0.0.0')
    port = config.get_int('PORT', 5000)
    debug = config.get_bool('DEBUG_MODE', False)
    
    # 在生产环境中禁用调试模式
    if getattr(sys, 'frozen', False):
        debug = False
    
    print(f"启动服务器: {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    print_welcome()
    
    # 在新线程中打开浏览器，以免阻塞主线程
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # 启动Flask应用
    print("正在启动Web服务...")
    start_app() 