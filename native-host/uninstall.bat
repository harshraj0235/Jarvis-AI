@echo off
:: Remove the registry keys
REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.jarvis.desktop" /f
REG DELETE "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.jarvis.desktop" /f

echo.
echo ========================================================
echo Jarvis Native Host Uninstalled!
echo ========================================================
echo.
pause
