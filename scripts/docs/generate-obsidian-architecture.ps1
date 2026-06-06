param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$VaultRoot = $(if ($env:RIDENDINE_OBSIDIAN_VAULT) { $env:RIDENDINE_OBSIDIAN_VAULT } else { 'C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault' })
)

$ErrorActionPreference = 'Stop'

$architectureDir = Join-Path $VaultRoot '06 - Product and Technology\App Architecture'
$outputFile = Join-Path $architectureDir '14 - Generated Live Inventory Snapshot.md'

$apps = @(
  @{ Id = 'web'; Name = 'Customer marketplace'; Folder = 'apps\web' },
  @{ Id = 'chef_admin'; Name = 'Chef admin'; Folder = 'apps\chef-admin' },
  @{ Id = 'ops_admin'; Name = 'Ops admin'; Folder = 'apps\ops-admin' },
  @{ Id = 'driver_app'; Name = 'Driver app'; Folder = 'apps\driver-app' }
)
$fence = '```'

function ConvertTo-PageRoute {
  param([string]$AppRoot, [string]$FilePath)
  $relative = $FilePath.Substring($AppRoot.Length).TrimStart('\')
  $route = ($relative -replace '(^|\\)page\.tsx$', '') -replace '\\', '/'
  if ([string]::IsNullOrWhiteSpace($route)) { return '/' }
  return "/$route"
}

function ConvertTo-ApiRoute {
  param([string]$ApiRoot, [string]$FilePath)
  $relative = $FilePath.Substring($ApiRoot.Length).TrimStart('\')
  $route = ($relative -replace '(^|\\)route\.ts$', '') -replace '\\', '/'
  if ([string]::IsNullOrWhiteSpace($route)) { return '/api' }
  return "/api/$route"
}

function Format-MarkdownList {
  param([string[]]$Items)
  if (-not $Items -or $Items.Count -eq 0) { return '- None found' }
  return ($Items | ForEach-Object { "- ``$_``" }) -join "`n"
}

function Get-AppInventory {
  param([hashtable]$App)
  $appRoot = Join-Path $RepoRoot (Join-Path $App.Folder 'src\app')
  $apiRoot = Join-Path $appRoot 'api'

  $pages = @()
  if (Test-Path $appRoot) {
    $pages = Get-ChildItem -Path $appRoot -Recurse -Filter 'page.tsx' |
      Sort-Object FullName |
      ForEach-Object { ConvertTo-PageRoute -AppRoot $appRoot -FilePath $_.FullName }
  }

  $apis = @()
  if (Test-Path $apiRoot) {
    $apis = Get-ChildItem -Path $apiRoot -Recurse -Filter 'route.ts' |
      Sort-Object FullName |
      ForEach-Object { ConvertTo-ApiRoute -ApiRoot $apiRoot -FilePath $_.FullName }
  }

  [pscustomobject]@{
    Id = $App.Id
    Name = $App.Name
    Folder = $App.Folder -replace '\\', '/'
    Pages = [string[]]$pages
    Apis = [string[]]$apis
  }
}

function Get-RelativeFileList {
  param([string]$Path, [string[]]$Extensions)
  if (-not (Test-Path $Path)) { return @() }
  Get-ChildItem -Path $Path -Recurse |
    Where-Object { -not $_.PSIsContainer -and $Extensions.Contains($_.Extension) } |
    Sort-Object FullName |
    ForEach-Object { $_.FullName.Substring($RepoRoot.Length).TrimStart('\') -replace '\\', '/' }
}

New-Item -ItemType Directory -Force -Path $architectureDir | Out-Null

$inventories = @($apps | ForEach-Object { Get-AppInventory -App $_ })
$packagesPath = Join-Path $RepoRoot 'packages'
$packages = @()
if (Test-Path $packagesPath) {
  $packages = Get-ChildItem -Path $packagesPath -Directory | Sort-Object Name | ForEach-Object { $_.Name }
}
$migrationsPath = Join-Path $RepoRoot 'supabase\migrations'
$migrations = @()
if (Test-Path $migrationsPath) {
  $migrations = Get-ChildItem -Path $migrationsPath -Filter '*.sql' | Sort-Object Name | ForEach-Object { $_.Name }
}
$e2eFiles = @(
  Get-RelativeFileList -Path (Join-Path $RepoRoot 'e2e') -Extensions @('.ts', '.tsx', '.png')
  Get-RelativeFileList -Path (Join-Path $RepoRoot 'packages\engine\src\e2e') -Extensions @('.ts', '.tsx')
) | Sort-Object

$totalPages = ($inventories | ForEach-Object { $_.Pages.Count } | Measure-Object -Sum).Sum
$totalApis = ($inventories | ForEach-Object { $_.Apis.Count } | Measure-Object -Sum).Sum
$generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$appRows = ($inventories | ForEach-Object {
  $total = $_.Pages.Count + $_.Apis.Count
  "| $($_.Name) | ``$($_.Folder)`` | $($_.Pages.Count) | $($_.Apis.Count) | $total |"
}) -join "`n"

$diagramRows = ($inventories | ForEach-Object {
  "  Routes --> $($_.Id)[`"$($_.Name)<br/>$($_.Pages.Count) pages, $($_.Apis.Count) APIs`"]"
}) -join "`n"

$routeSections = ($inventories | ForEach-Object {
  @"
## $($_.Name) - ``$($_.Folder)``

### Pages - $($_.Pages.Count)

$(Format-MarkdownList -Items $_.Pages)

### API Routes - $($_.Apis.Count)

$(Format-MarkdownList -Items $_.Apis)
"@
}) -join "`n"

$content = @"
# Generated Live Inventory Snapshot

Generated: $generatedAt  
Source codebase: ``$RepoRoot``  
Generator: ``scripts/docs/generate-obsidian-architecture.ps1``  
Command: ``.\scripts\docs\generate-obsidian-architecture.ps1``

This file is generated from the local filesystem. Do not hand-edit this note; update the generator or source files and rerun the command.

## Summary

| App | Folder | Pages | API routes | Total app routes |
|---|---|---:|---:|---:|
$appRows
| Total |  | $totalPages | $totalApis | $($totalPages + $totalApis) |

## Route Count Diagram

$fence`mermaid
flowchart TB
  Routes["Live local route inventory<br/>$totalPages pages, $totalApis APIs"]
$diagramRows
$fence

$routeSections

## Shared Packages - $($packages.Count)

$(Format-MarkdownList -Items $packages)

## Supabase Migrations - $($migrations.Count)

$(Format-MarkdownList -Items $migrations)

## E2E and Lifecycle Files - $($e2eFiles.Count)

$(Format-MarkdownList -Items $e2eFiles)

## Source of Truth

- For live route counts, rerun ``.\scripts\docs\generate-obsidian-architecture.ps1`` from the repo root.
- For curated architecture explanations, use [[00 - App Architecture Index]] and the surrounding App Architecture notes.
- For generated repo-local wiring docs, use ``pnpm docs:wiring`` when pnpm is available.
"@

Set-Content -LiteralPath $outputFile -Value $content -Encoding UTF8
Write-Output "Wrote $outputFile"
