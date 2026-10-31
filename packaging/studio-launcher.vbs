' AzLang Studio - starts the local browser server without a console window.
' The Studio itself runs in your default browser; no desktop application is
' installed or required.
Option Explicit

Dim shell, fso, here, node, server, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

here = fso.GetParentFolderName(WScript.ScriptFullName)
node = here & "\..\runtime\node.exe"
If Not fso.FileExists(node) Then node = "node.exe"

server = here & "\studio-server.js"
If Not fso.FileExists(server) Then
  MsgBox "AzLang Studio is incomplete: studio-server.js was not found.", 16, "AzLang Studio"
  WScript.Quit 1
End If

command = """" & node & """ """ & server & """ --idle 180"
shell.Run command, 0, False
