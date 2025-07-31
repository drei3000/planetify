@echo off
echo Starting Spotiplanets servers...
echo.

REM Start Flask backend in a new window
start "Flask Backend" cmd /k "python app.py"

REM Wait a moment for Flask to start
timeout /t 2 /nobreak >nul

REM Start frontend server in a new window
start "Frontend Server" cmd /k "python -m http.server 8888"

echo.
echo Both servers are starting...
echo Flask Backend: http://127.0.0.1:5000
echo Frontend: http://127.0.0.1:8888
echo.
echo Press any key to exit this window...
pause >nul
