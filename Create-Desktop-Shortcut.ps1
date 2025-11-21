# PowerShell script to create PEBLGen desktop shortcut with star icon

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\PEBLGen.lnk"
$TargetPath = "$PSScriptRoot\Launch-PEBLGen.bat"
$IconPath = "%SystemRoot%\System32\imageres.dll"

# Create the shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Launch PEBLGen Application"
# Star icon from imageres.dll (icon index 76 is a star)
$Shortcut.IconLocation = "$IconPath,76"
$Shortcut.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Desktop Shortcut Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut Name: PEBLGen" -ForegroundColor Cyan
Write-Host "Location: $DesktopPath" -ForegroundColor Cyan
Write-Host "Icon: Star symbol" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now double-click the PEBLGen icon on your desktop!" -ForegroundColor Yellow
Write-Host ""

# Release COM object
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
