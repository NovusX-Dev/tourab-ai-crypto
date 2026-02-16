param(
    [string]$Root = ".",
    [string]$Output = "docs/project-index.md"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$rootUri = New-Object System.Uri(($rootPath.TrimEnd("\") + "\"))
$outputPath = Join-Path $rootPath $Output
$outputDir = Split-Path -Parent $outputPath

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$excludedDirs = @(
    ".git",
    ".idea",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache"
)

function Normalize-RelPath {
    param([string]$Path)

    if ($Path -eq $rootPath) {
        return "."
    }

    $pathUri = New-Object System.Uri($Path)
    $relative = $rootUri.MakeRelativeUri($pathUri).ToString()
    $relative = [System.Uri]::UnescapeDataString($relative)
    return ($relative -replace "\\", "/")
}

function Is-Excluded {
    param([string]$Path)

    $normalized = Normalize-RelPath $Path
    foreach ($name in $excludedDirs) {
        if ($normalized -eq $name -or $normalized.StartsWith("$name/")) {
            return $true
        }
    }
    return $false
}

function Is-IndexFile {
    param([string]$Path)

    $normalized = Normalize-RelPath $Path
    return $normalized -eq $indexRelativePath
}

function Get-DisplayName {
    param(
        [System.IO.FileSystemInfo]$Item,
        [bool]$Directory
    )

    if ($Item.FullName -eq $rootPath) {
        return "."
    }

    if ($Directory) {
        return "$($Item.Name)/"
    }
    return $Item.Name
}

function Build-Tree {
    param(
        [string]$Path,
        [int]$Depth,
        [System.Collections.Generic.List[string]]$Lines
    )

    if (Is-Excluded $Path) {
        return
    }

    $current = Get-Item -LiteralPath $Path
    $indent = ("  " * $Depth)
    $isDirectory = $current.PSIsContainer
    $displayName = Get-DisplayName -Item $current -Directory:$isDirectory
    $Lines.Add("$indent- $displayName")

    if (-not $isDirectory) {
        return
    }

    $children = Get-ChildItem -LiteralPath $Path -Force | Where-Object {
        -not (Is-Excluded $_.FullName) -and -not (Is-IndexFile $_.FullName)
    } | Sort-Object @{
        Expression = { if ($_.PSIsContainer) { 0 } else { 1 } }
    }, Name

    foreach ($child in $children) {
        Build-Tree -Path $child.FullName -Depth ($Depth + 1) -Lines $Lines
    }
}

$indexRelativePath = ($Output -replace "\\", "/")

$allFiles = Get-ChildItem -LiteralPath $rootPath -File -Recurse -Force | Where-Object {
    $rel = Normalize-RelPath $_.FullName
    -not (Is-Excluded $_.FullName) -and -not (Is-IndexFile $_.FullName)
} | Sort-Object FullName

$treeLines = New-Object System.Collections.Generic.List[string]
Build-Tree -Path $rootPath -Depth 0 -Lines $treeLines

$totalDirs = (Get-ChildItem -LiteralPath $rootPath -Directory -Recurse -Force | Where-Object {
    -not (Is-Excluded $_.FullName)
}).Count + 1
$totalFiles = $allFiles.Count
$generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss 'UTC'")
$rootDisplay = Normalize-RelPath $rootPath

$content = New-Object System.Collections.Generic.List[string]
$content.Add("# Project Index")
$content.Add("")
$content.Add("Generated: $generatedAt")
$content.Add("")
$content.Add("## Summary")
$content.Add(('- Root: `{0}`' -f $rootDisplay))
$content.Add("- Directories indexed: $totalDirs")
$content.Add("- Files indexed: $totalFiles")
$content.Add("- Exclusions: $($excludedDirs -join ', ')")
$content.Add("")
$content.Add("## Tree")
$content.Add('```text')
foreach ($line in $treeLines) {
    $content.Add($line)
}
$content.Add('```')
$content.Add("")
$content.Add("## File Catalog")
$content.Add("| Path | Size (bytes) | Last Modified (UTC) | SHA256 |")
$content.Add("|---|---:|---|---|")

foreach ($file in $allFiles) {
    $relPath = Normalize-RelPath $file.FullName
    $lastWrite = $file.LastWriteTimeUtc.ToString("yyyy-MM-dd HH:mm:ss")
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
    $content.Add(('| `{0}` | {1} | {2} | `{3}` |' -f $relPath, $file.Length, $lastWrite, $hash))
}

[System.IO.File]::WriteAllLines($outputPath, $content)
Write-Output "Updated index at $Output"
