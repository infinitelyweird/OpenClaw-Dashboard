param(
    [Parameter(Position=0)]
    [string]$Description = "Auto-snapshot"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# Stage all changes
git add -A

# Check if there are changes to commit
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to snapshot." -ForegroundColor Yellow
    exit 0
}

$now = Get-Date
$commitDate = $now.ToString("yyyy-MM-dd HH:mm:ss")
$tagDate = $now.ToString("yyyy-MM-dd-HHmmss")
$tagName = "snapshot/$tagDate"
$commitMsg = "[snapshot] $commitDate — $Description"

git commit -m $commitMsg
git tag $tagName

Write-Host ""
Write-Host "Snapshot created successfully!" -ForegroundColor Green
Write-Host "  Commit:  $commitMsg" -ForegroundColor Cyan
Write-Host "  Tag:     $tagName" -ForegroundColor Cyan
