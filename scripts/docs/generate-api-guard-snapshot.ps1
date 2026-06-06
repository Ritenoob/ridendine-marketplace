param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$VaultRoot = $(if ($env:RIDENDINE_OBSIDIAN_VAULT) { $env:RIDENDINE_OBSIDIAN_VAULT } else { 'C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault' })
)

$ErrorActionPreference = 'Stop'

$architectureDir = Join-Path $VaultRoot '06 - Product and Technology\App Architecture'
$outputFile = Join-Path $architectureDir '16 - Generated API Guard Snapshot.md'
$fence = '```'

$apps = @(
  [pscustomobject]@{ Id = 'web'; Name = 'Customer marketplace'; Folder = 'apps\web' },
  [pscustomobject]@{ Id = 'chef_admin'; Name = 'Chef admin'; Folder = 'apps\chef-admin' },
  [pscustomobject]@{ Id = 'ops_admin'; Name = 'Ops admin'; Folder = 'apps\ops-admin' },
  [pscustomobject]@{ Id = 'driver_app'; Name = 'Driver app'; Folder = 'apps\driver-app' }
)

$httpMethods = @('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD')
$statefulMethods = @('POST', 'PUT', 'PATCH', 'DELETE')
$intentionalPublicRoutes = @(
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health'
)

$intentionalPublicReadRoutes = @(
  '/api/eta',
  '/api/storefronts',
  '/api/storefronts/[id]',
  '/api/storefronts/[id]/menu'
)

$guardSignals = @(
  [pscustomobject]@{ Label = 'Ops context'; Pattern = 'getOpsActorContext' },
  [pscustomobject]@{ Label = 'Capability guard'; Pattern = 'guardPlatformApi' },
  [pscustomobject]@{ Label = 'Customer context'; Pattern = 'getCustomerActorContext|getCurrentCustomer' },
  [pscustomobject]@{ Label = 'Chef context'; Pattern = 'getChefActorContext|getChefBasicContext' },
  [pscustomobject]@{ Label = 'Driver context'; Pattern = 'getDriverActorContext' },
  [pscustomobject]@{ Label = 'Supabase session'; Pattern = 'auth\.getUser|getUser\(' },
  [pscustomobject]@{ Label = 'Processor token'; Pattern = 'validateEngineProcessorHeaders|CRON_SECRET|ENGINE_PROCESSOR_TOKEN' },
  [pscustomobject]@{ Label = 'Stripe signature'; Pattern = 'verifyStripeWebhook|webhooks\.constructEvent|constructEvent' },
  [pscustomobject]@{ Label = 'Environment gate'; Pattern = 'NODE_ENV|ALLOW_FIXTURE|FIXTURE|non-production' }
)

function ConvertTo-ApiRoute {
  param([string]$ApiRoot, [string]$FilePath)
  $relative = $FilePath.Substring($ApiRoot.Length).TrimStart('\')
  $route = ($relative -replace '(^|\\)route\.ts$', '') -replace '\\', '/'
  if ([string]::IsNullOrWhiteSpace($route)) { return '/api' }
  return "/api/$route"
}

function Get-ExportedMethods {
  param([string]$Source)
  $found = New-Object System.Collections.Generic.List[string]
  foreach ($method in $httpMethods) {
    $functionPattern = "export\s+(async\s+)?function\s+$method\b"
    $constPattern = "export\s+const\s+$method\b"
    if ([regex]::IsMatch($Source, $functionPattern) -or [regex]::IsMatch($Source, $constPattern)) {
      $found.Add($method)
    }
  }
  if ($found.Count -eq 0) { return @('UNKNOWN') }
  return @($found | Sort-Object -Unique)
}

function Get-GuardSignals {
  param([string]$Source)
  $signals = New-Object System.Collections.Generic.List[string]
  foreach ($signal in $guardSignals) {
    if ([regex]::IsMatch($Source, $signal.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
      $signals.Add($signal.Label)
    }
  }
  return @($signals | Sort-Object -Unique)
}

function Get-KnownCapabilities {
  $capabilitiesFile = Join-Path $RepoRoot 'packages\types\src\capabilities.ts'
  if (-not (Test-Path $capabilitiesFile)) { return @() }
  $source = Get-Content -LiteralPath $capabilitiesFile -Raw
  return @([regex]::Matches($source, "'([a-z_]+)'") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
}

function Get-CapabilitiesUsed {
  param([string]$Source, [string[]]$KnownCapabilities)
  if (-not $KnownCapabilities -or $KnownCapabilities.Count -eq 0) { return @() }
  return @($KnownCapabilities | Where-Object {
    $singleQuoted = "'$_'"
    $doubleQuoted = '"' + $_ + '"'
    $Source.Contains($singleQuoted) -or $Source.Contains($doubleQuoted)
  })
}

function Get-Status {
  param([string]$Route, [string[]]$Methods, [string[]]$Signals)
  $hasStateful = @($Methods | Where-Object { $statefulMethods.Contains($_) }).Count -gt 0
  if ($intentionalPublicRoutes.Contains($Route) -or $intentionalPublicReadRoutes.Contains($Route)) { return 'Intentional public' }
  if ($Signals.Count -gt 0) { return 'Protected or special' }
  if ($hasStateful) { return 'Review state-changing' }
  return 'Review read-only'
}

function Join-OrDash {
  param([string[]]$Items)
  if (-not $Items -or $Items.Count -eq 0) { return '-' }
  return ($Items -join ', ')
}

function Escape-MarkdownCell {
  param([string]$Value)
  if ($null -eq $Value -or $Value.Length -eq 0) { return '-' }
  return $Value.Replace('|', '\|')
}

function Format-ReviewTable {
  param([object[]]$Rows)
  if (-not $Rows -or $Rows.Count -eq 0) { return 'None found.' }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('| App | Route | Methods | File |')
  $lines.Add('|---|---|---|---|')
  foreach ($row in $Rows) {
    $lines.Add("| $($row.AppName) | ``$($row.Route)`` | $($row.MethodsText) | ``$($row.File)`` |")
  }
  return ($lines -join "`n")
}

New-Item -ItemType Directory -Force -Path $architectureDir | Out-Null

$knownCapabilities = Get-KnownCapabilities
$records = New-Object System.Collections.Generic.List[object]

foreach ($app in $apps) {
  $appRoot = Join-Path $RepoRoot (Join-Path $app.Folder 'src\app')
  $apiRoot = Join-Path $appRoot 'api'
  if (-not (Test-Path $apiRoot)) { continue }

  Get-ChildItem -Path $apiRoot -Recurse -Filter 'route.ts' | Sort-Object FullName | ForEach-Object {
    $source = Get-Content -LiteralPath $_.FullName -Raw
    $route = ConvertTo-ApiRoute -ApiRoot $apiRoot -FilePath $_.FullName
    $methods = [string[]](Get-ExportedMethods -Source $source)
    $signals = [string[]](Get-GuardSignals -Source $source)
    $capabilities = [string[]](Get-CapabilitiesUsed -Source $source -KnownCapabilities $knownCapabilities)
    $status = Get-Status -Route $route -Methods $methods -Signals $signals
    $records.Add([pscustomobject]@{
      AppId = $app.Id
      AppName = $app.Name
      Route = $route
      Methods = $methods
      MethodsText = (Join-OrDash -Items $methods)
      Status = $status
      Signals = $signals
      SignalsText = (Join-OrDash -Items $signals)
      Capabilities = $capabilities
      CapabilitiesText = (Join-OrDash -Items $capabilities)
      File = ($_.FullName.Substring($RepoRoot.Length).TrimStart('\') -replace '\\', '/')
    })
  }
}

$totalRoutes = $records.Count
$protectedRoutes = @($records | Where-Object { $_.Status -eq 'Protected or special' }).Count
$publicRoutes = @($records | Where-Object { $_.Status -eq 'Intentional public' }).Count
$reviewStateful = @($records | Where-Object { $_.Status -eq 'Review state-changing' }).Count
$reviewReadOnly = @($records | Where-Object { $_.Status -eq 'Review read-only' }).Count
$generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$summaryRows = ($apps | ForEach-Object {
  $appDef = $_
  $appRecords = @($records | Where-Object { $_.AppId -eq $appDef.Id })
  $protected = @($appRecords | Where-Object { $_.Status -eq 'Protected or special' }).Count
  $public = @($appRecords | Where-Object { $_.Status -eq 'Intentional public' }).Count
  $stateful = @($appRecords | Where-Object { $_.Status -eq 'Review state-changing' }).Count
  $readOnly = @($appRecords | Where-Object { $_.Status -eq 'Review read-only' }).Count
  "| $($appDef.Name) | $($appRecords.Count) | $protected | $public | $stateful | $readOnly |"
}) -join "`n"

$signalRows = ($guardSignals | ForEach-Object {
  $label = $_.Label
  $count = @($records | Where-Object { $_.Signals -contains $label }).Count
  "| $label | $count |"
}) -join "`n"

$matrixRows = ($records | Sort-Object AppName, Route | ForEach-Object {
  $route = Escape-MarkdownCell -Value $_.Route
  $signals = Escape-MarkdownCell -Value $_.SignalsText
  $capabilities = Escape-MarkdownCell -Value $_.CapabilitiesText
  "| $($_.AppName) | ``$route`` | $($_.MethodsText) | $($_.Status) | $signals | $capabilities | ``$($_.File)`` |"
}) -join "`n"

$statefulReviewRows = @($records | Where-Object { $_.Status -eq 'Review state-changing' } | Sort-Object AppName, Route)
$readOnlyReviewRows = @($records | Where-Object { $_.Status -eq 'Review read-only' } | Sort-Object AppName, Route)

$content = @"
# Generated API Guard Snapshot

Generated: $generatedAt  
Source codebase: ``$RepoRoot``  
Generator: ``scripts/docs/generate-api-guard-snapshot.ps1``  
Command: ``.\scripts\docs\generate-api-guard-snapshot.ps1``

This file is generated from local route files. Do not hand-edit this note; update the generator or source files and rerun the command.

## Summary

| App | API routes | Protected or special | Intentional public | Review state-changing | Review read-only |
|---|---:|---:|---:|---:|---:|
$summaryRows
| Total | $totalRoutes | $protectedRoutes | $publicRoutes | $reviewStateful | $reviewReadOnly |

## Guard Status Diagram

$fence`mermaid
flowchart TB
  Api["API route files<br/>$totalRoutes total"]
  Api --> Protected["Protected or special<br/>$protectedRoutes"]
  Api --> Public["Intentional public<br/>$publicRoutes"]
  Api --> Stateful["Review state-changing<br/>$reviewStateful"]
  Api --> ReadOnly["Review read-only<br/>$reviewReadOnly"]
$fence

## Guard Signal Counts

| Signal | Routes detected |
|---|---:|
$signalRows

## State-Changing Routes Needing Review

$(Format-ReviewTable -Rows $statefulReviewRows)

## Read-Only Routes Needing Public/Ownership Confirmation

$(Format-ReviewTable -Rows $readOnlyReviewRows)

## Full Route Matrix

| App | Route | Methods | Status | Guard signals | Capabilities detected | File |
|---|---|---|---|---|---|---|
$matrixRows

## Interpretation

- `Protected or special` means the source contains at least one recognized guard, actor context, processor token, Stripe signature, Supabase session, or environment gate signal.
- `Intentional public` means the route is an auth, health, or documented marketplace-read endpoint allowlisted by route path.
- `Review state-changing` means the route exports `POST`, `PUT`, `PATCH`, or `DELETE` and no recognized guard signal was found.
- `Review read-only` means the route appears GET-only or method detection was inconclusive and no recognized guard signal was found.
- This generated snapshot is a visibility tool. The curated security decision record remains [[09 - API Guard Audit Matrix]].
"@

Set-Content -LiteralPath $outputFile -Value $content -Encoding UTF8
Write-Output "Wrote $outputFile"
Write-Output "Routes: $totalRoutes; protected/special: $protectedRoutes; public: $publicRoutes; review state-changing: $reviewStateful; review read-only: $reviewReadOnly"
