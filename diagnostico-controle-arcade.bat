@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "REPORT=%~dp0controle-arcade-relatorio.txt"
echo ================================================ > "%REPORT%"
echo MASTER GAMES ARCADE - DIAGNOSTICO DO CONTROLE >> "%REPORT%"
echo Data: %date% %time% >> "%REPORT%"
echo Computador: %COMPUTERNAME% >> "%REPORT%"
echo Usuario: %USERNAME% >> "%REPORT%"
echo. >> "%REPORT%"
echo [DISPOSITIVOS USB, HID E GAMEPAD] >> "%REPORT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -in @('HIDClass','USB','System') -or $_.Name -match 'gamepad|joystick|arcade|controller|controle|xbox|playstation|hid' }; $d | Select-Object Status,PNPClass,Name,DeviceID,Manufacturer,Service | Format-List | Out-String -Width 240" >> "%REPORT%" 2>&1
echo. >> "%REPORT%"
echo [CONTROLADORES DE JOGO DETECTADOS PELO WINDOWS] >> "%REPORT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match 'game|joystick|arcade|controller|controle|xbox|playstation' }; if($d){$d | Select-Object Status,Name,DeviceID,Manufacturer | Format-Table -AutoSize | Out-String -Width 240}else{'Nenhum nome de gamepad encontrado pelo filtro; confira tambem o painel joy.cpl.'}" >> "%REPORT%" 2>&1
echo. >> "%REPORT%"
echo [DXDIAG - WINDOWS DIRECTINPUT/XINPUT] >> "%REPORT%"
where dxdiag >nul 2>&1 && dxdiag /t "%~dp0controle-arcade-dxdiag.txt" >nul 2>&1 || echo dxdiag nao encontrado. >> "%REPORT%"
if exist "%~dp0controle-arcade-dxdiag.txt" type "%~dp0controle-arcade-dxdiag.txt" >> "%REPORT%"
echo. >> "%REPORT%"
echo [INSTRUCOES] >> "%REPORT%"
echo 1. Deixe o controle arcade conectado antes de executar este arquivo. >> "%REPORT%"
echo 2. Na janela joy.cpl, selecione o controle, clique em Propriedades e pressione todos os botoes. >> "%REPORT%"
echo 3. Salve este arquivo e envie controle-arcade-relatorio.txt junto com uma foto da tela de teste. >> "%REPORT%"
echo. >> "%REPORT%"
echo Relatorio salvo em: "%REPORT%"
echo Abrindo o painel de teste de controles do Windows...
start "" control joy.cpl
start "" notepad "%REPORT%"
endlocal
