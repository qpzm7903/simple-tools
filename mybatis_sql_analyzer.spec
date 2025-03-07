# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['mybatis_entry_final.py'],
    pathex=[],
    binaries=[],
    datas=[('web/templates', 'web/templates'), ('web/static', 'web/static'), ('examples', 'examples'), ('core', 'core'), ('utils', 'utils'), ('.env.example', '.')],
    hiddenimports=['engineio.async_drivers.threading', 'sqlparse.tokens', 'sqlparse.sql', 'lxml.etree', 'plantuml', 'six', 'web', 'web.app', 'core', 'core.analyzer', 'utils', 'utils.config', 'utils.exporter', 'flask', 'flask.templating', 'jinja2', 'werkzeug'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'numpy', 'pandas', 'PyQt5', 'PySide2', 'PIL', 'tkinter', 'babel', 'sphinx', 'pytest', 'notebook', 'jupyter', 'test', 'tests', 'testing'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='mybatis_sql_analyzer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
