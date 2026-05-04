@echo off
REM ============================================================
REM Build Client EXE - Lab Manager DPT (Modern UI)
REM ============================================================
echo.
echo  ============================================
echo   LAB MANAGER - BUILD CLIENT EXE
echo   Modern UI Edition with CustomTkinter
echo  ============================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python khong duoc cai dat hoac khong co trong PATH!
    pause
    exit /b 1
)

REM Install dependencies
echo [1/3] Cai dat dependencies...
pip install -r requirements.txt --quiet

REM Clean old build
echo [2/3] Don dep build cu...
if exist "dist\DPT-Client.exe" del /q "dist\DPT-Client.exe"
if exist "build\DPT-Client" rmdir /s /q "build\DPT-Client"

REM Build EXE
echo [3/3] Dang build Client EXE...
pyinstaller ^
    --noconsole ^
    --onefile ^
    --icon=assets/myicon.ico ^
    --add-data "assets/background.jpg;." ^
    --add-data "firebase_key.json;." ^
    --add-data "server_config.json;." ^
    --hidden-import=customtkinter ^
    --hidden-import=PIL ^
    --hidden-import=qrcode ^
    --hidden-import=firebase_admin ^
    --collect-all customtkinter ^
    --name "DPT-Client" ^
    client_app.py

echo.
if exist "dist\DPT-Client.exe" (
    echo  ============================================
    echo   BUILD THANH CONG!
    echo   File: dist\DPT-Client.exe
    echo  ============================================
    echo.
    echo  De deploy len may client:
    echo   1. Copy DPT-Client.exe + server_config.json
    echo   2. Sua server_config.json voi IP may server
    echo   3. Chay DPT-Client.exe voi quyen Admin
    echo.
) else (
    echo  [ERROR] Build that bai! Kiem tra log phia tren.
)

pause
