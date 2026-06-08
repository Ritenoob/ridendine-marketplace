param(
  [string]$CustomerBaseUrl = $(if ($env:RIDENDINE_CUSTOMER_URL) { $env:RIDENDINE_CUSTOMER_URL } else { 'https://ridendine.ca' }),
  [string]$ChefBaseUrl = $(if ($env:RIDENDINE_CHEF_URL) { $env:RIDENDINE_CHEF_URL } else { 'https://chef.ridendine.ca' }),
  [string]$DriverBaseUrl = $(if ($env:RIDENDINE_DRIVER_URL) { $env:RIDENDINE_DRIVER_URL } else { 'https://driver.ridendine.ca' }),
  [string]$OpsBaseUrl = $(if ($env:RIDENDINE_OPS_URL) { $env:RIDENDINE_OPS_URL } else { 'https://ops.ridendine.ca' }),
  [string]$AuthEmail = $env:RIDENDINE_SMOKE_EMAIL,
  [string]$AuthPassword = $env:RIDENDINE_SMOKE_PASSWORD,
  [int]$TimeoutSec = 45,
  [switch]$RequireAuth,
  [switch]$SkipAuth,
  [switch]$SkipAssets
)

$ErrorActionPreference = 'Stop'
$UserAgent = 'RidenDine-Production-Smoke/phase-7'
$Failures = New-Object System.Collections.Generic.List[string]
$SupportsSkipHttpErrorCheck = (Get-Command Invoke-WebRequest).Parameters.ContainsKey('SkipHttpErrorCheck')

function Trim-BaseUrl {
  param([string]$Url)
  return $Url.TrimEnd('/')
}

function Get-BodySample {
  param([string]$Content)
  if ([string]::IsNullOrEmpty($Content)) { return '' }
  $clean = $Content -replace '\s+', ' '
  return $clean.Substring(0, [Math]::Min(180, $clean.Length))
}

function Invoke-WebRequestCompat {
  param([hashtable]$Parameters)

  $requestParameters = @{}
  foreach ($key in $Parameters.Keys) {
    $requestParameters[$key] = $Parameters[$key]
  }

  if ($SupportsSkipHttpErrorCheck) {
    $requestParameters.SkipHttpErrorCheck = $true
  }

  return Invoke-WebRequest @requestParameters
}

function Invoke-SmokeRequest {
  param(
    [string]$Name,
    [string]$Url,
    [string]$Method = 'GET',
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [object]$Body = $null,
    [hashtable]$Headers = @{},
    [string]$ContentType = $null,
    [switch]$ExpectHtml,
    [switch]$ExpectJson
  )

  $requestHeaders = @{ 'User-Agent' = $UserAgent }
  foreach ($key in $Headers.Keys) {
    $requestHeaders[$key] = $Headers[$key]
  }

  $parameters = @{
    Uri = $Url
    Method = $Method
    Headers = $requestHeaders
    MaximumRedirection = 5
    TimeoutSec = $TimeoutSec
  }

  if ($Session) { $parameters.WebSession = $Session }
  if ($Body -ne $null) { $parameters.Body = $Body }
  if ($ContentType) { $parameters.ContentType = $ContentType }

  $response = Invoke-WebRequestCompat -Parameters $parameters
  $status = [int]$response.StatusCode
  $contentTypeHeader = [string]$response.Headers['Content-Type']
  $content = [string]$response.Content
  $looksLikeHtml = $content.TrimStart().StartsWith('<!DOCTYPE html>') -or $content.TrimStart().StartsWith('<html')
  $looksLikeJson = $contentTypeHeader -match 'application/json'
  $finalUri = $response.BaseResponse.ResponseUri.AbsoluteUri
  $looksLikeLogin = ($finalUri -match '/auth/login') -or ($contentTypeHeader -match 'text/html' -and $content -match '(/api/auth/login|Sign in|Log in|password)')

  $ok = $status -eq 200
  if ($ExpectHtml) { $ok = $ok -and $looksLikeHtml }
  if ($ExpectJson) { $ok = $ok -and $looksLikeJson }

  if (-not $ok) {
    $Failures.Add("$Name returned $status from $Url")
  }

  [pscustomobject]@{
    Name = $Name
    Url = $Url
    Status = $status
    ContentType = $contentTypeHeader
    LooksLikeHtml = $looksLikeHtml
    LooksLikeJson = $looksLikeJson
    LooksLikeLogin = $looksLikeLogin
    Length = $response.RawContentLength
    FinalUri = $finalUri
    BodySample = if ($status -ge 400) { Get-BodySample -Content $content } else { '' }
    Content = $content
  }
}

function Test-StaticAssets {
  param(
    [string]$Name,
    [string]$PageUrl,
    [string]$Html
  )

  $base = [Uri]$PageUrl
  $matches = [regex]::Matches($Html, '(?:src|href)="(?<path>/_next/static/[^"]+)"')
  $assetPaths = @($matches | ForEach-Object { $_.Groups['path'].Value } | Sort-Object -Unique)

  foreach ($path in $assetPaths) {
    $assetUrl = [Uri]::new($base, $path).AbsoluteUri
    $assetResponse = $null

    try {
      $assetResponse = Invoke-WebRequestCompat -Parameters @{
        Uri = $assetUrl
        Method = 'Head'
        Headers = @{ 'User-Agent' = $UserAgent }
        MaximumRedirection = 3
        TimeoutSec = $TimeoutSec
      }
      if ([int]$assetResponse.StatusCode -ne 200) {
        $assetResponse = Invoke-WebRequestCompat -Parameters @{
          Uri = $assetUrl
          Method = 'Get'
          Headers = @{ 'User-Agent' = $UserAgent }
          MaximumRedirection = 3
          TimeoutSec = $TimeoutSec
        }
      }
    } catch {
      $Failures.Add("$Name asset request failed: $assetUrl")
      [pscustomobject]@{ App = $Name; Url = $assetUrl; Status = 0 }
      continue
    }

    $status = [int]$assetResponse.StatusCode
    if ($status -ne 200) {
      $Failures.Add("$Name asset returned $($status): $assetUrl")
    }

    [pscustomobject]@{ App = $Name; Url = $assetUrl; Status = $status }
  }
}

function Invoke-AppLoginSmoke {
  param(
    [string]$App,
    [string]$BaseUrl,
    [string[]]$Routes
  )

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ email = $AuthEmail; password = $AuthPassword } | ConvertTo-Json
  $login = Invoke-SmokeRequest -Name "$App /api/auth/login" -Url "$BaseUrl/api/auth/login" -Method POST -Session $session -Body $body -ContentType 'application/json' -ExpectJson

  $loginSuccess = $false
  try {
    $json = $login.Content | ConvertFrom-Json
    if ($json.PSObject.Properties.Name -contains 'success') {
      $loginSuccess = [bool]$json.success
    }
  } catch {
    $loginSuccess = $false
  }

  if (-not $loginSuccess) {
    $Failures.Add("$App login did not return success=true")
  }

  $results = @(
    [pscustomobject]@{
      App = $App
      Route = '/api/auth/login'
      Status = $login.Status
      ContentType = $login.ContentType
      LooksLikeLogin = $false
      Length = $login.Length
    }
  )

  foreach ($route in $Routes) {
    $result = Invoke-SmokeRequest -Name "$App $route" -Url "$BaseUrl$route" -Session $session
    if ($result.LooksLikeLogin) {
      $Failures.Add("$App $route resolved to a login surface after authenticated smoke login")
    }
    $results += [pscustomobject]@{
      App = $App
      Route = $route
      Status = $result.Status
      ContentType = $result.ContentType
      LooksLikeLogin = $result.LooksLikeLogin
      Length = $result.Length
    }
  }

  return $results
}

function Resolve-FirstDriverId {
  param([object]$Json)

  if ($env:RIDENDINE_SAMPLE_DRIVER_ID) {
    return [string]$env:RIDENDINE_SAMPLE_DRIVER_ID
  }

  $items = @()
  if ($Json -and $Json.PSObject.Properties.Name -contains 'data') {
    $data = $Json.data
    if ($data -and $data.PSObject.Properties.Name -contains 'items') {
      $items = @($data.items)
    } elseif ($data -is [array]) {
      $items = @($data)
    }
  }

  if (-not $items.Count -and $Json -and $Json.PSObject.Properties.Name -contains 'items') {
    $items = @($Json.items)
  }

  $first = @($items | Where-Object { $_ -and $_.PSObject.Properties.Name -contains 'id' } | Select-Object -First 1)
  if ($first.Count -gt 0) {
    return [string]$first[0].id
  }

  return ''
}

function Invoke-OpsDriverOperationsSmoke {
  param(
    [string]$BaseUrl
  )

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ email = $AuthEmail; password = $AuthPassword } | ConvertTo-Json
  $login = Invoke-SmokeRequest -Name 'Ops sample /api/auth/login' -Url "$BaseUrl/api/auth/login" -Method POST -Session $session -Body $body -ContentType 'application/json' -ExpectJson

  $loginSuccess = $false
  try {
    $json = $login.Content | ConvertFrom-Json
    if ($json.PSObject.Properties.Name -contains 'success') {
      $loginSuccess = [bool]$json.success
    }
  } catch {
    $loginSuccess = $false
  }

  if (-not $loginSuccess) {
    $Failures.Add('Ops sample login did not return success=true')
    return @()
  }

  $drivers = Invoke-SmokeRequest -Name 'Ops /api/drivers sample discovery' -Url "$BaseUrl/api/drivers" -Session $session -ExpectJson
  $driverId = ''
  try {
    $driverId = Resolve-FirstDriverId -Json ($drivers.Content | ConvertFrom-Json)
  } catch {
    $driverId = ''
  }

  if ([string]::IsNullOrWhiteSpace($driverId)) {
    $Failures.Add('Ops driver operations smoke could not resolve a sample driver id')
    return @(
      [pscustomobject]@{
        App = 'Ops'
        Route = '/api/drivers/{sample}/operations'
        Status = 0
        ContentType = ''
        LooksLikeLogin = $false
        Length = 0
      }
    )
  }

  $operations = Invoke-SmokeRequest -Name 'Ops /api/drivers/{sample}/operations' -Url "$BaseUrl/api/drivers/$driverId/operations" -Session $session -ExpectJson
  if ($operations.LooksLikeLogin) {
    $Failures.Add('Ops /api/drivers/{sample}/operations resolved to a login surface after authenticated smoke login')
  }

  return @(
    [pscustomobject]@{
      App = 'Ops'
      Route = '/api/drivers/{sample}/operations'
      Status = $operations.Status
      ContentType = $operations.ContentType
      LooksLikeLogin = $operations.LooksLikeLogin
      Length = $operations.Length
    }
  )
}

$CustomerBaseUrl = Trim-BaseUrl -Url $CustomerBaseUrl
$ChefBaseUrl = Trim-BaseUrl -Url $ChefBaseUrl
$DriverBaseUrl = Trim-BaseUrl -Url $DriverBaseUrl
$OpsBaseUrl = Trim-BaseUrl -Url $OpsBaseUrl

$pages = @(
  @{ App = 'Customer Web'; Url = "$CustomerBaseUrl/" },
  @{ App = 'Customer Chefs'; Url = "$CustomerBaseUrl/chefs" },
  @{ App = 'Customer Login'; Url = "$CustomerBaseUrl/auth/login" },
  @{ App = 'Chef Login'; Url = "$ChefBaseUrl/auth/login" },
  @{ App = 'Driver Login'; Url = "$DriverBaseUrl/auth/login" },
  @{ App = 'Ops Login'; Url = "$OpsBaseUrl/auth/login" }
)

Write-Host 'Public page checks'
$pageResults = foreach ($page in $pages) {
  Invoke-SmokeRequest -Name $page.App -Url $page.Url -ExpectHtml
}
$pageResults | Select-Object Name, Status, ContentType, LooksLikeHtml, Length | Format-Table -AutoSize

if (-not $SkipAssets) {
  Write-Host 'Static asset checks'
  $assetResults = foreach ($page in $pageResults) {
    Test-StaticAssets -Name $page.Name -PageUrl $page.Url -Html $page.Content
  }

  $assetSummary = $assetResults | Group-Object App | ForEach-Object {
    [pscustomobject]@{
      App = $_.Name
      Assets = $_.Count
      Failed = @($_.Group | Where-Object { $_.Status -ne 200 }).Count
    }
  }
  $assetSummary | Format-Table -AutoSize
}

Write-Host 'Health checks'
$healthUrls = @(
  "$CustomerBaseUrl/api/health",
  "$ChefBaseUrl/api/health",
  "$DriverBaseUrl/api/health",
  "$OpsBaseUrl/api/health"
)
$healthResults = foreach ($url in $healthUrls) {
  Invoke-SmokeRequest -Name $url -Url $url -ExpectJson
}
$healthResults | Select-Object Name, Status, ContentType, LooksLikeJson, Length | Format-Table -AutoSize

$hasCredentials = -not [string]::IsNullOrWhiteSpace($AuthEmail) -and -not [string]::IsNullOrWhiteSpace($AuthPassword)
if ($SkipAuth) {
  Write-Host 'Authenticated checks skipped by -SkipAuth'
} elseif (-not $hasCredentials) {
  $message = 'Authenticated checks skipped because RIDENDINE_SMOKE_EMAIL and RIDENDINE_SMOKE_PASSWORD are not both set'
  if ($RequireAuth) {
    $Failures.Add($message)
  }
  Write-Host $message
} else {
  Write-Host 'Authenticated checks'
  $authResults = @()
  $authResults += Invoke-AppLoginSmoke -App 'Customer' -BaseUrl $CustomerBaseUrl -Routes @('/account', '/account/favorites', '/account/settings', '/api/profile', '/api/orders', '/api/loyalty')
  $authResults += Invoke-AppLoginSmoke -App 'Chef' -BaseUrl $ChefBaseUrl -Routes @('/dashboard', '/api/profile', '/api/storefront', '/api/orders')
  $authResults += Invoke-AppLoginSmoke -App 'Driver' -BaseUrl $DriverBaseUrl -Routes @('/', '/api/driver', '/api/driver/readiness', '/api/driver/shift', '/api/driver/notification-preferences', '/api/deliveries', '/api/offers', '/api/earnings')
  $authResults += Invoke-AppLoginSmoke -App 'Ops' -BaseUrl $OpsBaseUrl -Routes @('/dashboard', '/api/engine/health', '/api/ops/live-board', '/api/orders', '/api/drivers', '/api/chefs')
  $authResults += Invoke-OpsDriverOperationsSmoke -BaseUrl $OpsBaseUrl
  $authResults | Format-Table App, Route, Status, ContentType, LooksLikeLogin, Length -AutoSize
}

if ($Failures.Count -gt 0) {
  Write-Host 'Smoke failures'
  $Failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host 'Production smoke passed'
