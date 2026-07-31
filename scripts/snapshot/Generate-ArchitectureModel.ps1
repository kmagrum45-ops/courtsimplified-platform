param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$OutputFolder,

    [Parameter(Mandatory = $true)]
    [string]$ImportExportRegistryPath,

    [switch]$PassThru
)

$ErrorActionPreference = "Stop"
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$modelVersion = "1.0.0"
$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path.TrimEnd("\", "/")

function Get-NormalizedFullPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        return [System.IO.Path]::GetFullPath($Path).
            TrimEnd("\", "/").
            ToLowerInvariant()
    }
    catch {
        return $Path.TrimEnd("\", "/").ToLowerInvariant()
    }
}

function Get-ProjectFullPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $separator = [System.IO.Path]::DirectorySeparatorChar.ToString()
    $localPath = $RelativePath.
        Replace("\", $separator).
        Replace("/", $separator)

    return [System.IO.Path]::GetFullPath(
        (Join-Path $resolvedProjectRoot $localPath)
    )
}

function Convert-ToForwardSlashPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return $Path.Replace("\", "/")
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
    $text = $text -replace "`r?`n", "<br>"

    return $text
}

function Get-NodeRole {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,

        [Parameter(Mandatory = $true)]
        [string]$BaseName
    )

    $path = Convert-ToForwardSlashPath -Path $RelativePath
    $searchValue = ($path + " " + $BaseName).ToLowerInvariant()
    $fileName = [System.IO.Path]::GetFileName($RelativePath).ToLowerInvariant()

    if (
        $path -match "(?i)^(?:src/)?app/api/" -and
        $fileName -match "^route\.tsx?$"
    ) {
        return "API Route"
    }

    if ($fileName -match "^(page|layout|loading|error|not-found)\.tsx?$") {
        return "Application Entry"
    }

    if ($fileName -match "^middleware\.ts$") {
        return "Application Entry"
    }

    if ($searchValue -match "(engine|orchestrator|coordinator|gateway|investigator|navigator|bridge|reasoning)") {
        return "Architecture System"
    }

    if ($searchValue -match "workflow") {
        return "Workflow"
    }

    if ($searchValue -match "registry") {
        return "Registry"
    }

    if ($path -match "(?i)/modules/") {
        return "Intelligence Module"
    }

    if ($searchValue -match "(schema|contract|architecture|types)") {
        return "Contract or Schema"
    }

    if ($path -match "(?i)/_components?/|/components?/") {
        return "UI Component"
    }

    if ($searchValue -match "(hook|use[A-Z])") {
        return "Hook"
    }

    if ($searchValue -match "(service|repository|client|adapter|provider)") {
        return "Integration Service"
    }

    if ($searchValue -match "(store|persistence|storage|database|supabase)") {
        return "Persistence"
    }

    if ($searchValue -match "(config|configuration|constants|seed)") {
        return "Configuration"
    }

    return "Library Module"
}

function Get-NodeLayer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $path = (Convert-ToForwardSlashPath -Path $RelativePath).ToLowerInvariant()

    if ($path -match "^(?:src/)?app/api/") {
        return "API"
    }

    if ($path -match "^(?:src/)?app/") {
        return "User Interface"
    }

    if ($path -match "^src/lib/case-system/") {
        return "Case System"
    }

    if ($path -match "^src/lib/legal-intelligence/") {
        return "Legal Intelligence"
    }

    if ($path -match "^src/lib/(supabase|persistence|storage|database)/") {
        return "Persistence"
    }

    if ($path -match "^src/lib/") {
        return "Shared Library"
    }

    if ($path -match "^scripts/") {
        return "Engineering Tooling"
    }

    return "Project Support"
}

function Test-IsEntryPoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Role,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    if ($Role -in @("API Route", "Application Entry")) {
        return $true
    }

    $fileName = [System.IO.Path]::GetFileName($RelativePath)

    return $fileName -match "(?i)^(next\.config|instrumentation|middleware)\.(ts|tsx)$"
}

function Resolve-ImportTarget {
    param(
        [Parameter(Mandatory = $true)]
        $SourceNode,

        [Parameter(Mandatory = $true)]
        [string]$Specifier,

        [Parameter(Mandatory = $true)]
        [hashtable]$PathLookup,

        [Parameter(Mandatory = $true)]
        [hashtable]$BaseNameLookup
    )

    $separator = [System.IO.Path]::DirectorySeparatorChar.ToString()
    $candidateBases = @()
    $isInternalSpecifier = $false

    if ($Specifier -match "(?i)(^|/)\.next/") {
        return [PSCustomObject]@{
            Kind = "GeneratedFrameworkImport"
            TargetNode = $null
        }
    }

    if ($Specifier -match "(?i)\.(css|scss|sass|less|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot)$") {
        return [PSCustomObject]@{
            Kind = "AssetImport"
            TargetNode = $null
        }
    }

    if ($Specifier.StartsWith(".")) {
        $isInternalSpecifier = $true
        $localSpecifier = $Specifier.
            Replace("\", $separator).
            Replace("/", $separator)

        $candidateBases += [System.IO.Path]::GetFullPath(
            (Join-Path $SourceNode.DirectoryName $localSpecifier)
        )
    }
    elseif ($Specifier.StartsWith("@/")) {
        $isInternalSpecifier = $true
        $aliasPath = $Specifier.Substring(2).
            Replace("\", $separator).
            Replace("/", $separator)

        $candidateBases += Join-Path $resolvedProjectRoot $aliasPath
        $candidateBases += Join-Path (Join-Path $resolvedProjectRoot "src") $aliasPath
    }
    elseif ($Specifier.StartsWith("~/")) {
        $isInternalSpecifier = $true
        $aliasPath = $Specifier.Substring(2).
            Replace("\", $separator).
            Replace("/", $separator)

        $candidateBases += Join-Path $resolvedProjectRoot $aliasPath
        $candidateBases += Join-Path (Join-Path $resolvedProjectRoot "src") $aliasPath
    }
    elseif ($Specifier -match "^(?i)(src|app)/") {
        $isInternalSpecifier = $true
        $projectPath = $Specifier.
            Replace("\", $separator).
            Replace("/", $separator)

        $candidateBases += Join-Path $resolvedProjectRoot $projectPath
    }

    foreach ($candidateBaseValue in $candidateBases) {
        $candidateBase = $candidateBaseValue

        if ($candidateBase -match "(?i)\.(js|jsx|mjs|cjs)$") {
            $candidateBase = $candidateBase -replace "(?i)\.(js|jsx|mjs|cjs)$", ""
        }

        $candidates = @(
            $candidateBase,
            "${candidateBase}.ts",
            "${candidateBase}.tsx",
            "${candidateBase}.d.ts",
            (Join-Path $candidateBase "index.ts"),
            (Join-Path $candidateBase "index.tsx"),
            (Join-Path $candidateBase "index.d.ts")
        )

        foreach ($candidate in $candidates) {
            $key = Get-NormalizedFullPath -Path $candidate

            if ($PathLookup.ContainsKey($key)) {
                return [PSCustomObject]@{
                    Kind = "InternalImport"
                    TargetNode = $PathLookup[$key]
                }
            }
        }
    }

    if ($isInternalSpecifier) {
        $leafValue = $Specifier.
            Replace("\", "/").
            Split("/")[-1]

        $leafName = [System.IO.Path]::GetFileNameWithoutExtension($leafValue)

        if ($leafName) {
            $leafKey = $leafName.ToLowerInvariant()

            if (
                $BaseNameLookup.ContainsKey($leafKey) -and
                @($BaseNameLookup[$leafKey]).Count -eq 1
            ) {
                return [PSCustomObject]@{
                    Kind = "InternalImport"
                    TargetNode = @($BaseNameLookup[$leafKey])[0]
                }
            }
        }

        return [PSCustomObject]@{
            Kind = "UnresolvedInternalImport"
            TargetNode = $null
        }
    }

    return [PSCustomObject]@{
        Kind = "ExternalPackage"
        TargetNode = $null
    }
}

if (-not (Test-Path -LiteralPath $ImportExportRegistryPath)) {
    throw "Import/export registry not found: $ImportExportRegistryPath"
}

if (-not (Test-Path -LiteralPath $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$parsedRegistry = Get-Content -LiteralPath $ImportExportRegistryPath -Raw |
    ConvertFrom-Json

$rawRegistry = @(
    $parsedRegistry |
        ForEach-Object {
            $_
        }
)

if ($rawRegistry.Count -eq 0) {
    throw "Import/export registry contains no records: $ImportExportRegistryPath"
}

$baseNodes = @(
    foreach ($entry in $rawRegistry) {
        if ([string]::IsNullOrWhiteSpace($entry.file)) {
            continue
        }

        $relativePath = $entry.file.ToString()

        if ($relativePath -notmatch "(?i)\.tsx?$") {
            continue
        }

        $fullPath = Get-ProjectFullPath -RelativePath $relativePath
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($relativePath)
        $role = Get-NodeRole -RelativePath $relativePath -BaseName $baseName
        $imports = @(
            @($entry.imports) |
                Where-Object {
                    -not [string]::IsNullOrWhiteSpace($_)
                } |
                ForEach-Object {
                    $_.ToString()
                } |
                Sort-Object -Unique
        )
        $exports = @(
            @($entry.exports) |
                Where-Object {
                    -not [string]::IsNullOrWhiteSpace($_)
                } |
                ForEach-Object {
                    $_.ToString()
                } |
                Sort-Object -Unique
        )
        $lineCount = if ($null -ne $entry.lines) {
            [int]$entry.lines
        }
        else {
            0
        }

        [PSCustomObject]@{
            Id = Convert-ToForwardSlashPath -Path $relativePath
            File = $relativePath
            BaseName = $baseName
            FullName = $fullPath
            FullPathKey = Get-NormalizedFullPath -Path $fullPath
            DirectoryName = [System.IO.Path]::GetDirectoryName($fullPath)
            Role = $role
            Layer = Get-NodeLayer -RelativePath $relativePath
            IsEntryPoint = Test-IsEntryPoint -Role $role -RelativePath $relativePath
            Lines = $lineCount
            Imports = $imports
            Exports = $exports
        }
    }
)

if ($baseNodes.Count -eq 0) {
    throw "Architecture model produced zero TypeScript nodes from: $ImportExportRegistryPath"
}

$pathLookup = @{}
$baseNameLookup = @{}

foreach ($node in $baseNodes) {
    $pathLookup[$node.FullPathKey] = $node
    $baseNameKey = $node.BaseName.ToLowerInvariant()

    if (-not $baseNameLookup.ContainsKey($baseNameKey)) {
        $baseNameLookup[$baseNameKey] = @()
    }

    $baseNameLookup[$baseNameKey] = @(
        $baseNameLookup[$baseNameKey] + $node
    )
}

$edges = @(
    foreach ($sourceNode in $baseNodes) {
        foreach ($specifier in $sourceNode.Imports) {
            $resolution = Resolve-ImportTarget `
                -SourceNode $sourceNode `
                -Specifier $specifier `
                -PathLookup $pathLookup `
                -BaseNameLookup $baseNameLookup
            $targetValue = if ($null -ne $resolution.TargetNode) {
                $resolution.TargetNode.File
            }
            elseif (
                $resolution.Kind -in @(
                    "ExternalPackage",
                    "AssetImport",
                    "GeneratedFrameworkImport"
                )
            ) {
                $specifier
            }
            else {
                $null
            }

            [PSCustomObject]@{
                Source = $sourceNode.File
                Target = $targetValue
                Specifier = $specifier
                Kind = $resolution.Kind
            }
        }
    }
)

$consumerMap = @{}

foreach ($edge in $edges) {
    if ($edge.Kind -ne "InternalImport" -or [string]::IsNullOrWhiteSpace($edge.Target)) {
        continue
    }

    $targetKey = $edge.Target.ToLowerInvariant()

    if (-not $consumerMap.ContainsKey($targetKey)) {
        $consumerMap[$targetKey] = @()
    }

    $consumerMap[$targetKey] = @(
        $consumerMap[$targetKey] + $edge.Source
    )
}

$nodes = @(
    foreach ($baseNode in $baseNodes) {
        $sourceEdges = @(
            $edges |
                Where-Object {
                    $_.Source -eq $baseNode.File
                }
        )

        $internalDependencies = @(
            $sourceEdges |
                Where-Object {
                    $_.Kind -eq "InternalImport"
                } |
                ForEach-Object {
                    $_.Target
                } |
                Sort-Object -Unique
        )

        $externalDependencies = @(
            $sourceEdges |
                Where-Object {
                    $_.Kind -eq "ExternalPackage"
                } |
                ForEach-Object {
                    $_.Specifier
                } |
                Sort-Object -Unique
        )

        $unresolvedInternalImports = @(
            $sourceEdges |
                Where-Object {
                    $_.Kind -eq "UnresolvedInternalImport"
                } |
                ForEach-Object {
                    $_.Specifier
                } |
                Sort-Object -Unique
        )

        $assetDependencies = @(
            $sourceEdges |
                Where-Object {
                    $_.Kind -eq "AssetImport"
                } |
                ForEach-Object {
                    $_.Specifier
                } |
                Sort-Object -Unique
        )

        $generatedFrameworkDependencies = @(
            $sourceEdges |
                Where-Object {
                    $_.Kind -eq "GeneratedFrameworkImport"
                } |
                ForEach-Object {
                    $_.Specifier
                } |
                Sort-Object -Unique
        )

        $consumerKey = $baseNode.File.ToLowerInvariant()
        $consumers = if ($consumerMap.ContainsKey($consumerKey)) {
            @(
                $consumerMap[$consumerKey] |
                    Sort-Object -Unique
            )
        }
        else {
            @()
        }

        [PSCustomObject]@{
            Id = $baseNode.Id
            File = $baseNode.File
            Name = $baseNode.BaseName
            Role = $baseNode.Role
            Layer = $baseNode.Layer
            IsEntryPoint = $baseNode.IsEntryPoint
            Lines = $baseNode.Lines
            Imports = @($baseNode.Imports)
            Exports = @($baseNode.Exports)
            InternalDependencies = $internalDependencies
            ExternalDependencies = $externalDependencies
            AssetDependencies = $assetDependencies
            GeneratedFrameworkDependencies = $generatedFrameworkDependencies
            UnresolvedInternalImports = $unresolvedInternalImports
            Consumers = $consumers
            InternalDependencyCount = $internalDependencies.Count
            ExternalDependencyCount = $externalDependencies.Count
            AssetDependencyCount = $assetDependencies.Count
            GeneratedFrameworkDependencyCount = $generatedFrameworkDependencies.Count
            UnresolvedInternalImportCount = $unresolvedInternalImports.Count
            ConsumerCount = $consumers.Count
        }
    }
)

$internalEdges = @(
    $edges |
        Where-Object {
            $_.Kind -eq "InternalImport"
        }
)

$externalEdges = @(
    $edges |
        Where-Object {
            $_.Kind -eq "ExternalPackage"
        }
)

$unresolvedInternalEdges = @(
    $edges |
        Where-Object {
            $_.Kind -eq "UnresolvedInternalImport"
        }
)

$assetEdges = @(
    $edges |
        Where-Object {
            $_.Kind -eq "AssetImport"
        }
)

$generatedFrameworkEdges = @(
    $edges |
        Where-Object {
            $_.Kind -eq "GeneratedFrameworkImport"
        }
)

$entryPoints = @(
    $nodes |
        Where-Object {
            $_.IsEntryPoint
        }
)

$roleDistribution = @(
    $nodes |
        Group-Object Role |
        Sort-Object Name |
        ForEach-Object {
            [PSCustomObject]@{
                Role = $_.Name
                Count = $_.Count
            }
        }
)

$layerDistribution = @(
    $nodes |
        Group-Object Layer |
        Sort-Object Name |
        ForEach-Object {
            [PSCustomObject]@{
                Layer = $_.Name
                Count = $_.Count
            }
        }
)

$statistics = [PSCustomObject]@{
    TotalNodes = $nodes.Count
    TotalEdges = $edges.Count
    InternalEdges = $internalEdges.Count
    ExternalEdges = $externalEdges.Count
    AssetEdges = $assetEdges.Count
    GeneratedFrameworkEdges = $generatedFrameworkEdges.Count
    UnresolvedInternalEdges = $unresolvedInternalEdges.Count
    EntryPoints = $entryPoints.Count
    RoleDistribution = $roleDistribution
    LayerDistribution = $layerDistribution
}

$architectureModel = [PSCustomObject]@{
    ModelVersion = $modelVersion
    GeneratedAt = $generatedAt
    ProjectRoot = $resolvedProjectRoot
    Statistics = $statistics
    Nodes = @(
        $nodes |
            Sort-Object -Property File
    )
    Edges = @(
        $edges |
            Sort-Object -Property @("Source", "Kind", "Specifier")
    )
}

$modelOutputPath = Join-Path $OutputFolder "ARCHITECTURE_MODEL.json"
$relationshipOutputPath = Join-Path $OutputFolder "ARCHITECTURE_RELATIONSHIP_REGISTRY.md"

$architectureModel |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath $modelOutputPath -Encoding UTF8

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# CourtSimplified Architecture Relationship Registry")
$markdown.Add("")
$markdown.Add("**Generated:** $generatedAt")
$markdown.Add("")
$markdown.Add("> This registry is generated from ImportExportRegistry.json. ARCHITECTURE_MODEL.json is the machine-readable source for later workflow, integration, dependency-health, and system-health audits.")
$markdown.Add("")
$markdown.Add("## Model Summary")
$markdown.Add("")
$markdown.Add("| Metric | Count |")
$markdown.Add("|---|---:|")
$markdown.Add("| TypeScript nodes | $($statistics.TotalNodes) |")
$markdown.Add("| Total import edges | $($statistics.TotalEdges) |")
$markdown.Add("| Resolved internal edges | $($statistics.InternalEdges) |")
$markdown.Add("| External package edges | $($statistics.ExternalEdges) |")
$markdown.Add("| Asset edges | $($statistics.AssetEdges) |")
$markdown.Add("| Generated framework edges | $($statistics.GeneratedFrameworkEdges) |")
$markdown.Add("| Unresolved internal edges | $($statistics.UnresolvedInternalEdges) |")
$markdown.Add("| Application entry points | $($statistics.EntryPoints) |")
$markdown.Add("")
$markdown.Add("## Role Distribution")
$markdown.Add("")
$markdown.Add("| Role | Count |")
$markdown.Add("|---|---:|")

foreach ($roleRow in $roleDistribution) {
    $markdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $roleRow.Role) +
        " | $($roleRow.Count) |"
    )
}

$markdown.Add("")
$markdown.Add("## Layer Distribution")
$markdown.Add("")
$markdown.Add("| Layer | Count |")
$markdown.Add("|---|---:|")

foreach ($layerRow in $layerDistribution) {
    $markdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $layerRow.Layer) +
        " | $($layerRow.Count) |"
    )
}

$markdown.Add("")
$markdown.Add("## Node Relationships")
$markdown.Add("")
$markdown.Add("| File | Role | Layer | Entry Point | Internal Dependencies | Consumers | External Dependencies | Assets | Generated Framework Imports | Unresolved Internal Imports | Exports | Lines |")
$markdown.Add("|---|---|---|---|---|---|---|---|---|---|---|---:|")

foreach ($node in ($nodes | Sort-Object -Property File)) {
    $internalDependencyText = if ($node.InternalDependencies.Count -gt 0) {
        $node.InternalDependencies -join ", "
    }
    else {
        "None detected"
    }

    $consumerText = if ($node.Consumers.Count -gt 0) {
        $node.Consumers -join ", "
    }
    else {
        "None detected"
    }

    $externalDependencyText = if ($node.ExternalDependencies.Count -gt 0) {
        $node.ExternalDependencies -join ", "
    }
    else {
        "None detected"
    }

    $unresolvedText = if ($node.UnresolvedInternalImports.Count -gt 0) {
        $node.UnresolvedInternalImports -join ", "
    }
    else {
        "None detected"
    }

    $assetText = if ($node.AssetDependencies.Count -gt 0) {
        $node.AssetDependencies -join ", "
    }
    else {
        "None detected"
    }

    $generatedFrameworkText = if ($node.GeneratedFrameworkDependencies.Count -gt 0) {
        $node.GeneratedFrameworkDependencies -join ", "
    }
    else {
        "None detected"
    }

    $exportText = if ($node.Exports.Count -gt 0) {
        $node.Exports -join ", "
    }
    else {
        "None detected"
    }

    $markdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $node.File) + " | " +
        (Convert-ToMarkdownCell -Value $node.Role) + " | " +
        (Convert-ToMarkdownCell -Value $node.Layer) + " | " +
        $node.IsEntryPoint + " | " +
        (Convert-ToMarkdownCell -Value $internalDependencyText) + " | " +
        (Convert-ToMarkdownCell -Value $consumerText) + " | " +
        (Convert-ToMarkdownCell -Value $externalDependencyText) + " | " +
        (Convert-ToMarkdownCell -Value $assetText) + " | " +
        (Convert-ToMarkdownCell -Value $generatedFrameworkText) + " | " +
        (Convert-ToMarkdownCell -Value $unresolvedText) + " | " +
        (Convert-ToMarkdownCell -Value $exportText) + " | " +
        $node.Lines + " |"
    )
}

$markdown |
    Set-Content -LiteralPath $relationshipOutputPath -Encoding UTF8

Write-Host "Generated ARCHITECTURE_MODEL.json"
Write-Host "Generated ARCHITECTURE_RELATIONSHIP_REGISTRY.md"
Write-Host "Architecture nodes: $($statistics.TotalNodes)"
Write-Host "Architecture edges: $($statistics.TotalEdges)"

if ($PassThru) {
    Write-Output $statistics
}