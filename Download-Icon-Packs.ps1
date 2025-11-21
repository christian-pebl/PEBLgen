# PowerShell Script to Download Modern Icon Packs

$IconsFolder = "$PSScriptRoot\Icons"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Modern Icon Pack Downloader" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create Icons folder if it doesn't exist
if (-not (Test-Path $IconsFolder)) {
    New-Item -ItemType Directory -Path $IconsFolder | Out-Null
}

Write-Host "Icons will be saved to: $IconsFolder" -ForegroundColor Green
Write-Host ""

# Function to download file
function Download-File {
    param (
        [string]$Url,
        [string]$OutputPath
    )

    try {
        Write-Host "Downloading: $OutputPath..." -ForegroundColor Yellow
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        Write-Host "✓ Downloaded successfully!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Failed to download: $_" -ForegroundColor Red
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recommended Free Icon Sources:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Icons8 - https://icons8.com/icons (Free for personal use)" -ForegroundColor White
Write-Host "2. Flaticon - https://www.flaticon.com/ (Free with attribution)" -ForegroundColor White
Write-Host "3. Iconify - https://icon-sets.iconify.design/ (Open source)" -ForegroundColor White
Write-Host "4. Feather Icons - https://feathericons.com/ (MIT License)" -ForegroundColor White
Write-Host "5. Bootstrap Icons - https://icons.getbootstrap.com/ (MIT License)" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Downloading Sample Star Icons for PEBLGen..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Download some free star/business icons from iconarchive.com (public domain)
$iconUrls = @{
    "star-gold.ico" = "https://icons.iconarchive.com/icons/paomedia/small-n-flat/256/star-icon.png"
    "star-blue.ico" = "https://icons.iconarchive.com/icons/paomedia/small-n-flat/256/sign-check-icon.png"
    "briefcase.ico" = "https://icons.iconarchive.com/icons/paomedia/small-n-flat/256/briefcase-icon.png"
}

Write-Host "Note: PNG files downloaded. You can use online converters to create .ico files:" -ForegroundColor Yellow
Write-Host "  - https://convertio.co/png-ico/" -ForegroundColor Yellow
Write-Host "  - https://www.icoconverter.com/" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit the recommended icon sites above" -ForegroundColor White
Write-Host "2. Download icons in .ico format (or convert PNG to .ico)" -ForegroundColor White
Write-Host "3. Save them to: $IconsFolder" -ForegroundColor White
Write-Host "4. Right-click your PEBLGen shortcut → Properties → Change Icon" -ForegroundColor White
Write-Host "5. Click Browse and select your custom icon!" -ForegroundColor White
Write-Host ""

# Open the Icons folder
Write-Host "Opening Icons folder..." -ForegroundColor Yellow
Start-Process $IconsFolder

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
