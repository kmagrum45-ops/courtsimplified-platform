$ErrorActionPreference = "Continue"

# ============================================================
# COURTSIMPLIFIED ENGINEERING SNAPSHOT V2
# ============================================================
# This script:
# - scans the project
# - records files, imports, exports, pages, APIs, engines, modules
# - copies project documentation
# - records Git state
# - runs the production build
# - creates a complete engineering snapshot ZIP
# ============================================================

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDirectory

$registry = Join-Path $root "_PROJECT_REGISTRY"
$generatedDocs = Join-Path $registry "GENERATED_DOCUMENTATION"
$projectDocsSnapshot = Join-Path $registry "PROJECT_DOCUMENTATION"
$reportsFolder = Join-Path $registry "REPORTS"

$zipName = "COURTSIMPLIFIED_ENGINEERING_SNAPSHOT.zip"
$zipPath = Join-Path $root $zipName
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Get-RelativeProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    $prefix = $root.TrimEnd("\") + "\"

    if ($FullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $FullPath.Substring($prefix.Length)
    }

    return $FullPath
}

function Test-IsExcludedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    $excludedParts = @(
        "\node_modules\",
        "\.next\",
        "\.git\",
        "\_PROJECT_REGISTRY\",
        "\.repomix\"
    )

    foreach ($part in $excludedParts) {
        if ($FullPath -like "*$part*") {
            return $true
        }
    }

    if ($FullPath -eq $zipPath) {
        return $true
    }

    return $false
}

function Convert-ToMarkdownCell {
    param(
        $Value
    )

    if ($null -eq $Value) {
        return "-"
    }

    $text = $Value.ToString()

    if ([string]::IsNullOrWhiteSpace($text)) {
        return "-"
    }

    $text = $text -replace "\|", "\|"
    $text = $text -replace "`r?`n", " "

    return $text
}

function Write-MarkdownTable {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [array]$Rows,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath,

        [Parameter(Mandatory = $true)]
        [string]$Title,

        [Parameter(Mandatory = $true)]
        [string[]]$Columns
    )

    $lines = New-Object System.Collections.Generic.List[string]

    $lines.Add("# $Title")
    $lines.Add("")
    $lines.Add("**Generated:** $generatedAt")
    $lines.Add("")
    $lines.Add("> This file is generated automatically by the CourtSimplified Engineering Snapshot.")
    $lines.Add("")

    if ($Rows.Count -eq 0) {
        $lines.Add("No matching records were detected.")
        $lines | Set-Content -Path $OutputPath -Encoding UTF8
        return
    }

    $lines.Add("| " + ($Columns -join " | ") + " |")
    $lines.Add("| " + (($Columns | ForEach-Object { "---" }) -join " | ") + " |")

    foreach ($row in $Rows) {
        $values = foreach ($column in $Columns) {
            Convert-ToMarkdownCell -Value $row.$column
        }

        $lines.Add("| " + ($values -join " | ") + " |")
    }

    $lines | Set-Content -Path $OutputPath -Encoding UTF8
}

function Write-Report {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $path = Join-Path $reportsFolder $Name
    $Message | Set-Content -Path $path -Encoding UTF8
}

Write-Host ""
Write-Host "============================================================"
Write-Host " COURTSIMPLIFIED ENGINEERING SNAPSHOT V2"
Write-Host "============================================================"
Write-Host ""
Write-Host "Project root:"
Write-Host $root
Write-Host ""

if (Test-Path $registry) {
    Remove-Item $registry -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $registry | Out-Null
New-Item -ItemType Directory -Force -Path $generatedDocs | Out-Null
New-Item -ItemType Directory -Force -Path $projectDocsSnapshot | Out-Null
New-Item -ItemType Directory -Force -Path $reportsFolder | Out-Null

Write-Host "Scanning project files..."

$allFiles = @(
    Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            -not (Test-IsExcludedPath -FullPath $_.FullName)
        }
)

$tsFiles = @(
    $allFiles |
        Where-Object {
            $_.Extension -in @(".ts", ".tsx")
        }
)

Write-Host "Generating architecture registry..."

$architectureLines = @(
    $allFiles |
        ForEach-Object {
            Get-RelativeProjectPath -FullPath $_.FullName
        } |
        Sort-Object
)

$architectureLines |
    Set-Content -Path (Join-Path $registry "ArchitectureRegistry.txt") -Encoding UTF8

Write-Host "Generating file registry..."

$fileRegistry = @(
    $allFiles |
        ForEach-Object {
            [PSCustomObject]@{
                Path = Get-RelativeProjectPath -FullPath $_.FullName
                Extension = $_.Extension
                SizeBytes = $_.Length
                LastWriteTime = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        } |
        Sort-Object Path
)

$fileRegistry |
    Export-Csv `
        -Path (Join-Path $registry "FileRegistry.csv") `
        -NoTypeInformation `
        -Encoding UTF8

Write-MarkdownTable `
    -Rows $fileRegistry `
    -OutputPath (Join-Path $generatedDocs "FILE_REGISTRY.md") `
    -Title "CourtSimplified File Registry" `
    -Columns @("Path", "Extension", "SizeBytes", "LastWriteTime")

Write-Host "Analyzing TypeScript imports and exports..."

$importExportRegistry = @(
    foreach ($file in $tsFiles) {
        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)

            $imports = @(
                [regex]::Matches(
                    $content,
                    "(?m)^\s*import[\s\S]*?from\s+['""]([^'""]+)['""]|(?m)^\s*import\s+['""]([^'""]+)['""]"
                ) |
                    ForEach-Object {
                        if ($_.Groups[1].Value) {
                            $_.Groups[1].Value
                        }
                        else {
                            $_.Groups[2].Value
                        }
                    } |
                    Where-Object { $_ } |
                    Sort-Object -Unique
            )

            $exports = @(
                [regex]::Matches(
                    $content,
                    "export\s+(?:default\s+)?(?:async\s+)?(?:type|function|const|let|class|interface|enum)\s+([A-Za-z0-9_]+)"
                ) |
                    ForEach-Object {
                        $_.Groups[1].Value
                    } |
                    Where-Object { $_ } |
                    Sort-Object -Unique
            )

            [PSCustomObject]@{
                file = Get-RelativeProjectPath -FullPath $file.FullName
                lines = ($content -split "`r?`n").Count
                imports = $imports
                exports = $exports
            }
        }
        catch {
            [PSCustomObject]@{
                file = Get-RelativeProjectPath -FullPath $file.FullName
                lines = 0
                imports = @()
                exports = @()
                error = $_.Exception.Message
            }
        }
    }
)

$importExportRegistry |
    ConvertTo-Json -Depth 12 |
    Set-Content `
        -Path (Join-Path $registry "ImportExportRegistry.json") `
        -Encoding UTF8

Write-Host "Detecting pages and layouts..."

$pageRegistry = @(
    $tsFiles |
        Where-Object {
            $_.Name -in @(
                "page.ts",
                "page.tsx",
                "layout.ts",
                "layout.tsx",
                "loading.ts",
                "loading.tsx",
                "error.ts",
                "error.tsx",
                "not-found.ts",
                "not-found.tsx"
            )
        } |
        ForEach-Object {
            $relativePath = Get-RelativeProjectPath -FullPath $_.FullName
            $directory = Split-Path $relativePath -Parent

            [PSCustomObject]@{
                Type = $_.BaseName
                RouteOrLocation = $directory
                File = $relativePath
            }
        } |
        Sort-Object File
)

Write-MarkdownTable `
    -Rows $pageRegistry `
    -OutputPath (Join-Path $generatedDocs "PAGE_REGISTRY.md") `
    -Title "CourtSimplified Page Registry" `
    -Columns @("Type", "RouteOrLocation", "File")

Write-Host "Detecting API routes..."

$apiRegistry = @(
    $tsFiles |
        Where-Object {
            $_.Name -in @("route.ts", "route.tsx") -and
            $_.FullName -like "*\app\api\*"
        } |
        ForEach-Object {
            $relativePath = Get-RelativeProjectPath -FullPath $_.FullName
            $content = [System.IO.File]::ReadAllText($_.FullName)

            $methods = @(
                [regex]::Matches(
                    $content,
                    "export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)"
                ) |
                    ForEach-Object {
                        $_.Groups[1].Value
                    } |
                    Sort-Object -Unique
            )

            $route = $relativePath `
                -replace "^app\\api", "/api" `
                -replace "\\route\.tsx?$", "" `
                -replace "\\", "/"

            [PSCustomObject]@{
                Route = $route
                Methods = if ($methods.Count -gt 0) {
                    $methods -join ", "
                }
                else {
                    "Undetected"
                }
                File = $relativePath
            }
        } |
        Sort-Object Route
)

Write-MarkdownTable `
    -Rows $apiRegistry `
    -OutputPath (Join-Path $generatedDocs "API_REGISTRY.md") `
    -Title "CourtSimplified API Registry" `
    -Columns @("Route", "Methods", "File")

Write-Host "Generating engine registry..."

$engineRegistryGenerator = Join-Path $root "scripts\snapshot\Generate-EngineRegistry.ps1"
$engineRegistryOutput = Join-Path $generatedDocs "ENGINE_REGISTRY.md"
$engineRegistry = @()

if (Test-Path $engineRegistryGenerator) {
    try {
        $engineRegistry = @(
            & $engineRegistryGenerator `
                -ProjectRoot $root `
                -OutputFolder $generatedDocs `
                -PassThru
        )

        if (-not (Test-Path $engineRegistryOutput)) {
            throw "Engine registry generator completed without creating: $engineRegistryOutput"
        }
    }
    catch {
        Write-Report `
            -Name "EngineRegistryError.txt" `
            -Message "Engine registry generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "EngineRegistryError.txt" `
        -Message "Generator not found: $engineRegistryGenerator"
}

Write-Host "Detecting litigation intelligence modules..."

$moduleRegistry = @(
    $tsFiles |
        Where-Object {
            $_.FullName -like "*\litigation-intelligence\modules\*"
        } |
        ForEach-Object {
            $relativePath = Get-RelativeProjectPath -FullPath $_.FullName
            $content = [System.IO.File]::ReadAllText($_.FullName)

            [PSCustomObject]@{
                Name = $_.BaseName
                Lines = ($content -split "`r?`n").Count
                File = $relativePath
            }
        } |
        Sort-Object Name
)

Write-MarkdownTable `
    -Rows $moduleRegistry `
    -OutputPath (Join-Path $generatedDocs "MODULE_REGISTRY.md") `
    -Title "CourtSimplified Litigation Intelligence Module Registry" `
    -Columns @("Name", "Lines", "File")

Write-Host "Generating dependency registry..."

$dependencyRows = @(
    foreach ($entry in $importExportRegistry) {
        foreach ($import in $entry.imports) {
            [PSCustomObject]@{
                Consumer = $entry.file
                Dependency = $import
            }
        }
    }
) | Sort-Object Consumer, Dependency

Write-MarkdownTable `
    -Rows $dependencyRows `
    -OutputPath (Join-Path $generatedDocs "DEPENDENCY_REGISTRY.md") `
    -Title "CourtSimplified Dependency Registry" `
    -Columns @("Consumer", "Dependency")

Write-Host "Generating unified architecture model..."

$architectureModelGenerator = Join-Path $root "scripts\snapshot\Generate-ArchitectureModel.ps1"
$architectureModelOutput = Join-Path $generatedDocs "ARCHITECTURE_MODEL.json"
$architectureRelationshipOutput = Join-Path $generatedDocs "ARCHITECTURE_RELATIONSHIP_REGISTRY.md"
$architectureModelSummary = $null

if (Test-Path $architectureModelGenerator) {
    try {
        $architectureModelSummary = & $architectureModelGenerator `
            -ProjectRoot $root `
            -OutputFolder $generatedDocs `
            -ImportExportRegistryPath (Join-Path $registry "ImportExportRegistry.json") `
            -PassThru

        if (-not (Test-Path $architectureModelOutput)) {
            throw "Architecture model generator completed without creating: $architectureModelOutput"
        }

        if (-not (Test-Path $architectureRelationshipOutput)) {
            throw "Architecture model generator completed without creating: $architectureRelationshipOutput"
        }
    }
    catch {
        Write-Report `
            -Name "ArchitectureModelError.txt" `
            -Message "Architecture model generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "ArchitectureModelError.txt" `
        -Message "Generator not found: $architectureModelGenerator"
}

Write-Host "Generating workflow and integration traces..."

$workflowIntegrationGenerator = Join-Path $root "scripts\snapshot\Generate-WorkflowIntegrationRegistry.ps1"
$workflowIntegrationModelOutput = Join-Path $generatedDocs "WORKFLOW_INTEGRATION_MODEL.json"
$workflowRegistryOutput = Join-Path $generatedDocs "WORKFLOW_REGISTRY.md"
$integrationTraceOutput = Join-Path $generatedDocs "INTEGRATION_TRACE_REGISTRY.md"
$workflowIntegrationSummary = $null

if (Test-Path $workflowIntegrationGenerator) {
    try {
        if (-not (Test-Path $architectureModelOutput)) {
            throw "Workflow integration generation requires: $architectureModelOutput"
        }

        $workflowIntegrationSummary = & $workflowIntegrationGenerator `
            -ProjectRoot $root `
            -OutputFolder $generatedDocs `
            -ArchitectureModelPath $architectureModelOutput `
            -PassThru

        if (-not (Test-Path $workflowIntegrationModelOutput)) {
            throw "Workflow integration generator completed without creating: $workflowIntegrationModelOutput"
        }

        if (-not (Test-Path $workflowRegistryOutput)) {
            throw "Workflow integration generator completed without creating: $workflowRegistryOutput"
        }

        if (-not (Test-Path $integrationTraceOutput)) {
            throw "Workflow integration generator completed without creating: $integrationTraceOutput"
        }
    }
    catch {
        Write-Report `
            -Name "WorkflowIntegrationError.txt" `
            -Message "Workflow and integration generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "WorkflowIntegrationError.txt" `
        -Message "Generator not found: $workflowIntegrationGenerator"
}

Write-Host "Generating circular dependency, dead-code, and registry audits..."

$architectureAnalyzer = Join-Path $root "scripts\snapshot\architectureAnalyzer.mjs"
$architectureAuditModelOutput = Join-Path $generatedDocs "ARCHITECTURE_AUDIT_MODEL.json"
$circularDependencyOutput = Join-Path $generatedDocs "CIRCULAR_DEPENDENCY_REPORT.md"
$deadCodeOutput = Join-Path $generatedDocs "DEAD_CODE_REPORT.md"
$registryValidationOutput = Join-Path $generatedDocs "REGISTRY_VALIDATION_REPORT.md"
$architectureAuditSummary = $null

if (Test-Path $architectureAnalyzer) {
    try {
        if (-not (Test-Path $architectureModelOutput)) {
            throw "Architecture audit requires: $architectureModelOutput"
        }

        if (-not (Test-Path $workflowIntegrationModelOutput)) {
            throw "Architecture audit requires: $workflowIntegrationModelOutput"
        }

        if (-not (Test-Path $engineRegistryOutput)) {
            throw "Architecture audit requires: $engineRegistryOutput"
        }

        $architectureAuditLog = & node `
            $architectureAnalyzer `
            "--snapshot-audit" `
            "--root" $root `
            "--output-dir" $generatedDocs `
            "--architecture-model" $architectureModelOutput `
            "--workflow-model" $workflowIntegrationModelOutput `
            "--engine-registry" $engineRegistryOutput `
            2>&1
        $architectureAuditExitCode = $LASTEXITCODE

        if ($architectureAuditLog) {
            $architectureAuditLog |
                ForEach-Object {
                    Write-Host $_
                }
        }

        if ($architectureAuditExitCode -ne 0) {
            throw "Architecture analyzer exited with code $architectureAuditExitCode."
        }

        if (-not (Test-Path $architectureAuditModelOutput)) {
            throw "Architecture analyzer completed without creating: $architectureAuditModelOutput"
        }

        if (-not (Test-Path $circularDependencyOutput)) {
            throw "Architecture analyzer completed without creating: $circularDependencyOutput"
        }

        if (-not (Test-Path $deadCodeOutput)) {
            throw "Architecture analyzer completed without creating: $deadCodeOutput"
        }

        if (-not (Test-Path $registryValidationOutput)) {
            throw "Architecture analyzer completed without creating: $registryValidationOutput"
        }

        $architectureAuditModel = Get-Content `
            -LiteralPath $architectureAuditModelOutput `
            -Raw |
            ConvertFrom-Json
        $architectureAuditSummary = $architectureAuditModel.Statistics

        if ($null -eq $architectureAuditSummary) {
            throw "Architecture audit model does not contain statistics."
        }
    }
    catch {
        Write-Report `
            -Name "ArchitectureAuditError.txt" `
            -Message "Architecture audit generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "ArchitectureAuditError.txt" `
        -Message "Analyzer not found: $architectureAnalyzer"
}

Write-Host "Generating project inventory..."

$projectInventoryGenerator = Join-Path $root "scripts\snapshot\Generate-ProjectInventory.ps1"

if (Test-Path $projectInventoryGenerator) {
    try {
        & $projectInventoryGenerator `
            -ProjectRoot $root `
            -OutputFolder $generatedDocs
    }
    catch {
        Write-Report `
            -Name "ProjectInventoryError.txt" `
            -Message "Project inventory generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "ProjectInventoryError.txt" `
        -Message "Generator not found: $projectInventoryGenerator"
}

$docsFolder = Join-Path $root "docs"

if (Test-Path $docsFolder) {
    Write-Host "Copying human-written project documentation..."

    Copy-Item `
        -Path (Join-Path $docsFolder "*") `
        -Destination $projectDocsSnapshot `
        -Recurse `
        -Force
}

Write-Host "Generating large-file report..."

$largeFiles = @(
    $tsFiles |
        ForEach-Object {
            try {
                $content = [System.IO.File]::ReadAllText($_.FullName)

                [PSCustomObject]@{
                    File = Get-RelativeProjectPath -FullPath $_.FullName
                    Lines = ($content -split "`r?`n").Count
                }
            }
            catch {
                [PSCustomObject]@{
                    File = Get-RelativeProjectPath -FullPath $_.FullName
                    Lines = 0
                }
            }
        } |
        Where-Object {
            $_.Lines -ge 800
        } |
        Sort-Object Lines -Descending
)

Write-MarkdownTable `
    -Rows $largeFiles `
    -OutputPath (Join-Path $generatedDocs "LARGE_FILE_REPORT.md") `
    -Title "CourtSimplified Large TypeScript File Report" `
    -Columns @("File", "Lines")

Write-Host "Recording Git state..."

$gitBranch = "Unavailable"
$gitCommit = "Unavailable"
$gitStatus = "Unavailable"

Push-Location $root

try {
    $gitBranch = (git branch --show-current 2>&1 | Out-String).Trim()
    $gitCommit = (git rev-parse HEAD 2>&1 | Out-String).Trim()
    $gitStatus = (git status --short 2>&1 | Out-String).Trim()
}
catch {
    $gitStatus = "Unable to retrieve Git state: $($_.Exception.Message)"
}
finally {
    Pop-Location
}

$gitStateContent = @"
# CourtSimplified Git State

**Generated:** $generatedAt

## Branch

$gitBranch

## Commit

$gitCommit

## Working Tree

````text
$gitStatus
````
"@

$gitStateContent |
    Set-Content `
        -Path (Join-Path $generatedDocs "GIT_STATE.md") `
        -Encoding UTF8

$architectureNodeCount = 0
$architectureEdgeCount = 0
$architectureAssetEdgeCount = 0
$architectureGeneratedFrameworkEdgeCount = 0
$unresolvedInternalEdgeCount = 0
$workflowRecordCount = 0
$integrationTraceCount = 0
$runtimeApiCallCount = 0
$unresolvedRuntimeApiCallCount = 0
$circularDependencyGroupCount = 0
$circularDependencyFileCount = 0
$deadCodeCandidateCount = 0
$highConfidenceDeadCodeCandidateCount = 0
$registryValidationCheckCount = 0
$registryValidationFailureCount = 0

if ($null -ne $architectureModelSummary) {
    $architectureNodeCount = [int]$architectureModelSummary.TotalNodes
    $architectureEdgeCount = [int]$architectureModelSummary.TotalEdges
    $architectureAssetEdgeCount = [int]$architectureModelSummary.AssetEdges
    $architectureGeneratedFrameworkEdgeCount = [int]$architectureModelSummary.GeneratedFrameworkEdges
    $unresolvedInternalEdgeCount = [int]$architectureModelSummary.UnresolvedInternalEdges
}

if ($null -ne $workflowIntegrationSummary) {
    $workflowRecordCount = [int]$workflowIntegrationSummary.WorkflowRecords
    $integrationTraceCount = [int]$workflowIntegrationSummary.EntryTraces
    $runtimeApiCallCount = [int]$workflowIntegrationSummary.RuntimeApiCalls
    $unresolvedRuntimeApiCallCount = [int]$workflowIntegrationSummary.UnresolvedRuntimeApiCalls
}

if ($null -ne $architectureAuditSummary) {
    $circularDependencyGroupCount = [int]$architectureAuditSummary.CircularDependencyGroups
    $circularDependencyFileCount = [int]$architectureAuditSummary.CircularDependencyFiles
    $deadCodeCandidateCount = [int]$architectureAuditSummary.DeadCodeCandidates
    $highConfidenceDeadCodeCandidateCount = [int]$architectureAuditSummary.HighConfidenceDeadCodeCandidates
    $registryValidationCheckCount = [int]$architectureAuditSummary.RegistryValidationChecks
    $registryValidationFailureCount = [int]$architectureAuditSummary.RegistryValidationFailures
}

$projectStatistics = [PSCustomObject]@{
    generatedAt = $generatedAt
    root = $root
    totalFiles = $allFiles.Count
    typeScriptFiles = $tsFiles.Count
    pagesAndLayouts = $pageRegistry.Count
    apiRoutes = $apiRegistry.Count
    enginesAndRelatedSystems = $engineRegistry.Count
    litigationIntelligenceModules = $moduleRegistry.Count
    dependencyRecords = $dependencyRows.Count
    architectureNodes = $architectureNodeCount
    architectureEdges = $architectureEdgeCount
    architectureAssetEdges = $architectureAssetEdgeCount
    architectureGeneratedFrameworkEdges = $architectureGeneratedFrameworkEdgeCount
    unresolvedInternalEdges = $unresolvedInternalEdgeCount
    workflowRecords = $workflowRecordCount
    integrationTraces = $integrationTraceCount
    runtimeApiCalls = $runtimeApiCallCount
    unresolvedRuntimeApiCalls = $unresolvedRuntimeApiCallCount
    circularDependencyGroups = $circularDependencyGroupCount
    circularDependencyFiles = $circularDependencyFileCount
    deadCodeCandidates = $deadCodeCandidateCount
    highConfidenceDeadCodeCandidates = $highConfidenceDeadCodeCandidateCount
    registryValidationChecks = $registryValidationCheckCount
    registryValidationFailures = $registryValidationFailureCount
    largeTypeScriptFilesOver800Lines = $largeFiles
    gitBranch = $gitBranch
    gitCommit = $gitCommit
}

$projectStatistics |
    ConvertTo-Json -Depth 12 |
    Set-Content `
        -Path (Join-Path $registry "ProjectStatistics.json") `
        -Encoding UTF8

$controlStateContent = @"
COURTSIMPLIFIED ENGINEERING SNAPSHOT V2

GeneratedAt:
$generatedAt

ProjectRoot:
$root

Purpose:
This snapshot records the current CourtSimplified architecture, files,
TypeScript imports and exports, pages, APIs, engines, litigation modules,
resolved architecture relationships, workflow and integration traces,
dependencies, circular dependency groups, dead-code candidates, registry
validation, consolidated system health, Git state, project documentation,
build state, and statistics.

CURRENT DOCTRINE:

- CourtSimplified is a Litigation Operating System.
- Memory is never the source of truth.
- Current code and engineering documentation control.
- Do not create duplicate engines.
- Do not create parallel workflows.
- Inspect existing architecture before adding new systems.
- Do not replace stable architecture without checking dependencies.
- Use full-file replacements when modifying CourtSimplified source files.
- Preserve verified larger files unless a deliberate replacement is approved.
- Review this snapshot before major architectural changes.

SOURCE OF TRUTH ORDER:

1. Current source code
2. Project engineering documentation
3. Architecture documentation
4. Architecture Decision Records
5. Conversation history only when required

SNAPSHOT CONTENTS:

- ArchitectureRegistry.txt
- FileRegistry.csv
- ImportExportRegistry.json
- ProjectStatistics.json
- GENERATED_DOCUMENTATION
- PROJECT_DOCUMENTATION
- REPORTS
- BuildStatus.txt
- SnapshotManifest.json
"@

$controlStateContent |
    Set-Content `
        -Path (Join-Path $registry "ControlState.txt") `
        -Encoding UTF8

Write-Host ""
Write-Host "Running production build..."
Write-Host "This may take several minutes on an 8 GB computer."
Write-Host ""

$buildStatusPath = Join-Path $registry "BuildStatus.txt"
$buildExitCode = -1
$buildResult = "Not completed"

Push-Location $root

try {
    npm run build *> $buildStatusPath
    $buildExitCode = $LASTEXITCODE

    if ($buildExitCode -eq 0) {
        $buildResult = "Passed"
    }
    else {
        $buildResult = "Failed"
    }
}
catch {
    $buildResult = "Error"
    $buildExitCode = -1

    $_.Exception.Message |
        Add-Content `
            -Path $buildStatusPath `
            -Encoding UTF8
}
finally {
    Pop-Location
}

$buildStateContent = @"
# CourtSimplified Current Build State

**Generated:** $generatedAt

**Result:** $buildResult

**Exit Code:** $buildExitCode

The complete build output is stored in:

````text
BuildStatus.txt
````
"@

$buildStateContent |
    Set-Content `
        -Path (Join-Path $generatedDocs "CURRENT_BUILD_STATE.md") `
        -Encoding UTF8

Write-Host "Generating consolidated system health..."

$systemHealthModelOutput = Join-Path $generatedDocs "SYSTEM_HEALTH_MODEL.json"
$systemHealthReportOutput = Join-Path $generatedDocs "SYSTEM_HEALTH_REPORT.md"
$systemHealthStatus = "Unavailable"
$systemHealthScore = 0
$systemHealthMaximumScore = 100

if (Test-Path $architectureAnalyzer) {
    try {
        if (-not (Test-Path $architectureModelOutput)) {
            throw "System health requires: $architectureModelOutput"
        }

        if (-not (Test-Path $workflowIntegrationModelOutput)) {
            throw "System health requires: $workflowIntegrationModelOutput"
        }

        if (-not (Test-Path $architectureAuditModelOutput)) {
            throw "System health requires: $architectureAuditModelOutput"
        }

        $projectStatisticsPath = Join-Path $registry "ProjectStatistics.json"

        if (-not (Test-Path $projectStatisticsPath)) {
            throw "System health requires: $projectStatisticsPath"
        }

        $systemHealthLog = & node `
            $architectureAnalyzer `
            "--system-health" `
            "--root" $root `
            "--output-dir" $generatedDocs `
            "--architecture-model" $architectureModelOutput `
            "--workflow-model" $workflowIntegrationModelOutput `
            "--audit-model" $architectureAuditModelOutput `
            "--project-statistics" $projectStatisticsPath `
            "--snapshot-version" "2.4.0" `
            "--build-result" $buildResult `
            "--build-exit-code" $buildExitCode `
            2>&1
        $systemHealthExitCode = $LASTEXITCODE

        if ($systemHealthLog) {
            $systemHealthLog |
                ForEach-Object {
                    Write-Host $_
                }
        }

        if ($systemHealthExitCode -ne 0) {
            throw "System health analyzer exited with code $systemHealthExitCode."
        }

        if (-not (Test-Path $systemHealthModelOutput)) {
            throw "System health analyzer completed without creating: $systemHealthModelOutput"
        }

        if (-not (Test-Path $systemHealthReportOutput)) {
            throw "System health analyzer completed without creating: $systemHealthReportOutput"
        }

        $systemHealthModel = Get-Content `
            -LiteralPath $systemHealthModelOutput `
            -Raw |
            ConvertFrom-Json
        $systemHealthStatus = $systemHealthModel.Status
        $systemHealthScore = [int]$systemHealthModel.OverallScore
        $systemHealthMaximumScore = [int]$systemHealthModel.MaximumScore

        if ([string]::IsNullOrWhiteSpace($systemHealthStatus)) {
            throw "System health model does not contain a status."
        }
    }
    catch {
        Write-Report `
            -Name "SystemHealthError.txt" `
            -Message "System health generation failed:`r`n$($_.Exception.Message)"
    }
}
else {
    Write-Report `
        -Name "SystemHealthError.txt" `
        -Message "Analyzer not found: $architectureAnalyzer"
}

$projectStatistics |
    Add-Member `
        -NotePropertyName "systemHealthStatus" `
        -NotePropertyValue $systemHealthStatus `
        -Force
$projectStatistics |
    Add-Member `
        -NotePropertyName "systemHealthScore" `
        -NotePropertyValue $systemHealthScore `
        -Force
$projectStatistics |
    Add-Member `
        -NotePropertyName "systemHealthMaximumScore" `
        -NotePropertyValue $systemHealthMaximumScore `
        -Force

$projectStatistics |
    ConvertTo-Json -Depth 12 |
    Set-Content `
        -Path (Join-Path $registry "ProjectStatistics.json") `
        -Encoding UTF8

$snapshotManifest = [PSCustomObject]@{
    snapshotVersion = "2.4.0"
    generatedAt = $generatedAt
    projectRoot = $root
    gitBranch = $gitBranch
    gitCommit = $gitCommit
    buildResult = $buildResult
    buildExitCode = $buildExitCode
    systemHealthStatus = $systemHealthStatus
    systemHealthScore = $systemHealthScore
    systemHealthMaximumScore = $systemHealthMaximumScore
    totalFiles = $allFiles.Count
    typeScriptFiles = $tsFiles.Count
    generatedDocuments = @(
        Get-ChildItem -Path $generatedDocs -File |
            ForEach-Object {
                $_.Name
            } |
            Sort-Object
    )
}

$snapshotManifest |
    ConvertTo-Json -Depth 10 |
    Set-Content `
        -Path (Join-Path $registry "SnapshotManifest.json") `
        -Encoding UTF8

Write-Host ""
Write-Host "Packaging engineering snapshot..."

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

try {
    Compress-Archive `
        -Path $registry `
        -DestinationPath $zipPath `
        -Force
}
catch {
    Write-Report `
        -Name "ZipCreationError.txt" `
        -Message "ZIP creation failed:`r`n$($_.Exception.Message)"

    Write-Host ""
    Write-Host "Snapshot files were created, but ZIP creation failed."
    Write-Host "Check:"
    Write-Host (Join-Path $reportsFolder "ZipCreationError.txt")
    exit 1
}

Write-Host ""
Write-Host "============================================================"
Write-Host " ENGINEERING SNAPSHOT COMPLETE"
Write-Host "============================================================"
Write-Host ""
Write-Host "Build result:"
Write-Host $buildResult
Write-Host ""
Write-Host "System health:"
Write-Host "$systemHealthStatus ($systemHealthScore/$systemHealthMaximumScore)"
Write-Host ""
Write-Host "Snapshot created:"
Write-Host $zipPath
Write-Host ""
