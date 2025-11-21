Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Change to the project directory and start the server in a hidden window
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd /c start http://localhost:8000/timesheet.html && npx http-server -p 8000", 0, False

' Give the server a moment to start before opening the browser
WScript.Sleep 1500

' Open the browser
WshShell.Run "http://localhost:8000/timesheet.html", 1
