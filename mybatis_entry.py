#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MyBatis SQL Relationship Analyzer
Windows可执行文件入口点
"""
import os
import sys
import webbrowser
import threading
import time
from pathlib import Path

# 设置应用程序根目录
if getattr(sys, 'frozen', False):
    # 我们在一个PyInstaller包中
    APP_DIR = Path(sys._MEIPASS)
    
    # 关键修复：将应用路径添加到系统路径，确保可以找到模块
    if APP_DIR not in sys.path:
        sys.path.insert(0, str(APP_DIR))
        # 由于PyInstaller打包后的文件结构，我们需要特别处理导入路径
        print(f"已添加 {APP_DIR} 到系统路径")
        # 列出可用模块，帮助调试
        print(f"可用目录: {os.listdir(APP_DIR)}")
else:
    # 在正常的Python环境中运行
    APP_DIR = Path(__file__).resolve().parent
    
    # 添加项目根目录到系统路径
    if APP_DIR not in sys.path:
        sys.path.insert(0, str(APP_DIR))

print(f"应用程序目录: {APP_DIR}")

# 为输出创建临时目录
output_dir = os.path.join(os.getcwd(), 'output')
if not os.path.exists(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print(f"创建输出目录: {output_dir}")

# 设置环境变量
os.environ['FLASK_APP'] = 'web.app'
os.environ['FLASK_ENV'] = 'production'
os.environ['OUTPUT_DIR'] = output_dir

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

# 修改导入方式，使用更安全的加载方法
print("正在导入应用模块...")
try:
    # 使用绝对导入
    import web.app
    start_app = web.app.start_app
    print("成功导入web.app模块")
except ImportError as e:
    print(f"导入web.app模块失败: {e}")
    print("尝试备用导入方法...")
    
    # 备用方法：直接从app.py导入
    try:
        # 对于打包环境，尝试直接导入app.py
        sys.path.append(str(APP_DIR / 'web'))
        from web.app import start_app
        print("成功使用备用方法导入")
    except ImportError as e2:
        print(f"所有导入尝试都失败: {e2}")
        print("请确保'web'目录在正确的位置，并包含app.py文件")
        sys.exit(1)

if __name__ == "__main__":
    print_welcome()
    
    # 在新线程中打开浏览器，以免阻塞主线程
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # 启动Flask应用
    print("正在启动Web服务...")
    start_app() 