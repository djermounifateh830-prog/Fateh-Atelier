@echo off
setlocal enabledelayedexpansion
title 3M ATELIER - OPTIMISATION DE DECOUPE
color 0B

echo =====================================================================
echo          3M ATELIER - OPTIMISATION DE DECOUPE ET GESTION
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Verification de Node.js
echo [1/4] Verification de l'environnement Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js n'est pas installe sur cet ordinateur.
    echo [*] Installation automatique de Node.js en cours, veuillez patienter...
    
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    ) else (
        echo [*] Telechargement de l'installateur Node.js...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile '%TEMP%\nodejs_installer.msi'"
        echo [*] Installation en cours...
        msiexec /i "%TEMP%\nodejs_installer.msi" /quiet /norestart
        del "%TEMP%\nodejs_installer.msi" >nul 2>nul
    )
    
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo [X] Erreur : Veuillez redemarrer l'ordinateur apres l'installation de Node.js.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [+] Node.js est operationnel (%NODE_VER%).

:: 2. Verification des modules
echo [2/4] Verification des modules de l'application...
if not exist "node_modules\" (
    echo [*] Premiere execution : installation des dependances en cours...
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Erreur lors de l'installation des dependances.
        pause
        exit /b 1
    )
)
echo [+] Modules verifies et prets.

:: 3. Nettoyage et liberation du port 3000
echo [3/4] Liberation du port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)
echo [+] Port 3000 pret.

:: 4. Demarrage du serveur et ouverture du navigateur
echo [4/4] Demarrage du serveur et de la base de donnees SQLite...
echo.

start /b cmd /c "npm run dev > "%TEMP%\3m_server.log" 2>&1"

:: Attente de la disponibilite du serveur (max 15 secondes)
set COUNT=0
:WAIT_LOOP
set /a COUNT+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { (Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 goto SERVER_READY
if %COUNT% geq 20 goto OPEN_BROWSER
timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:SERVER_READY
echo =====================================================================
echo   [OK] APPLICATION PRETE ET ACTIVE !
echo   [+] Ouverture dans le navigateur : http://localhost:3000
echo   [+] Base de donnees SQLite       : 3m_atelier.db
echo =====================================================================
echo.
start http://localhost:3000
goto END

:OPEN_BROWSER
echo [*] Lancement du navigateur...
start http://localhost:3000

:END
echo [i] Laissez cette fenetre ouverte pendant l'utilisation de l'application.
echo     (Pour quitter, fermez simplement cette fenetre)
echo.
pause
