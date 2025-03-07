#!/usr/bin/env python
"""
构建脚本：将MyBatis SQL Relationship Analyzer打包为Windows可执行文件

使用方法:
    python build_executable.py

输出:
    dist/mybatis_sql_analyzer.exe - 独立可执行文件
    dist/mybatis_sql_analyzer/ - 包含所有依赖的目录
"""
import os
import sys
import shutil
import subprocess
import time
from pathlib import Path
import pyinstaller_config as config

# 确保正确的工作目录
script_dir = Path(__file__).resolve().parent
os.chdir(script_dir)

# 创建构建目录
def setup_build_environment():
    """创建必要的构建目录"""
    build_dir = script_dir / 'build'
    dist_dir = script_dir / 'dist'
    
    # 如果存在则删除旧的构建文件
    try:
        if build_dir.exists():
            print(f"删除旧的构建目录: {build_dir}")
            shutil.rmtree(build_dir)
        
        if dist_dir.exists():
            print(f"删除旧的分发目录: {dist_dir}")
            # 在删除目录前等待一段时间，以防其他进程正在使用
            time.sleep(2)
            shutil.rmtree(dist_dir)
        
        # 等待确保目录被完全删除
        time.sleep(1)
        
        print("设置干净的构建环境")
        os.makedirs(build_dir, exist_ok=True)
        os.makedirs(dist_dir, exist_ok=True)
        
        return True
    except Exception as e:
        print(f"创建构建环境时出错: {e}")
        print("尝试不删除旧目录而继续构建...")
        return False

def prepare_entry_file():
    """准备入口点文件"""
    print("准备入口点文件...")
    
    # 首先尝试使用全新的完全独立版本
    final_entry = script_dir / 'temp_build' / 'mybatis_entry_final.py'
    
    if final_entry.exists():
        # 复制到项目根目录
        target_entry = script_dir / 'mybatis_entry_final.py'
        shutil.copy2(final_entry, target_entry)
        print(f"使用完全独立的入口点文件: {target_entry}")
        return target_entry
    
    print("未找到完全独立的入口点文件，使用默认入口点")
    return script_dir / 'mybatis_entry_standalone.py'

def build_executable(entry_file):
    """运行PyInstaller构建可执行文件"""
    print(f"开始使用PyInstaller构建，入口点: {entry_file}")
    
    # 检查入口点文件是否存在
    if not entry_file.exists():
        print(f"错误: 入口点文件 {entry_file} 不存在")
        return False
    
    # 检查目标目录是否存在
    data_dirs = ['web/templates', 'web/static', 'examples', 'core', 'utils']
    for data_dir in data_dirs:
        if not os.path.exists(os.path.join(script_dir, data_dir)):
            print(f"警告: 数据目录 {data_dir} 不存在")
    
    # 基本命令
    cmd = [
        'pyinstaller',
        '--name=mybatis_sql_analyzer',
        '--onefile',  # 创建单个EXE
        '--clean',
        '--noconfirm',
    ]
    
    # 添加数据文件
    for data_dir in data_dirs:
        if os.path.exists(os.path.join(script_dir, data_dir)):
            cmd.append(f'--add-data={data_dir};{data_dir}')
    
    # 添加环境示例文件
    if os.path.exists('.env.example'):
        cmd.append('--add-data=.env.example;.')
    
    # 添加图标
    if config.ICON_FILE and os.path.exists(config.ICON_FILE):
        cmd.append(f'--icon={config.ICON_FILE}')
    
    # 添加隐藏导入
    for imp in config.HIDDEN_IMPORTS:
        cmd.append(f'--hidden-import={imp}')
    
    # 添加排除包
    for exc in config.EXCLUDES:
        cmd.append(f'--exclude-module={exc}')
    
    # 设置控制台模式
    cmd.append('--console')  # 显示控制台窗口
    
    # 添加入口点脚本
    cmd.append(str(entry_file))
    
    # 执行PyInstaller命令
    print(f"执行命令: {' '.join(cmd)}")
    
    try:
        process = subprocess.run(cmd, capture_output=True, text=True)
        
        # 保存日志文件
        with open('pyinstaller_build.log', 'w', encoding='utf-8') as f:
            f.write(f"Command: {' '.join(cmd)}\n\n")
            f.write("=== STDOUT ===\n")
            f.write(process.stdout)
            f.write("\n\n=== STDERR ===\n")
            f.write(process.stderr)
        
        # 显示输出摘要
        print("\nPyInstaller 输出摘要:")
        print(process.stdout[-2000:] if len(process.stdout) > 2000 else process.stdout)
        
        if process.returncode != 0:
            print("\n构建错误:")
            print(process.stderr[-2000:] if len(process.stderr) > 2000 else process.stderr)
            print("\n完整日志已保存到 pyinstaller_build.log")
            return False
        
        return True
    except Exception as e:
        print(f"执行PyInstaller时出错: {e}")
        return False

def create_readme():
    """创建README文件到dist目录"""
    readme_file = script_dir / 'dist' / 'README.txt'
    
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(readme_file), exist_ok=True)
        
        # 创建README内容
        readme_content = """# MyBatis SQL Relationship Analyzer

## 使用说明

1. 双击运行 `mybatis_sql_analyzer.exe` 启动应用程序
2. 启动后会自动打开浏览器访问应用界面，如未自动打开，请手动访问 http://localhost:5000
3. 在应用界面中，输入包含MyBatis XML文件的目录路径，点击"分析"按钮
4. 分析完成后，您可以在界面上查看ER图、表关系信息，并可以导出各种格式的文件
5. 所有导出的文件将保存在应用程序所在目录的 `output` 文件夹中

## 注意事项

- 首次运行时，Windows可能会弹出防火墙提示，请允许程序访问网络
- 应用程序运行时会显示一个命令行窗口，请不要关闭此窗口，否则应用程序将停止运行
- 如果需要停止应用程序，可以关闭命令行窗口或按Ctrl+C

## 故障排除

- 如果浏览器未自动打开，请手动访问 http://localhost:5000
- 如果端口5000被占用，应用可能会使用其他端口，请查看命令行窗口中的输出信息
- 如果出现"未响应"或其他错误，请尝试重新启动应用程序

## 支持与反馈

如有问题或建议，请联系开发团队或提交GitHub Issue。

---

感谢您使用MyBatis SQL Relationship Analyzer！"""
        
        # 写入README文件
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print(f"已创建README文件: {readme_file}")
        return True
    except Exception as e:
        print(f"创建README文件时出错: {e}")
        return False

def cleanup_temp_files(entry_file):
    """清理临时文件"""
    try:
        # 如果入口点文件在根目录但是从temp_build复制过来的，则删除
        if entry_file.name == 'mybatis_entry_final.py' and entry_file.parent == script_dir:
            os.remove(entry_file)
            print(f"已删除临时入口点文件: {entry_file}")
    except Exception as e:
        print(f"清理临时文件时出错: {e}")

def main():
    """主构建流程"""
    print(f"开始构建 {config.APP_NAME} v{config.APP_VERSION}")
    
    try:
        # 设置环境
        setup_build_environment()
        
        # 准备入口点文件
        entry_file = prepare_entry_file()
        
        # 构建可执行文件
        success = build_executable(entry_file)
        
        if success:
            # 创建README
            create_readme()
            
            # 检查是否成功生成了可执行文件
            exe_path = script_dir / 'dist' / 'mybatis_sql_analyzer.exe'
            if exe_path.exists():
                print(f"构建成功！可执行文件位于: {exe_path}")
                print(f"文件大小: {exe_path.stat().st_size / (1024*1024):.2f} MB")
                print("你可以将此文件分发给Windows用户，他们无需安装任何依赖项即可运行。")
            else:
                print(f"警告: 可执行文件 {exe_path} 不存在，可能构建失败")
        else:
            print("构建失败，请检查错误信息")
        
        # 清理临时文件
        cleanup_temp_files(entry_file)
    
    except Exception as e:
        print(f"构建过程中发生错误: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 