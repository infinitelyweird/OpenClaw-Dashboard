param(
    [int]$last = 0
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$tags = git tag -l "snapshot/*" --sort=-version:refname 2>$null
if (-not $tags) {
    Write-Host "No snapshots found." -ForegroundColor Yellow
    exit 0
}
if ($tags -is [string]) { $tags = @($tags) }
if ($last -gt 0 -and $last -lt $tags.Count) {
    $tags = $tags[0..($last - 1)]
}

Write-Host ""
Write-Host "  SNAPSHOT HISTORY" -ForegroundColor Cyan
Write-Host "  ================" -ForegroundColor Cyan
Write-Host ""

foreach ($t in $tags) {
    $msg = git log -1 --format="%s" $t 2>$null
    $date = git log -1 --format="%ai" $t 2>$null
    $files = git diff --shortstat "${t}~1" $t 2>$null
    if (-not $files) { $files = "initial commit" }

    # Extract description after the dash
    $desc = if ($msg -match '— (.+)$') { $Matches[1] } else { $msg }

    Write-Host "  $t" -ForegroundColor Green
    Write-Host "    Date:    $date" -ForegroundColor White
    Write-Host "    Desc:    $desc" -ForegroundColor White
    Write-Host "    Changes: $files" -ForegroundColor Gray
    Write-Host ""
}
