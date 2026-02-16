Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

git config core.hooksPath .githooks
Write-Output "Configured Git hooks path: .githooks"
