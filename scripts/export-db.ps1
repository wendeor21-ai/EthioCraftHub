# EthioCraft Global — Database Export PowerShell Script
# Copies all JSON files from database/ into export_database/

$projectRoot = "D:\IS_2018_Ec_Second_Semister\Project\EthioCraft Global"
$sourceDir   = Join-Path $projectRoot "database"
$destDir     = Join-Path $projectRoot "export_database"

# Friendly rename map
$renameMap = @{
    "ethiocraft_global.users.json"               = "users.json"
    "ethiocraft_global.products.json"            = "products.json"
    "ethiocraft_global.orders.json"              = "orders.json"
    "ethiocraft_global.customorders.json"        = "custom_orders.json"
    "ethiocraft_global.earnings.json"            = "earnings.json"
    "ethiocraft_global.messages.json"            = "messages.json"
    "ethiocraft_global.promotions.json"          = "promotions.json"
    "ethiocraft_global.commissionpayments.json"  = "commission_payments.json"
    "ethiocraft_global.siteconfigs.json"         = "site_configs.json"
    "ethiocraft_global.userinteractions.json"    = "user_interactions.json"
    "ethiocraft_global.aichatlogs.json"          = "ai_chat_logs.json"
    "ethiocraft_global.alertlogs.json"           = "alert_logs.json"
    "ethiocraft_global.withdrawalauditlogs.json" = "withdrawal_audit_logs.json"
    "ethiocraft_global.payoutrequests.json"      = "payout_requests.json"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  EthioCraft Global - Database Export Tool  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Create / clean destination
if (-Not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
    Write-Host "Created folder: export_database/" -ForegroundColor Green
} else {
    Get-ChildItem $destDir -Filter "*.json" | Remove-Item -Force
    Write-Host "Cleared old files from: export_database/" -ForegroundColor Yellow
}

Write-Host ""

# Copy each JSON
$files = Get-ChildItem $sourceDir -Filter "*.json"
$totalFiles   = 0
$totalRecords = 0
$manifestItems = @()

foreach ($file in $files) {
    $destName = if ($renameMap.ContainsKey($file.Name)) { $renameMap[$file.Name] } else { $file.Name }
    $destPath = Join-Path $destDir $destName

    Copy-Item $file.FullName -Destination $destPath

    # Count top-level records
    $records = 0
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        if ($content -is [Array]) { $records = $content.Count } else { $records = 1 }
    } catch {}

    $sizeKB = [math]::Round($file.Length / 1KB, 1)
    $totalFiles++
    $totalRecords += $records

    Write-Host ("  OK  {0,-38}  {1,5} records   {2,7} KB" -f $destName, $records, $sizeKB) -ForegroundColor Green

    $manifestItems += @{ file = $destName; records = $records; sizeKB = $sizeKB }
}

# Write manifest
$manifest = @{
    exportedAt   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    source       = "static_json_backup (database/ folder)"
    totalFiles   = $totalFiles
    totalRecords = $totalRecords
    files        = $manifestItems
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destDir "_manifest.json") -Encoding UTF8

Write-Host ""
Write-Host "  Manifest written -> export_database/_manifest.json" -ForegroundColor DarkGray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Export complete!" -ForegroundColor Green
Write-Host ("  Folder  : export_database/") -ForegroundColor White
Write-Host ("  Files   : {0}" -f $totalFiles) -ForegroundColor White
Write-Host ("  Records : {0}" -f $totalRecords) -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
