# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Lab Manager Server
Build: pyinstaller LabManager-Server.spec
"""

a = Analysis(
    ['server_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('firebase_key.json', '.'),
        ('ads.json', '.'),
        ('config.json', '.'),
        ('assets/myicon.ico', '.'),
    ],
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'flask_cors',
        'psycopg2',
        'psycopg2.extensions',
        'psycopg2._psycopg',
        'openpyxl',
        'openpyxl.styles',
        'pandas',
        'firebase_admin',
        'firebase_admin.credentials',
        'firebase_admin.db',
        'werkzeug',
        'werkzeug.security',
        'werkzeug.utils',
        'sqlalchemy',
        'sqlalchemy.dialects.postgresql',
        'jinja2',
        'json',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='LabManager-Server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/myicon.ico',
)
