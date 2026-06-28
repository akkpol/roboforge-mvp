[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $Command,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CommandArguments
)

$ErrorActionPreference = "Stop"

$activateScript = Join-Path $PSScriptRoot "use-local-tools.ps1"

if (-not (Test-Path -LiteralPath $activateScript -PathType Leaf)) {
  throw "RoboForge local tools wrapper is missing. Expected script at: $activateScript"
}

. $activateScript -Quiet

$global:LASTEXITCODE = $null

try {
  & $Command @CommandArguments
  $commandSucceeded = $?
} catch {
  Write-Error $_
  exit 1
}

if ($null -ne $global:LASTEXITCODE) {
  exit ([int] $global:LASTEXITCODE)
}

if ($commandSucceeded) {
  exit 0
}

exit 1
