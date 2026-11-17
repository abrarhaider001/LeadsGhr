; LeadsGhr additions to electron-builder's installer and uninstaller (electron-builder.yml → nsisWeb.include).
;
; Uninstalling from Windows (Settings → Apps → LeadsGhr → Uninstall) runs the registry UninstallString, which
; customInstall sets to "Uninstall LeadsGhr.exe" /currentuser /S --ask:
;   /S     skips electron-builder's plain "Are you sure?" box;
;   --ask  opens LeadsGhr's own window (resources\LeadsGhr-Uninstall.exe, from setup/LeadsGhrUninstall.cs):
;          Cancel stops, Uninstall removes the app and keeps C:\LeadsGhr, and with "Also delete my LeadsGhr data"
;          ticked the data folders are deleted too.
; Automatic updates run the old uninstaller themselves with /S --updated and never pass --ask, so they never show
; the window and never delete data.

!ifndef BUILD_UNINSTALLER
  !macro customInstall
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$INSTDIR\${UNINSTALL_FILENAME}" /currentuser /S --ask'
  !macroend
!endif

!ifdef BUILD_UNINSTALLER
  Var leadsGhrDeleteData

  !macro customUnInit
    StrCpy $leadsGhrDeleteData "0"
    ${GetParameters} $R0
    ClearErrors
    ${GetOptions} $R0 "--ask" $R1
    ${ifNot} ${Errors}
    ${andIfNot} ${isUpdated}
      ${if} ${FileExists} "$INSTDIR\resources\LeadsGhr-Uninstall.exe"
        ; The window closes before anything is removed. On Uninstall it starts its own "Removing LeadsGhr…"
        ; copy from %TEMP% that waits for app.asar to disappear.
        ExecWait '"$INSTDIR\resources\LeadsGhr-Uninstall.exe" --watch "$INSTDIR\resources\app.asar"' $R2
        ${if} $R2 == 2
          StrCpy $leadsGhrDeleteData "1"
        ${elseif} $R2 != 0
          ; 1 = Cancel or the window was closed; anything else is an error. Either way, remove nothing.
          Quit
        ${endif}
      ${else}
        ; The window is missing: ask with a plain box instead of uninstalling without asking.
        MessageBox MB_OKCANCEL|MB_ICONQUESTION "Uninstall LeadsGhr? Your data in C:\LeadsGhr is kept." IDOK leadsGhrAskDone
        Quit
      ${endif}
      leadsGhrAskDone:
    ${endif}
  !macroend

  !macro customUnInstall
    ${if} $leadsGhrDeleteData == "1"
    ${andIfNot} ${isUpdated}
      ; LeadsGhr's data folder on the system drive (exports, extensions, settings, and data), plus the old
      ; data location and the updater's download cache. Nothing else is touched.
      ReadEnvStr $R3 SystemDrive
      ${if} $R3 == ""
        StrCpy $R3 "C:"
      ${endif}
      RMDir /r "$R3\LeadsGhr"
      RMDir /r "$APPDATA\@leadsghr\desktop"
      RMDir "$APPDATA\@leadsghr"
      RMDir /r "$LOCALAPPDATA\@leadsghrdesktop-updater"
    ${endif}
  !macroend
!endif
