#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MyBatis SQL Relationship Analyzer
Windows可执行文件入口点 - 完全独立版本

这个文件是一个完全独立的入口点，包含了启动应用程序所需的所有关键逻辑。
具有完善的错误处理和导入保护机制，确保在打包环境中可以正确运行。
"""
import os
import sys
import webbrowser
import threading
import time
import logging
import traceback
from pathlib import Path

# 全局变量，用于在出现导入错误时记录详细信息
IMPORT_ERROR_DETAILS = []

# 设置字符编码
if sys.stdout.encoding != 'utf-8':
    try:
        # 在Windows上设置控制台编码为UTF-8
        if sys.platform == 'win32':
            import ctypes
            kernel32 = ctypes.WinDLL('kernel32')
            kernel32.SetConsoleCP(65001)
            kernel32.SetConsoleOutputCP(65001)
    except Exception as e:
        print(f"无法设置控制台编码: {e}")

# 设置应用程序根目录
def setup_app_directory():
    """设置应用程序根目录并配置Python导入路径"""
    if getattr(sys, 'frozen', False):
        # 我们在一个PyInstaller包中
        app_dir = Path(sys._MEIPASS)
        print(f"运行在打包环境中, APP_DIR: {app_dir}")
        
        # 将PyInstaller解压目录添加到Python路径
        if str(app_dir) not in sys.path:
            sys.path.insert(0, str(app_dir))
            print(f"已添加 {app_dir} 到系统路径")
        
        # 打印可用目录，帮助调试
        try:
            print(f"可用目录: {os.listdir(app_dir)}")
        except Exception as e:
            print(f"无法列出目录内容: {e}")
    else:
        # 在正常的Python环境中运行
        app_dir = Path(__file__).resolve().parent
        print(f"运行在开发环境中, APP_DIR: {app_dir}")
        
        # 获取项目根目录（当前文件的父目录）
        project_root = app_dir.parent
        
        # 确保项目根目录在路径中
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))
            print(f"已添加项目根目录 {project_root} 到系统路径")
    
    # 打印系统路径和当前目录，帮助调试
    print(f"系统路径: {sys.path}")
    print(f"当前目录: {os.getcwd()}")
    
    return app_dir

# 安全导入函数
def safe_import(module_name):
    """安全地导入模块，捕获并记录任何错误"""
    try:
        module = __import__(module_name, fromlist=['*'])
        return module
    except ImportError as e:
        error_info = {
            'module': module_name,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        IMPORT_ERROR_DETAILS.append(error_info)
        print(f"导入 {module_name} 失败: {e}")
        return None

# 创建输出目录
def setup_output_directory():
    """创建输出目录，用于保存生成的文件"""
    output_dir = os.path.join(os.getcwd(), 'output')
    try:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            print(f"创建输出目录: {output_dir}")
        return output_dir
    except Exception as e:
        print(f"创建输出目录时出错: {e}")
        # 作为备用方案，尝试在临时目录中创建输出文件夹
        import tempfile
        temp_output = os.path.join(tempfile.gettempdir(), 'mybatis_analyzer_output')
        os.makedirs(temp_output, exist_ok=True)
        print(f"使用临时输出目录: {temp_output}")
        return temp_output

# 自动打开浏览器的函数
def open_browser(port=5000):
    """等待服务器启动后自动打开浏览器"""
    # 等待服务器启动
    time.sleep(2)
    
    # 尝试打开浏览器
    try:
        url = f'http://localhost:{port}'
        print(f"正在打开浏览器 {url}...")
        webbrowser.open(url)
        print("浏览器已启动")
    except Exception as e:
        print(f"无法打开浏览器: {e}")
        print(f"请手动访问: http://localhost:{port}")

# 打印欢迎信息
def print_welcome(output_dir):
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

# 主函数
def main():
    """应用程序主入口"""
    try:
        # 配置应用程序目录
        app_dir = setup_app_directory()
        
        # 设置输出目录
        output_dir = setup_output_directory()
        
        # 设置环境变量
        os.environ['FLASK_APP'] = 'web.app'
        os.environ['FLASK_ENV'] = 'production'
        os.environ['OUTPUT_DIR'] = output_dir
        
        # 尝试导入Flask
        from flask import Flask, render_template, request, jsonify, send_from_directory
        
        # 尝试导入核心模块
        from core.analyzer import Analyzer
        from utils.config import Config
        from utils.exporter import Exporter
        
        # 配置日志
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger = logging.getLogger(__name__)
        
        # 加载配置
        config = Config()
        
        # 打印欢迎信息
        print_welcome(output_dir)
        
        # 初始化分析器
        analyzer = Analyzer(max_depth=config.get_int('MAX_DEPTH', 3))
        
        # 初始化导出器
        exporter = Exporter(output_dir=output_dir)
        
        # 创建Flask应用
        app = Flask(__name__, 
                    template_folder=os.path.join(app_dir, 'web', 'templates'),
                    static_folder=os.path.join(app_dir, 'web', 'static'))
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
                    'message': f"分析完成。找到 {results.get('stats', {}).get('total_entities', 0)} 个表和 {results.get('stats', {}).get('total_relationships', 0)} 个关系。",
                    'diagram': results['diagram'],
                    'entities': list(results.get('entities', {}).keys()),
                    'relationships': results.get('relationships', []),
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
                logger.error(traceback.format_exc())
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
            
            # 在新线程中打开浏览器
            browser_thread = threading.Thread(target=open_browser, args=(port,))
            browser_thread.daemon = True
            browser_thread.start()
            
            # 启动Flask应用
            app.run(host=host, port=port, debug=debug)
        
        # 启动应用
        print("正在启动Web服务...")
        start_app()
        
    except Exception as e:
        print("\n" + "="*70)
        print("启动应用程序时出错:")
        print(str(e))
        print("\n完整错误跟踪:")
        traceback.print_exc()
        
        if IMPORT_ERROR_DETAILS:
            print("\n导入错误详情:")
            for error in IMPORT_ERROR_DETAILS:
                print(f"模块: {error['module']}")
                print(f"错误: {error['error']}")
                print(f"跟踪: {error['traceback']}")
                print("-" * 50)
        
        print("\n请检查以上错误信息并确保所有必要文件都包含在可执行文件中。")
        print("="*70)
        
        # 等待用户查看错误信息
        input("\n按Enter键退出...")
        return 1
    
    return 0

# 应用入口
if __name__ == "__main__":
    sys.exit(main()) 