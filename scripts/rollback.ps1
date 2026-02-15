param(
    [switch]$list,
    [switch]$latest,
    [string]$tag
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Get-SnapshotTags {
    $tags = git tag -l "snapshot/*" --sort=-version:refname 2>$null
    if ($tags) { return $tags } else { return @() }
}

# List mode
if ($list) {
    $tags = Get-SnapshotTags
    if ($tags.Count -eq 0) {
        Write-Host "No snapshots found." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Available snapshots:" -ForegroundColor Cyan
    foreach ($t in $tags) {
        $msg = git log -1 --format="%s" $t 2>$null
        Write-Host "  $t  —  $msg" -ForegroundColor White
    }
    exit 0
}

# Determine target tag
$targetTag = $null
if ($latest) {
    $tags = Get-SnapshotTags
    if ($tags.Count -eq 0) {
        Write-Host "No snapshots found." -ForegroundColor Red
        exit 1
    }
    $targetTag = if ($tags -is [string]) { $tags } else { $tags[0] }
} elseif ($tag) {
    $targetTag = $tag
} else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\rollback.ps1 -list              List snapshots"
    Write-Host "  .\rollback.ps1 -latest             Rollback to latest snapshot"
    Write-Host '  .\rollback.ps1 -tag "snapshot/..."  Rollback to specific tag'
    exit 0
}

# Verify tag exists
$exists = git tag -l $targetTag
if (-not $exists) {
    Write-Host "Tag '$targetTag' not found." -ForegroundColor Red
    exit 1
}

# Safety snapshot
Write-Host "Creating safety snapshot of current state..." -ForegroundColor Yellow
& "$PSScriptRoot\snapshot.ps1" "Safety snapshot before rollback to $targetTag"

# Show diff summary
Write-Host ""
Write-Host "Changes being rolled back:" -ForegroundColor Cyan
git diff --stat HEAD $targetTag

# Perform rollback
Write-Host ""
Write-Host "Rolling back to $targetTag..." -ForegroundColor Yellow
git checkout $targetTag -- .
git add -A
$now = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
git commit -m "[rollback] $now — Rolled back to $targetTag"

Write-Host "Rollback complete!" -ForegroundColor Green
