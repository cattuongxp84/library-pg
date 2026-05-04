@echo off
REM ============================================================
REM Build Server EXE - Lab Manager DPT
REM ============================================================
echo.
echo  ============================================
echo   LAB MANAGER - BUILD SERVER EXE
echo   Admin Dashboard + API Server
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
if exist "dist\LabManager-Server.exe" del /q "dist\LabManager-Server.exe"
if exist "build\LabManager-Server" rmdir /s /q "build\LabManager-Server"

REM Build EXE
echo [3/3] Dang build Server EXE...
pyinstaller ^
    --noconsole ^
    --onefile ^
    --icon=assets/myicon.ico ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data "firebase_key.json;." ^
    --add-data "ads.json;." ^
    --add-data "config.json;." ^
    --hidden-import=flask ^
    --hidden-import=flask_sqlalchemy ^
    --hidden-import=flask_cors ^
    --hidden-import=psycopg2 ^
    --hidden-import=openpyxl ^
    --hidden-import=pandas ^
    --name "LabManager-Server" ^
    server_app.py

echo.
if exist "dist\LabManager-Server.exe" (
    echo  ============================================
    echo   BUILD THANH CONG!
    echo   File: dist\LabManager-Server.exe
    echo  ============================================
    echo.
    echo  Truoc khi chay server:
    echo   1. Cai dat PostgreSQL
    echo   2. Tao database: CREATE DATABASE lab_manager;
    echo   3. Tao user DB: CREATE USER DPTIUH WITH PASSWORD 'libiuh2025';
    echo   4. GRANT ALL PRIVILEGES ON DATABASE lab_manager TO DPTIUH;
    echo   5. Chay LabManager-Server.exe
    echo   6. Truy cap: http://localhost:5000/admin
    echo.
) else (
    echo  [ERROR] Build that bai! Kiem tra log phia tren.
)

pause
