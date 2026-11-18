param(
    [switch]$FrontendOnly
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$cwd = Get-Location
$frontendCleanZip = Join-Path $cwd "EthioCraft_Frontend_Clean.zip"
$backendCleanZip = Join-Path $cwd "EthioCraft_Backend_Clean.zip"

Write-Host "=========================================="
Write-Host "Step 1: Compiling React Production Build"
Write-Host "=========================================="
Push-Location (Join-Path $cwd "client")
try {
    # Run production build
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "React production build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# Clean existing zip packages
if ($FrontendOnly) {
    if (Test-Path $frontendCleanZip) {
        Remove-Item $frontendCleanZip -Force
    }
} else {
    Get-ChildItem -Path $cwd -Filter "*.zip" | ForEach-Object {
        try { Remove-Item $_.FullName -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 500; Remove-Item $_.FullName -Force }
    }
}

$quickFolder = Join-Path $cwd "EthioCraft_Quick_Update"
if (Test-Path $quickFolder) { Remove-Item $quickFolder -Recurse -Force }

Write-Host "=========================================="
Write-Host "Step 2: Preparing Frontend Build"
Write-Host "=========================================="
$buildDir = Join-Path $cwd "client\build"

# Verify build output
if (-not (Test-Path (Join-Path $buildDir "index.html"))) {
    throw "Fatal Error: client\build\index.html was not generated!"
}
if (-not (Test-Path (Join-Path $buildDir "static\js"))) {
    throw "Fatal Error: client\build\static\js was not generated!"
}

# Copy .htaccess to build root
$htaccessSource = Join-Path $cwd "client\public\.htaccess"
$htaccessDest = Join-Path $buildDir ".htaccess"
if (Test-Path $htaccessSource) {
    Copy-Item $htaccessSource -Destination $htaccessDest -Force
    Write-Host "Ensured .htaccess copied to client\build\.htaccess"
}

# Copy server public images to build images
$serverImages = Join-Path $cwd "server\public\images"
$buildImages = Join-Path $buildDir "images"
if (Test-Path $serverImages) {
    if (-not (Test-Path $buildImages)) { New-Item -ItemType Directory -Path $buildImages -Force | Out-Null }
    Copy-Item "$serverImages\*" -Destination $buildImages -Recurse -Force
    Write-Host "Synced product images from server\public\images to client\build\images"
}

# Copy uploads to build uploads (so Apache can serve /uploads directly)
$serverUploads = Join-Path $cwd "server\uploads"
$buildUploads = Join-Path $buildDir "uploads"
if (Test-Path $serverUploads) {
    if (-not (Test-Path $buildUploads)) { New-Item -ItemType Directory -Path $buildUploads -Force | Out-Null }
    Copy-Item "$serverUploads\*" -Destination $buildUploads -Recurse -Force
    Write-Host "Synced uploads from server\uploads to client\build\uploads"
}

Write-Host "Creating Frontend Clean Zip..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($buildDir, $frontendCleanZip)
$feSize = (Get-Item $frontendCleanZip).Length
Write-Host "Frontend Clean Zip created: $feSize bytes ($([math]::Round($feSize / 1MB, 2)) MB)"

# Validate zip entries
$zip = [System.IO.Compression.ZipFile]::OpenRead($frontendCleanZip)
$hasIndex = $zip.Entries | Where-Object { $_.FullName -eq "index.html" }
$hasStaticJs = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -like "static/js/main.*.js" }
$zip.Dispose()

if (-not $hasIndex -or -not $hasStaticJs) {
    throw "Verification Failed: Frontend zip is missing index.html or static/js/main.*.js!"
} else {
    Write-Host "SUCCESS: Frontend zip verified with index.html and main JS bundle!"
}

if ($FrontendOnly) {
    Write-Host "=========================================="
    Write-Host "COMPLETE: FRONTEND CLEAN ZIP UPDATED"
    Write-Host "EthioCraft_Frontend_Clean.zip -> Extract in public_html"
    Write-Host "=========================================="
    return
}

Write-Host "=========================================="
Write-Host "Step 3: Preparing Backend Clean Zip"
Write-Host "=========================================="
$tempDir = Join-Path $cwd "temp_backend_pack"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$serverDest = Join-Path $tempDir "server"
New-Item -ItemType Directory -Path $serverDest -Force | Out-Null

# Exclude only node_modules, logs, backups, and .git - KEEP uploads, public images, and code!
$excludeDirs = @('logs', 'backups', 'node_modules', '.git')
Get-ChildItem -Path (Join-Path $cwd "server") | Where-Object {
    $_.Name -notin $excludeDirs
} | ForEach-Object {
    # Copy into server/ folder
    Copy-Item $_.FullName -Destination $serverDest -Recurse -Force
    # ALSO copy directly into root of tempDir so extracting directly into cPanel app directory works regardless of folder structure
    Copy-Item $_.FullName -Destination $tempDir -Recurse -Force
}

Copy-Item (Join-Path $cwd "package.json") -Destination (Join-Path $tempDir "package.json") -Force
if (Test-Path (Join-Path $cwd "package-lock.json")) {
    Copy-Item (Join-Path $cwd "package-lock.json") -Destination (Join-Path $tempDir "package-lock.json") -Force
}
Copy-Item (Join-Path $cwd ".env.production") -Destination (Join-Path $tempDir ".env.production") -Force
Copy-Item (Join-Path $cwd ".env.production") -Destination (Join-Path $tempDir ".env") -Force
Copy-Item (Join-Path $cwd ".env.production") -Destination (Join-Path $serverDest ".env") -Force
Copy-Item (Join-Path $cwd ".env.production") -Destination (Join-Path $serverDest ".env.production") -Force
if (Test-Path (Join-Path $cwd "prisma\schema.prisma")) {
    $prismaDest = Join-Path $tempDir "prisma"
    New-Item -ItemType Directory -Path $prismaDest -Force | Out-Null
    Copy-Item (Join-Path $cwd "prisma\schema.prisma") -Destination (Join-Path $prismaDest "schema.prisma") -Force
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $backendCleanZip)
Remove-Item $tempDir -Recurse -Force
$beSize = (Get-Item $backendCleanZip).Length
Write-Host "Backend Clean Zip created: $beSize bytes ($([math]::Round($beSize / 1MB, 2)) MB)"

Write-Host "=========================================="
Write-Host "COMPLETE: READY FOR CPANEL DEPLOYMENT"
Write-Host "1. EthioCraft_Frontend_Clean.zip -> Extract in public_html"
Write-Host "2. EthioCraft_Backend_Clean.zip  -> Extract in ~/EthioCraftHub (Node.js app root)"
Write-Host "=========================================="
