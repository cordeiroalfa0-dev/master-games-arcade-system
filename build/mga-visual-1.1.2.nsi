Unicode true
RequestExecutionLevel user
Name "Master Games Arcade 1.1.2"
OutFile "..\release-visual-1.1.2\Master Games Arcade Setup 1.1.2-complete.exe"
InstallDir "$LOCALAPPDATA\Master Games Arcade"
InstallDirRegKey HKCU "Software\Master Games Arcade" "InstallDir"
Icon "app-icon.ico"

VIProductVersion "1.1.2.0"
VIAddVersionKey "ProductName" "Master Games Arcade"
VIAddVersionKey "CompanyName" "Dev Emerson 2026"
VIAddVersionKey "FileDescription" "Instalador completo com painel visual de controles e MAMEPlus 0.168.2"
VIAddVersionKey "FileVersion" "1.1.2"
VIAddVersionKey "LegalCopyright" "Copyright 2026 Dev Emerson"

!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "installerHeader.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "installerSidebar.bmp"
!define MUI_ICON "app-icon.ico"
!define MUI_UNICON "app-icon.ico"
!define MUI_FINISPAGE_RUN "$INSTDIR\Master Games Arcade.exe"
!define MUI_FINISPAGE_RUN_TEXT "Abrir Master Games Arcade"
!define MUI_FINISPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISPAGE_SHOWREADME_TEXT "Abrir informações do sistema"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Master Games Arcade" SEC_MAIN
  SetOutPath "$INSTDIR"
  File /r "..\release-visual-1.1.2\win-unpacked\*"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Master Games Arcade 1.1.2\r$\n"
  FileWrite $0 "Dev Emerson 2026\r$\n"
  FileWrite $0 "Painel visual de controles renovado; captura e persistência mantidas.\r$\n"
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
  MessageBox MB_ICONINFORMATION "Instalação concluída. O painel visual de controles está pronto e as configurações continuam salvas automaticamente."
FunctionEnd

Function un.onUninstSuccess
  MessageBox MB_ICONINFORMATION "Master Games Arcade removido."
FunctionEnd
