<#
.SYNOPSIS
  Syncs StoryLine plugin source files to the local GitHub clone.

.DESCRIPTION
  Copies all release-relevant files from the development folder to the
  local GitHub working copy at C:\Users\pixer\Github\obsidian-storyline.

  Files/folders that are NOT copied (preserved on the GitHub side):
    - LICENSE, .gitattributes, Sample Project.zip, *-Conversion-Template.md
      (these live only in the GitHub repo)
    - .git/  (the repository itself)
    - data.json, node_modules/, Övrigt/, .vscode/
      (local runtime / dev-only / scratch)

  After copying, the script prints a git status summary of the GitHub folder
  so you can review what changed before committing.

.PARAMETER Source
  Source folder. Defaults to the script's own location.

.Parameter Destination
  GitHub working copy. Defaults to C:\Users\pixer\Github\obsidian-storyline.

.EXAMPLE
  .\sync-to-github.ps1
#>
[CmdletBinding()]
param(
    [string]$Source      = $PSScriptRoot,
        [string]$Destination = "C:\Users\pixer\Github\obsidian-storyline"
)

$ErrorActionPreference = "Stop"

# ── Files (root level) ──────────────────────────────────────────────
$files = @(
    "main.ts",
    "main.js",
    "manifest.json",
    "styles.css",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "esbuild.config.mjs",
    "eslint.config.mjs",
    "markdown-it-plugins.d.ts",
    "constants.ts",
    "settings.ts",
    "versions.json",
    "CHANGELOG.md",
    "HELP.md",
    "README.md",
    "sync-to-github.ps1"
)

# ── Folders (recursed) ──────────────────────────────────────────────
$folders = @(
    "components",
    "models",
    "services",
    "utils",
    "views",
    "screenshots",
    ".github"
)

# ── Validate paths ──────────────────────────────────────────────────
if (-not (Test-Path $Source))      { throw "Source not found: $Source" }
if (-not (Test-Path $Destination)) { throw "Destination not found: $Destination" }

Write-Host "Syncing StoryLine source → GitHub" -ForegroundColor Cyan
Write-Host "  Source:      $Source"
Write-Host "  Destination: $Destination"
Write-Host ""

$copied = 0
$skipped = 0

# ── Copy root files ─────────────────────────────────────────────────
foreach ($file in $files) {
    $src = Join-Path $Source $file
    $dst = Join-Path $Destination $file
    if (-not (Test-Path $src)) {
        Write-Host "  skip  $file (not in source)" -ForegroundColor DarkGray
        $skipped++
        continue
    }
    Copy-Item -Path $src -Destination $dst -Force
    Write-Host "  copied      $file" -ForegroundColor Green
    $copied++
}

# ── Copy folders (mirror contents) ──────────────────────────────────
foreach ($folder in $folders) {
    $src = Join-Path $Source $folder
    $dst = Join-Path $Destination $folder
    if (-not (Test-Path $src)) {
        Write-Host "  skip  $folder\ (not in source)" -ForegroundColor DarkGray
        $skipped++
        continue
    }
    # Mirror: remove destination folder then copy fresh, so deleted
    # source files don't linger in the GitHub copy.
    if (Test-Path $dst) { Remove-Item -Path $dst -Recurse -Force }
    Copy-Item -Path $src -Destination $dst -Recurse -Force
    $count = (Get-ChildItem -Path $dst -Recurse -File).Count
    Write-Host "  copied      $folder\ ($count files)" -ForegroundColor Green
    $copied++
}

Write-Host ""
Write-Host ("Done: {0} items synced, {1} skipped." -f $copied, $skipped) -ForegroundColor Cyan

# ── Git status summary ──────────────────────────────────────────────
if (Test-Path (Join-Path $Destination ".git")) {
    Write-Host ""
    Write-Host "Git status of GitHub folder:" -ForegroundColor Cyan
    Push-Location $Destination
    try {
        $status = git status --short 2>&1
        if ($status) {
            $status | ForEach-Object { Write-Host "  $_" }
        } else {
            Write-Host "  (no changes - everything already in sync)" -ForegroundColor DarkGray
        }
    } finally {
        Pop-Location
    }
}
