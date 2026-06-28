[CmdletBinding()]
param(
  [switch] $Quiet
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $repoRoot ".tools"
$nodeDir = Join-Path $toolRoot "node-v22.16.0-win-x64"
$pythonDir = Join-Path $toolRoot "python311\python"
$pythonScripts = Join-Path $pythonDir "Scripts"
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCmd = Join-Path $nodeDir "npm.cmd"
$pythonExe = Join-Path $pythonDir "python.exe"

$requiredDirectories = @($toolRoot, $nodeDir, $pythonDir, $pythonScripts)
$requiredFiles = @(
  @{ Name = "Node.js"; Path = $nodeExe },
  @{ Name = "npm"; Path = $npmCmd },
  @{ Name = "Python"; Path = $pythonExe }
)

foreach ($directory in $requiredDirectories) {
  if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
    throw "Missing RoboForge local tools directory: $directory"
  }
}

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file.Path -PathType Leaf)) {
    throw "Missing $($file.Name) in RoboForge local tools: $($file.Path)"
  }
}

function Add-RoboForgePathEntry {
  param(
    [Parameter(Mandatory = $true)]
    [string] $PathEntry
  )

  $resolvedPath = (Resolve-Path -LiteralPath $PathEntry).Path
  $separator = [System.IO.Path]::PathSeparator
  $pathParts = @(
    $env:Path -split [regex]::Escape([string] $separator) |
      Where-Object { $_ -and $_.Trim() }
  )

  $dedupedParts = $pathParts | Where-Object {
    -not [string]::Equals($_.Trim(), $resolvedPath, [System.StringComparison]::OrdinalIgnoreCase)
  }

  $env:Path = (@($resolvedPath) + @($dedupedParts)) -join $separator
}

Add-RoboForgePathEntry $pythonScripts
Add-RoboForgePathEntry $pythonDir
Add-RoboForgePathEntry $nodeDir

$env:ROBOFORGE_TOOLS_ROOT = $toolRoot

if (-not $Quiet) {
  $pythonVersion = (& python --version 2>&1 | Select-Object -First 1)
  $nodeVersion = (& node --version 2>&1 | Select-Object -First 1)
  $npmVersion = (& npm --version 2>&1 | Select-Object -First 1)

  Write-Host "RoboForge local tools are active:"
  Write-Host "  root: $toolRoot"
  Write-Host "  python: $pythonVersion"
  Write-Host "  node: $nodeVersion"
  Write-Host "  npm: $npmVersion"
}
