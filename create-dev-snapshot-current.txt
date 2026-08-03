$ErrorActionPreference = "Continue"

$root = Get-Location
$registry = Join-Path $root "_PROJECT_REGISTRY"
$zipName = "COURTSIMPLIFIED_DEVELOPER_SNAPSHOT.zip"
$zipPath = Join-Path $root $zipName

if (Test-Path $registry) {
  Remove-Item $registry -Recurse -Force
}

New-Item -ItemType Directory -Path $registry | Out-Null

tree /F /A > (Join-Path $registry "ArchitectureRegistry.txt")

Get-ChildItem -Recurse -File |
  Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.next\*" -and
    $_.FullName -notlike "*\.git\*" -and
    $_.FullName -notlike "*\_PROJECT_REGISTRY\*"
  } |
  Select-Object FullName, Length, LastWriteTime |
  Out-File (Join-Path $registry "FileRegistry.txt")

Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.next\*" -and
    $_.FullName -notlike "*\.git\*" -and
    $_.FullName -notlike "*\_PROJECT_REGISTRY\*"
  } |
  ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)

    [PSCustomObject]@{
      file = $_.FullName.Replace($root.Path + "\", "")
      lines = ($content -split "`n").Count
      imports = ([regex]::Matches($content, "from\s+['""][^'""]+['""]")).Value
      exports = ([regex]::Matches($content, "export\s+(type|function|const|class|interface)\s+[A-Za-z0-9_]+")).Value
    }
  } |
  ConvertTo-Json -Depth 8 |
  Out-File (Join-Path $registry "ImportExportRegistry.json")

$tsFiles = Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.next\*" -and
    $_.FullName -notlike "*\.git\*" -and
    $_.FullName -notlike "*\_PROJECT_REGISTRY\*"
  }

$allFiles = Get-ChildItem -Recurse -File |
  Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.next\*" -and
    $_.FullName -notlike "*\.git\*" -and
    $_.FullName -notlike "*\_PROJECT_REGISTRY\*"
  }

$moduleFiles = $tsFiles |
  Where-Object { $_.FullName -like "*\src\lib\case-system\litigation-intelligence\modules\*" }

$largeFiles = $tsFiles |
  ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    [PSCustomObject]@{
      file = $_.FullName.Replace($root.Path + "\", "")
      lines = ($content -split "`n").Count
    }
  } |
  Where-Object { $_.lines -ge 800 } |
  Sort-Object lines -Descending

[PSCustomObject]@{
  generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  root = $root.Path
  totalFiles = $allFiles.Count
  typeScriptFiles = $tsFiles.Count
  litigationIntelligenceModules = $moduleFiles.Count
  largeTypeScriptFilesOver800Lines = $largeFiles
} |
  ConvertTo-Json -Depth 8 |
  Out-File (Join-Path $registry "ProjectStatistics.json")

@"
COURTSIMPLIFIED DEVELOPER SNAPSHOT

GeneratedAt: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Root: $($root.Path)

Purpose:
This snapshot records the current project file tree, file registry, build status, TypeScript import/export structure, and project statistics.

Use:
Upload this ZIP at the start or end of development sessions so CourtSimplified can be reviewed without guessing or repeating full audits.

Current Doctrine:
- CourtSimplified is a Litigation Operating System.
- Do not create duplicate engines.
- Do not create parallel workflows.
- Do not replace stable architecture without checking dependencies.
- Use this snapshot as a working control state before major code changes.
"@ | Out-File (Join-Path $registry "ControlState.txt")

npm run build *> (Join-Path $registry "BuildStatus.txt")

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path $registry -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Developer snapshot created:"
Write-Host $zipPath