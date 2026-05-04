@echo off
REM ============================================================
REM Setup Client - Lab Manager DPT
REM Chay script nay tren may client de cau hinh ket noi
REM ============================================================
echo.
echo  ============================================
echo   SETUP CLIENT - LAB MANAGER DPT
echo  ============================================
echo.

set /p SERVER_IP="Nhap IP may server (VD: 192.168.1.100): "
set /p COMPUTER_ID="Nhap so thu tu may (1-66, hoac 0 de tu detect): "

if "%COMPUTER_ID%"=="0" set COMPUTER_ID=null

echo.
echo Dang tao file server_config.json...

(
echo {
echo     "server_ip": "%SERVER_IP%",
echo     "server_port": 5000
echo }
) > server_config.json

echo.
echo  ============================================
echo   SETUP THANH CONG!
echo  ============================================
echo   Server IP: %SERVER_IP%
echo   Computer ID: %COMPUTER_ID%
echo.
echo   Bay gio hay chay DPT-Client.exe
echo  ============================================
echo.

REM Mo firewall port 5001
echo Dang mo firewall port 5001...
netsh advfirewall firewall add rule name="LabManager-Client" dir=in action=allow protocol=TCP localport=5001 >nul 2>&1
echo Firewall port 5001 da duoc mo.
echo.

pause
