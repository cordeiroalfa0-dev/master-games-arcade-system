Unicode true
RequestExecutionLevel user
Name "Master Games Arcade 1.1.1"
OutFile "..\release-persistence-1.1.1\Master Games Arcade Setup 1.1.1-complete.exe"
InstallDir "$LOCALAPPDATA\Master Games Arcade"
InstallDirRegKey HKCU "Software\Master Games Arcade" "InstallDir"
Icon "app-icon.ico"

VIProductVersion "1.1.1.0"
VIAddVersionKey "ProductName" "Master Games Arcade"
VIAddVersionKey "CompanyName" "Dev Emerson 2026"
VIAddVersionKey "FileDescription" "Instalador completo com MAMEPlus 0.168.2 e persistência de controles"
VIAddVersionKey "FileVersion" "1.1.1"
VIAddVersionKey "LegalCopyright" "Copyright 2026 Dev Emerson"

!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "installerHeader.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "installerSidebar.bmp"
!define MUI_ICON "app-icon.ico"
!define MUI_UNICON "app-icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Master Games Arcade.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir Master Games Arcade"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Abrir informações do sistema"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Master Games Arcade" SEC_MAIN
  SetOutPath "$INSTDIR"
  File /r "..\release-persistence-1.1.1\win-unpacked\*"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Master Games Arcade 1.1.1\r$\n"
  FileWrite $0 "Dev Emerson 2026\r$\n"
  FileWrite $0 "Persistência de controles: autosave após captura e gravação segura no fechamento.\r$\n"
  FileWrite $0 "MAMEPlus 0.168.2 incluído no pacote completo.\r$\n"
  FileClose $0
  WriteRegStr HKCU "Software\Master Games Arcade" "InstallDir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall Master Games Arcade.exe"
  CreateDirectory "$SMPROGRAMS\Master Games Arcade"
  CreateShortCut "$SMPROGRAMS\Master Games Arcade\Master Games Arcade.lnk" "$INSTDIR\Master Games Arcade.exe"
  CreateShortCut "$DESKTOP\Master Games Arcade.lnk" "$INSTDIR\Master Games Arcade.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Master Games Arcade.lnk"
  Delete "$SMPROGRAMS\Master Games Arcade\Master Games Arcade.lnk"
  RMDir "$SMPROGRAMS\Master Games Arcade"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Master Games Arcade"
SectionEnd

Function .onInstSuccess
  MessageBox MB_ICONINFORMATION "Instalação concluída. As configurações de controle são salvas automaticamente após alterações e antes do fechamento."
FunctionEnd

Function un.onUninstSuccess
  MessageBox MB_ICONINFORMATION "Master Games Arcade removido."
FunctionEnd
