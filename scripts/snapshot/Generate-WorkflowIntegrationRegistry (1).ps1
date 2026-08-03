param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$OutputFolder,

    [Parameter(Mandatory = $true)]
    [string]$ArchitectureModelPath,

    [switch]$PassThru
)

$ErrorActionPreference = "Stop"
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$modelVersion = "1.0.0"
$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path.TrimEnd("\", "/")

function Convert-ToForwardSlashPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return $Path.Replace("\", "/")
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

function Convert-ToStringArray {
    param(
        $Value
    )

    if ($null -eq $Value) {
        return
    }

    if ($Value -is [string]) {
        if (-not [string]::IsNullOrWhiteSpace($Value)) {
            Write-Output $Value
        }

        return
    }

    if (
        $Value -is [System.Collections.IDictionary] -and
        $Value.Count -eq 0
    ) {
        return
    }

    if (
        $Value -is [PSCustomObject] -and
        @($Value.PSObject.Properties).Count -eq 0
    ) {
        return
    }

    foreach ($item in @($Value)) {
        if ($null -eq $item) {
            continue
        }

        $text = $item.ToString()

        if (-not [string]::IsNullOrWhiteSpace($text)) {
            Write-Output $text
        }
    }
}

function Get-ApiRouteFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File
    )

    $path = Convert-ToForwardSlashPath -Path $File

    if ($path -match "^(?:src/)?app/api(?:/(.*))?/route\.tsx?$") {
        $suffix = $Matches[1]

        if ([string]::IsNullOrWhiteSpace($suffix)) {
            return "/api"
        }

        return "/api/" + $suffix.Trim("/")
    }

    return $null
}

function Get-ApplicationRouteFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$File
    )

    $path = Convert-ToForwardSlashPath -Path $File

    if ($path -match "^(?:src/)?app/(.*)/page\.tsx?$") {
        return "/" + $Matches[1].Trim("/")
    }

    if ($path -match "^(?:src/)?app/page\.tsx?$") {
        return "/"
    }

    if ($path -match "^(?:src/)?app/(.*)/layout\.tsx?$") {
        return "/" + $Matches[1].Trim("/")
    }

    if ($path -match "^(?:src/)?app/layout\.tsx?$") {
        return "/"
    }

    return $File
}

function Get-WorkflowKind {
    param(
        [Parameter(Mandatory = $true)]
        $Node
    )

    $nodeName = if ($null -ne $Node.Name) {
        $Node.Name.ToString()
    }
    else {
        ""
    }
    $searchValue = ($Node.Name + " " + $Node.File).ToLowerInvariant()

    if ($nodeName -match "(?i)(Architecture|Types)$") {
        return "Workflow Contract"
    }

    if ($searchValue -match "gateway") {
        return "Gateway"
    }

    if ($searchValue -match "orchestrator") {
        return "Orchestrator"
    }

    if ($searchValue -match "assembly") {
        return "Assembly"
    }

    if ($searchValue -match "migration") {
        return "Migration Layer"
    }

    if ($searchValue -match "coordinator") {
        return "Coordinator"
    }

    if ($searchValue -match "workflow") {
        return "Workflow"
    }

    return "Control System"
}

function Test-IsWorkflowNode {
    param(
        [Parameter(Mandatory = $true)]
        $Node
    )

    $searchValue = ($Node.Name + " " + $Node.File).ToLowerInvariant()

    return $searchValue -match "(workflow|orchestrator|assembly|migration|coordinator|gateway)"
}

function Get-ReachableGraph {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StartFile,

        [Parameter(Mandatory = $true)]
        [hashtable]$Adjacency
    )

    $queue = New-Object System.Collections.Queue
    $distances = @{}
    $queue.Enqueue($StartFile)
    $distances[$StartFile] = 0

    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $currentDistance = [int]$distances[$current]
        $neighbors = if ($Adjacency.ContainsKey($current)) {
            @($Adjacency[$current])
        }
        else {
            @()
        }

        foreach ($neighbor in $neighbors) {
            if ($distances.ContainsKey($neighbor)) {
                continue
            }

            $distances[$neighbor] = $currentDistance + 1
            $queue.Enqueue($neighbor)
        }
    }

    $files = @(
        $distances.Keys |
            Where-Object {
                $_ -ne $StartFile
            } |
            Sort-Object
    )

    $maxDepth = 0

    foreach ($distance in $distances.Values) {
        if ([int]$distance -gt $maxDepth) {
            $maxDepth = [int]$distance
        }
    }

    return [PSCustomObject]@{
        Files = $files
        MaxDepth = $maxDepth
    }
}

if (-not (Test-Path -LiteralPath $ArchitectureModelPath)) {
    throw "Architecture model not found: $ArchitectureModelPath"
}

if (-not (Test-Path -LiteralPath $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$architectureModel = Get-Content -LiteralPath $ArchitectureModelPath -Raw |
    ConvertFrom-Json

$nodes = @(
    $architectureModel.Nodes |
        ForEach-Object {
            $_
        }
)

$architectureEdges = @(
    $architectureModel.Edges |
        ForEach-Object {
            $_
        }
)

if ($nodes.Count -eq 0) {
    throw "Architecture model contains zero nodes: $ArchitectureModelPath"
}

$nodeLookup = @{}

foreach ($node in $nodes) {
    $nodeLookup[$node.File] = $node
}

$apiRouteLookup = @{}
$apiRouteNodes = @(
    $nodes |
        Where-Object {
            $_.Role -eq "API Route"
        }
)

foreach ($apiNode in $apiRouteNodes) {
    $route = Get-ApiRouteFromFile -File $apiNode.File

    if (-not [string]::IsNullOrWhiteSpace($route)) {
        $apiRouteLookup[$route.ToLowerInvariant()] = $apiNode
    }
}

$runtimeApiCalls = @(
    foreach ($node in $nodes) {
        $fullPath = Get-ProjectFullPath -RelativePath $node.File

        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            continue
        }

        $content = [System.IO.File]::ReadAllText($fullPath)
        $routeMatches = @(
            [regex]::Matches(
                $content,
                "/api/[A-Za-z0-9_\-./\[\]]+"
            ) |
                ForEach-Object {
                    $_.Value.TrimEnd("/")
                } |
                Where-Object {
                    $_
                } |
                Sort-Object -Unique
        )

        foreach ($calledRoute in $routeMatches) {
            $routeKey = $calledRoute.ToLowerInvariant()
            $targetNode = if ($apiRouteLookup.ContainsKey($routeKey)) {
                $apiRouteLookup[$routeKey]
            }
            else {
                $null
            }
            $targetFile = if ($null -ne $targetNode) {
                $targetNode.File
            }
            else {
                $null
            }
            $callStatus = if ($null -ne $targetNode) {
                "Resolved"
            }
            else {
                "Unresolved"
            }

            [PSCustomObject]@{
                Source = $node.File
                Route = $calledRoute
                Target = $targetFile
                Status = $callStatus
            }
        }
    }
)

$internalEdges = @(
    $architectureEdges |
        Where-Object {
            $_.Kind -eq "InternalImport"
        } |
        ForEach-Object {
            [PSCustomObject]@{
                Source = $_.Source
                Target = $_.Target
                Kind = "InternalImport"
            }
        }
)

$runtimeEdges = @(
    $runtimeApiCalls |
        Where-Object {
            $_.Status -eq "Resolved"
        } |
        ForEach-Object {
            [PSCustomObject]@{
                Source = $_.Source
                Target = $_.Target
                Kind = "RuntimeApiCall"
            }
        }
)

$combinedEdges = @(
    @($internalEdges + $runtimeEdges) |
        Sort-Object -Property @("Source", "Target", "Kind") -Unique
)

$adjacency = @{}

foreach ($edge in $combinedEdges) {
    if ([string]::IsNullOrWhiteSpace($edge.Source) -or [string]::IsNullOrWhiteSpace($edge.Target)) {
        continue
    }

    if (-not $adjacency.ContainsKey($edge.Source)) {
        $adjacency[$edge.Source] = @()
    }

    $adjacency[$edge.Source] = @(
        @($adjacency[$edge.Source] + $edge.Target) |
            Sort-Object -Unique
    )
}

$workflowNodes = @(
    $nodes |
        Where-Object {
            Test-IsWorkflowNode -Node $_
        } |
        Sort-Object -Property File
)

$entryNodes = @(
    $nodes |
        Where-Object {
            $_.IsEntryPoint
        } |
        Sort-Object -Property File
)

if ($workflowNodes.Count -eq 0) {
    throw "Workflow integration analysis detected zero workflow or control nodes."
}

if ($entryNodes.Count -eq 0) {
    throw "Workflow integration analysis detected zero entry-point nodes."
}

$entryTraces = @(
    foreach ($entryNode in $entryNodes) {
        $reachableGraph = Get-ReachableGraph `
            -StartFile $entryNode.File `
            -Adjacency $adjacency
        $reachableNodes = @(
            $reachableGraph.Files |
                Where-Object {
                    $nodeLookup.ContainsKey($_)
                } |
                ForEach-Object {
                    $nodeLookup[$_]
                }
        )
        $reachableArchitectureSystems = @(
            $reachableNodes |
                Where-Object {
                    $_.Role -eq "Architecture System"
                } |
                ForEach-Object {
                    $_.File
                } |
                Sort-Object -Unique
        )
        $reachableWorkflows = @(
            $reachableNodes |
                Where-Object {
                    Test-IsWorkflowNode -Node $_
                } |
                ForEach-Object {
                    $_.File
                } |
                Sort-Object -Unique
        )
        $runtimeRoutes = @(
            $runtimeApiCalls |
                Where-Object {
                    $_.Source -eq $entryNode.File
                } |
                ForEach-Object {
                    $_.Route
                } |
                Sort-Object -Unique
        )
        $layers = @(
            $reachableNodes |
                ForEach-Object {
                    $_.Layer
                } |
                Sort-Object -Unique
        )
        $containsAiPipeline = @(
            $reachableNodes |
                Where-Object {
                    $_.File -match "(?i)(ai-case-partner|aiDrafting|legal-intelligence)"
                }
        ).Count -gt 0
        $status = if ($reachableNodes.Count -gt 0 -or $runtimeRoutes.Count -gt 0) {
            "Connected"
        }
        else {
            "Isolated"
        }
        $entryRoute = if ($entryNode.Role -eq "API Route") {
            Get-ApiRouteFromFile -File $entryNode.File
        }
        else {
            Get-ApplicationRouteFromFile -File $entryNode.File
        }

        [PSCustomObject]@{
            Entry = $entryNode.File
            Route = $entryRoute
            EntryType = $entryNode.Role
            Status = $status
            ReachableNodeCount = $reachableNodes.Count
            ReachableArchitectureSystemCount = $reachableArchitectureSystems.Count
            ReachableWorkflowCount = $reachableWorkflows.Count
            MaximumDepth = $reachableGraph.MaxDepth
            ContainsAiPipeline = $containsAiPipeline
            RuntimeApiRoutes = $runtimeRoutes
            ReachableLayers = $layers
            ReachableArchitectureSystems = $reachableArchitectureSystems
            ReachableWorkflows = $reachableWorkflows
        }
    }
)

$workflowRecords = @(
    foreach ($workflowNode in $workflowNodes) {
        $reachableGraph = Get-ReachableGraph `
            -StartFile $workflowNode.File `
            -Adjacency $adjacency
        $downstreamArchitectureSystems = @(
            $reachableGraph.Files |
                Where-Object {
                    $nodeLookup.ContainsKey($_) -and
                    $nodeLookup[$_].Role -eq "Architecture System"
                } |
                Sort-Object -Unique
        )
        $upstreamEntries = @(
            $entryTraces |
                Where-Object {
                    $_.ReachableWorkflows -contains $workflowNode.File -or
                    $_.ReachableArchitectureSystems -contains $workflowNode.File
                } |
                ForEach-Object {
                    $_.Entry
                } |
                Sort-Object -Unique
        )
        $consumers = @(
            Convert-ToStringArray -Value $workflowNode.Consumers |
                Sort-Object -Unique
        )
        $dependencies = @(
            Convert-ToStringArray -Value $workflowNode.InternalDependencies |
                Sort-Object -Unique
        )
        $status = if ($upstreamEntries.Count -gt 0) {
            "Entry-connected"
        }
        elseif ($consumers.Count -gt 0) {
            "Internally connected"
        }
        else {
            "Unconsumed"
        }

        [PSCustomObject]@{
            Name = $workflowNode.Name
            Kind = Get-WorkflowKind -Node $workflowNode
            File = $workflowNode.File
            Layer = $workflowNode.Layer
            Status = $status
            DirectDependencies = $dependencies
            DirectConsumers = $consumers
            UpstreamEntryPoints = $upstreamEntries
            DownstreamArchitectureSystems = $downstreamArchitectureSystems
            MaximumDownstreamDepth = $reachableGraph.MaxDepth
        }
    }
)

$unresolvedRuntimeCalls = @(
    $runtimeApiCalls |
        Where-Object {
            $_.Status -eq "Unresolved"
        }
)

$isolatedEntryTraces = @(
    $entryTraces |
        Where-Object {
            $_.Status -eq "Isolated"
        }
)

$unconsumedWorkflowRecords = @(
    $workflowRecords |
        Where-Object {
            $_.Status -eq "Unconsumed"
        }
)

$statistics = [PSCustomObject]@{
    WorkflowRecords = $workflowRecords.Count
    EntryTraces = $entryTraces.Count
    RuntimeApiCalls = $runtimeApiCalls.Count
    ResolvedRuntimeApiCalls = @(
        $runtimeApiCalls |
            Where-Object {
                $_.Status -eq "Resolved"
            }
    ).Count
    UnresolvedRuntimeApiCalls = $unresolvedRuntimeCalls.Count
    IsolatedEntryTraces = $isolatedEntryTraces.Count
    UnconsumedWorkflowRecords = $unconsumedWorkflowRecords.Count
}

$workflowIntegrationModel = [PSCustomObject]@{
    ModelVersion = $modelVersion
    GeneratedAt = $generatedAt
    ProjectRoot = $resolvedProjectRoot
    ArchitectureModelVersion = $architectureModel.ModelVersion
    Statistics = $statistics
    Workflows = $workflowRecords
    EntryTraces = $entryTraces
    RuntimeApiCalls = $runtimeApiCalls
}

$modelOutputPath = Join-Path $OutputFolder "WORKFLOW_INTEGRATION_MODEL.json"
$workflowOutputPath = Join-Path $OutputFolder "WORKFLOW_REGISTRY.md"
$integrationOutputPath = Join-Path $OutputFolder "INTEGRATION_TRACE_REGISTRY.md"

$workflowIntegrationModel |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath $modelOutputPath -Encoding UTF8

$workflowMarkdown = New-Object System.Collections.Generic.List[string]
$workflowMarkdown.Add("# CourtSimplified Workflow Registry")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("**Generated:** $generatedAt")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("> Generated from the locked architecture model. Workflow records include workflow, orchestration, gateway, assembly, migration, and coordination systems.")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("## Summary")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("| Metric | Count |")
$workflowMarkdown.Add("|---|---:|")
$workflowMarkdown.Add("| Workflow and control records | $($statistics.WorkflowRecords) |")
$workflowMarkdown.Add("| Entry-connected records | $(@($workflowRecords | Where-Object { $_.Status -eq 'Entry-connected' }).Count) |")
$workflowMarkdown.Add("| Internally connected records | $(@($workflowRecords | Where-Object { $_.Status -eq 'Internally connected' }).Count) |")
$workflowMarkdown.Add("| Unconsumed records | $($statistics.UnconsumedWorkflowRecords) |")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("## Workflow Records")
$workflowMarkdown.Add("")
$workflowMarkdown.Add("| Name | Kind | Layer | Status | Direct Dependencies | Direct Consumers | Upstream Entry Points | Downstream Architecture Systems | Maximum Depth | File |")
$workflowMarkdown.Add("|---|---|---|---|---|---|---|---|---:|---|")

foreach ($record in $workflowRecords) {
    $dependencyText = if ($record.DirectDependencies.Count -gt 0) {
        $record.DirectDependencies -join ", "
    }
    else {
        "None detected"
    }
    $consumerText = if ($record.DirectConsumers.Count -gt 0) {
        $record.DirectConsumers -join ", "
    }
    else {
        "None detected"
    }
    $entryText = if ($record.UpstreamEntryPoints.Count -gt 0) {
        $record.UpstreamEntryPoints -join ", "
    }
    else {
        "None detected"
    }
    $downstreamText = if ($record.DownstreamArchitectureSystems.Count -gt 0) {
        $record.DownstreamArchitectureSystems -join ", "
    }
    else {
        "None detected"
    }

    $workflowMarkdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $record.Name) + " | " +
        (Convert-ToMarkdownCell -Value $record.Kind) + " | " +
        (Convert-ToMarkdownCell -Value $record.Layer) + " | " +
        (Convert-ToMarkdownCell -Value $record.Status) + " | " +
        (Convert-ToMarkdownCell -Value $dependencyText) + " | " +
        (Convert-ToMarkdownCell -Value $consumerText) + " | " +
        (Convert-ToMarkdownCell -Value $entryText) + " | " +
        (Convert-ToMarkdownCell -Value $downstreamText) + " | " +
        $record.MaximumDownstreamDepth + " | " +
        (Convert-ToMarkdownCell -Value $record.File) + " |"
    )
}

$workflowMarkdown |
    Set-Content -LiteralPath $workflowOutputPath -Encoding UTF8

$integrationMarkdown = New-Object System.Collections.Generic.List[string]
$integrationMarkdown.Add("# CourtSimplified Integration Trace Registry")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("**Generated:** $generatedAt")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("> Traces combine resolved TypeScript imports with detected runtime /api/ route calls. A trace proves static connectivity, not that every runtime branch executed.")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("## Summary")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("| Metric | Count |")
$integrationMarkdown.Add("|---|---:|")
$integrationMarkdown.Add("| Entry traces | $($statistics.EntryTraces) |")
$integrationMarkdown.Add("| Runtime API calls | $($statistics.RuntimeApiCalls) |")
$integrationMarkdown.Add("| Resolved runtime API calls | $($statistics.ResolvedRuntimeApiCalls) |")
$integrationMarkdown.Add("| Unresolved runtime API calls | $($statistics.UnresolvedRuntimeApiCalls) |")
$integrationMarkdown.Add("| Isolated entries | $($statistics.IsolatedEntryTraces) |")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("## Entry Traces")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("| Route | Entry Type | Status | Reachable Nodes | Architecture Systems | Workflows | Maximum Depth | AI Pipeline | Runtime API Routes | Reachable Layers | File |")
$integrationMarkdown.Add("|---|---|---|---:|---:|---:|---:|---|---|---|---|")

foreach ($trace in $entryTraces) {
    $runtimeRouteText = if ($trace.RuntimeApiRoutes.Count -gt 0) {
        $trace.RuntimeApiRoutes -join ", "
    }
    else {
        "None detected"
    }
    $layerText = if ($trace.ReachableLayers.Count -gt 0) {
        $trace.ReachableLayers -join ", "
    }
    else {
        "None detected"
    }

    $integrationMarkdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $trace.Route) + " | " +
        (Convert-ToMarkdownCell -Value $trace.EntryType) + " | " +
        (Convert-ToMarkdownCell -Value $trace.Status) + " | " +
        $trace.ReachableNodeCount + " | " +
        $trace.ReachableArchitectureSystemCount + " | " +
        $trace.ReachableWorkflowCount + " | " +
        $trace.MaximumDepth + " | " +
        $trace.ContainsAiPipeline + " | " +
        (Convert-ToMarkdownCell -Value $runtimeRouteText) + " | " +
        (Convert-ToMarkdownCell -Value $layerText) + " | " +
        (Convert-ToMarkdownCell -Value $trace.Entry) + " |"
    )
}

$integrationMarkdown.Add("")
$integrationMarkdown.Add("## Runtime API Calls")
$integrationMarkdown.Add("")
$integrationMarkdown.Add("| Source | Route | Status | Target |")
$integrationMarkdown.Add("|---|---|---|---|")

foreach ($call in $runtimeApiCalls) {
    $integrationMarkdown.Add(
        "| " +
        (Convert-ToMarkdownCell -Value $call.Source) + " | " +
        (Convert-ToMarkdownCell -Value $call.Route) + " | " +
        (Convert-ToMarkdownCell -Value $call.Status) + " | " +
        (Convert-ToMarkdownCell -Value $call.Target) + " |"
    )
}

$integrationMarkdown |
    Set-Content -LiteralPath $integrationOutputPath -Encoding UTF8

Write-Host "Generated WORKFLOW_INTEGRATION_MODEL.json"
Write-Host "Generated WORKFLOW_REGISTRY.md"
Write-Host "Generated INTEGRATION_TRACE_REGISTRY.md"
Write-Host "Workflow records: $($statistics.WorkflowRecords)"
Write-Host "Entry traces: $($statistics.EntryTraces)"

if ($PassThru) {
    Write-Output $statistics
}
