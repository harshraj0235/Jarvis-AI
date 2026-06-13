@echo off
setlocal
:: Determine the absolute path to this directory
set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"

:: Write the registry key for Chrome
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.jarvis.desktop" /ve /t REG_SZ /d "%DIR%\manifest.json" /f

:: Write the registry key for Edge (just in case)
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.jarvis.desktop" /ve /t REG_SZ /d "%DIR%\manifest.json" /f

echo.
echo ========================================================
echo Jarvis Native Host Installed Successfully!
echo ========================================================
echo Chrome can now communicate with your desktop to open apps.
echo.
pause
