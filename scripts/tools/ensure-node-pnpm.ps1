param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$NodeVersion = '22.16.0',
  [string]$PnpmVersion = '9.15.0',
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Use-RidendineNodePnpm {
  param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$NodeVersion = '22.16.0',
    [string]$PnpmVersion = '9.15.0',
    [switch]$Quiet
  )

  $toolsRoot = Join-Path $RepoRoot '.local-tools'
  $downloadsRoot = Join-Path $toolsRoot 'downloads'
  $shimsRoot = Join-Path $toolsRoot 'shims'
  $nodeFolderName = "node-v$NodeVersion-win-x64"
  $nodeRoot = Join-Path $toolsRoot $nodeFolderName
  $nodeExe = Join-Path $nodeRoot 'node.exe'
  $corepack = Join-Path $nodeRoot 'corepack.cmd'

  New-Item -ItemType Directory -Force -Path $toolsRoot, $downloadsRoot, $shimsRoot | Out-Null

  if (-not (Test-Path $nodeExe)) {
    $zipName = "$nodeFolderName.zip"
    $zipPath = Join-Path $downloadsRoot $zipName
    $downloadUrl = "https://nodejs.org/dist/v$NodeVersion/$zipName"
    $extractPath = Join-Path $downloadsRoot "node-v$NodeVersion-extract"

    if (-not $Quiet) {
      Write-Host "Downloading Node.js v$NodeVersion to $zipPath"
    }

    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

    if (Test-Path $extractPath) {
      Remove-Item -LiteralPath $extractPath -Recurse -Force
    }

    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force
    $expandedNodeRoot = Join-Path $extractPath $nodeFolderName

    if (-not (Test-Path (Join-Path $expandedNodeRoot 'node.exe'))) {
      throw "Downloaded Node archive did not contain $nodeFolderName/node.exe"
    }

    if (Test-Path $nodeRoot) {
      Remove-Item -LiteralPath $nodeRoot -Recurse -Force
    }

    Move-Item -LiteralPath $expandedNodeRoot -Destination $nodeRoot
    Remove-Item -LiteralPath $extractPath -Recurse -Force
  }

  if (-not (Test-Path $corepack)) {
    throw "Node.js v$NodeVersion was installed, but corepack.cmd was not found at $corepack"
  }

  $env:PATH = "$shimsRoot;$nodeRoot;$env:PATH"
  $env:COREPACK_HOME = Join-Path $toolsRoot 'corepack'
  New-Item -ItemType Directory -Force -Path $env:COREPACK_HOME | Out-Null

  & $corepack 'prepare' "pnpm@$PnpmVersion" '--activate' | Out-Null

  $pnpmCjs = Join-Path $env:COREPACK_HOME "v1\pnpm\$PnpmVersion\bin\pnpm.cjs"
  if (-not (Test-Path $pnpmCjs)) {
    $pnpmCjs = Join-Path $env:COREPACK_HOME "v1\pnpm\$PnpmVersion\dist\pnpm.cjs"
  }
  if (-not (Test-Path $pnpmCjs)) {
    throw "Corepack prepared pnpm@$PnpmVersion, but no pnpm.cjs was found under $env:COREPACK_HOME"
  }

  $pnpmCmd = Join-Path $shimsRoot 'pnpm.cmd'
  $pnpmShim = @"
@echo off
"$nodeExe" "$pnpmCjs" %*
"@
  Set-Content -LiteralPath $pnpmCmd -Value $pnpmShim -Encoding ASCII

  $nodeDetected = (& $nodeExe '--version').Trim()
  $pnpmDetected = (& $pnpmCmd '--version').Trim()

  if (-not $Quiet) {
    Write-Host "Node ready: $nodeDetected"
    Write-Host "pnpm ready: $pnpmDetected"
    Write-Host "Current-process PATH now starts with: $shimsRoot;$nodeRoot"
  }

  [pscustomobject]@{
    RepoRoot = $RepoRoot
    ToolsRoot = $toolsRoot
    NodeRoot = $nodeRoot
    ShimsRoot = $shimsRoot
    NodeExe = $nodeExe
    Corepack = $corepack
    PnpmCmd = $pnpmCmd
    NodeVersion = $nodeDetected
    PnpmVersion = $pnpmDetected
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Use-RidendineNodePnpm -RepoRoot $RepoRoot -NodeVersion $NodeVersion -PnpmVersion $PnpmVersion -Quiet:$Quiet | Format-List
}
