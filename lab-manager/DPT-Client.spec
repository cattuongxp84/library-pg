# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Lab Manager Client (Modern UI)
Build: pyinstaller DPT-Client.spec
"""

import os
import customtkinter

ctk_path = os.path.dirname(customtkinter.__file__)

a = Analysis(
    ['client_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('assets/background.jpg', '.'),
        ('assets/myicon.ico', '.'),
        ('firebase_key.json', '.'),
        ('server_config.json', '.'),
        (ctk_path, 'customtkinter'),
    ],
    hiddenimports=[
        'customtkinter',
        'PIL',
        'PIL.Image',
        'PIL.ImageTk',
        'PIL.ImageDraw',
        'PIL.ImageGrab',
        'PIL.ImageFilter',
        'PIL.ImageSequence',
        'qrcode',
        'qrcode.image.pil',
        'firebase_admin',
        'firebase_admin.credentials',
        'firebase_admin.db',
        'flask',
        'werkzeug',
        'werkzeug.serving',
        'keyboard',
        'psutil',
        'requests',
        'sqlite3',
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
    name='DPT-Client',
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
