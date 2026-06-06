param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [switch]$SkipInstall,
  [switch]$IncludeFormat,
  [switch]$SkipLint,
  [switch]$SkipTypecheck,
  [switch]$SkipTests,
  [switch]$SkipBuild,
  [switch]$SkipProductionSmoke,
  [switch]$RequireProductionSmokeAuth
)

$ErrorActionPreference = 'Stop'

. (Join-Path $RepoRoot 'scripts\tools\ensure-node-pnpm.ps1')

$Results = New-Object System.Collections.Generic.List[object]

function Invoke-ReleaseStep {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  $started = Get-Date

  try {
    $global:LASTEXITCODE = 0
    & $Command
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
      throw "$Name exited with code $LASTEXITCODE"
    }
    $ended = Get-Date
    $Results.Add([pscustomobject]@{
      Step = $Name
      Status = 'passed'
      Seconds = [Math]::Round(($ended - $started).TotalSeconds, 1)
    })
  } catch {
    $ended = Get-Date
    $Results.Add([pscustomobject]@{
      Step = $Name
      Status = 'failed'
      Seconds = [Math]::Round(($ended - $started).TotalSeconds, 1)
      Error = $_.Exception.Message
    })
    throw
  }
}

function Invoke-Pnpm {
  param([string[]]$Arguments)
  & $script:Toolchain.PnpmCmd @Arguments
}

Push-Location $RepoRoot
try {
  $script:Toolchain = Use-RidendineNodePnpm -RepoRoot $RepoRoot -Quiet

  Write-Host "Using $($Toolchain.NodeVersion) and pnpm $($Toolchain.PnpmVersion)"

  Invoke-ReleaseStep -Name 'git diff --check' -Command {
    git diff --check
  }

  if (-not $SkipInstall) {
    Invoke-ReleaseStep -Name 'pnpm install --frozen-lockfile' -Command {
      Invoke-Pnpm -Arguments @('install', '--frozen-lockfile')
    }
  }

  if ($IncludeFormat) {
    Invoke-ReleaseStep -Name 'pnpm format:check' -Command {
      Invoke-Pnpm -Arguments @('format:check')
    }
  } else {
    $Results.Add([pscustomobject]@{
      Step = 'pnpm format:check'
      Status = 'skipped'
      Seconds = 0
      Error = 'Broad formatter baseline is not clean yet; git diff --check protects changed lines.'
    })
  }

  if (-not $SkipLint) {
    Invoke-ReleaseStep -Name 'pnpm lint' -Command {
      Invoke-Pnpm -Arguments @('lint')
    }
  }

  if (-not $SkipTypecheck) {
    Invoke-ReleaseStep -Name 'pnpm typecheck' -Command {
      Invoke-Pnpm -Arguments @('typecheck')
    }
  }

  if (-not $SkipTests) {
    Invoke-ReleaseStep -Name 'pnpm test' -Command {
      Invoke-Pnpm -Arguments @('test')
    }
  }

  Invoke-ReleaseStep -Name 'pnpm audit:guards' -Command {
    Invoke-Pnpm -Arguments @('audit:guards')
  }

  Invoke-ReleaseStep -Name 'pnpm test:wiring-fixes' -Command {
    Invoke-Pnpm -Arguments @('test:wiring-fixes')
  }

  if (-not $SkipBuild) {
    Invoke-ReleaseStep -Name 'pnpm build' -Command {
      Invoke-Pnpm -Arguments @('build')
    }
  }

  if (-not $SkipProductionSmoke) {
    Invoke-ReleaseStep -Name 'production smoke' -Command {
      $smokeArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $RepoRoot 'scripts\smoke\production-smoke.ps1'))
      if ($RequireProductionSmokeAuth) {
        $smokeArgs += '-RequireAuth'
      }
      pwsh @smokeArgs
    }
  }
} finally {
  Write-Host ""
  Write-Host 'Release verification summary'
  $Results | Format-Table Step, Status, Seconds, Error -AutoSize
  Pop-Location
}
