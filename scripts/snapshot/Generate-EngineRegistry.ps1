param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$OutputFolder,

    [switch]$PassThru
)

$ErrorActionPreference = "Stop"
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$enginePattern = "(?i)(engine|orchestrator|coordinator|gateway|investigator|navigator|bridge|registry|reasoning)"
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

function Get-RelativeProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    $directorySeparator = [System.IO.Path]::DirectorySeparatorChar
    $prefix = $resolvedProjectRoot + $directorySeparator

    if ($FullPath.StartsWith(
        $prefix,
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        return $FullPath.Substring($prefix.Length)
    }

    return $FullPath
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

function Convert-IdentifierToWords {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $text = $Value `
        -creplace "([a-z0-9])([A-Z])", '$1 $2' `
        -creplace "([A-Z]+)([A-Z][a-z])", '$1 $2' `
        -replace "[-_.]+", " "

    $text = ($text -replace "\s+", " ").Trim()

    if ($text.Length -gt 0) {
        $text = $text.Substring(0, 1).ToUpperInvariant() + $text.Substring(1)
    }

    $text = $text -creplace "\bAi\b", "AI"
    $text = $text -creplace "\bApi\b", "API"

    return $text
}

function Get-ImportSpecifiers {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    $imports = New-Object System.Collections.Generic.List[string]

    $staticMatches = [regex]::Matches(
        $Content,
        "(?m)^\s*import[\s\S]*?from\s+['""]([^'""]+)['""]|(?m)^\s*import\s+['""]([^'""]+)['""]"
    )

    foreach ($match in $staticMatches) {
        $value = if ($match.Groups[1].Value) {
            $match.Groups[1].Value
        }
        else {
            $match.Groups[2].Value
        }

        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $imports.Add($value)
        }
    }

    $dynamicMatches = [regex]::Matches(
        $Content,
        "(?:import|require)\s*\(\s*['""]([^'""]+)['""]\s*\)"
    )

    foreach ($match in $dynamicMatches) {
        $value = $match.Groups[1].Value

        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $imports.Add($value)
        }
    }

    return @(
        $imports |
            Sort-Object -Unique
    )
}

function Get-ExportNames {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    return @(
        [regex]::Matches(
            $Content,
            "export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_]+)"
        ) |
            ForEach-Object {
                $_.Groups[1].Value
            } |
            Where-Object {
                $_
            } |
            Sort-Object -Unique
    )
}

function Get-CallableExportNames {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    return @(
        [regex]::Matches(
            $Content,
            "export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_]+)"
        ) |
            ForEach-Object {
                $_.Groups[1].Value
            } |
            Where-Object {
                $_
            } |
            Sort-Object -Unique
    )
}

function Get-ExportedContractNames {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    return @(
        [regex]::Matches(
            $Content,
            "(?m)^\s*export\s+(?:declare\s+)?(?:interface|type|class|enum)\s+([A-Za-z0-9_]+)"
        ) |
            ForEach-Object {
                $_.Groups[1].Value
            } |
            Where-Object {
                $_
            } |
            Sort-Object -Unique
    )
}

function Get-EngineCategory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($Name -match "(?i)engine") {
        return "Engine"
    }

    if ($Name -match "(?i)orchestrator") {
        return "Orchestrator"
    }

    if ($Name -match "(?i)gateway") {
        return "Gateway"
    }

    if ($Name -match "(?i)bridge") {
        return "Bridge"
    }

    if ($Name -match "(?i)coordinator") {
        return "Coordinator"
    }

    if ($Name -match "(?i)navigator") {
        return "Navigator"
    }

    if ($Name -match "(?i)registry") {
        return "Registry"
    }

    if ($Name -match "(?i)investigator") {
        return "Investigator"
    }

    return "Reasoning"
}

function Get-EnginePurpose {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Category,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    $declaredPurpose = [regex]::Match(
        $Content,
        "(?im)^\s*(?://|/\*+|\*)\s*(?:@?purpose|responsibility)\s*[:\-]\s*(.+?)\s*(?:\*/)?$"
    )

    if ($declaredPurpose.Success) {
        return "Declared: " + $declaredPurpose.Groups[1].Value.Trim()
    }

    $subject = Convert-IdentifierToWords -Value $Name
    $subject = (
        $subject -replace "(?i)\s+(Engine|Orchestrator|Coordinator|Gateway|Investigator|Navigator|Bridge|Registry|Reasoning)$", ""
    ).Trim()

    switch ($Category) {
        "Engine" {
            return "Inferred: Processes $subject and exposes the resulting capability to its consumers."
        }
        "Orchestrator" {
            return "Inferred: Coordinates $subject across dependent CourtSimplified systems."
        }
        "Gateway" {
            return "Inferred: Provides the controlled entry point for $subject."
        }
        "Bridge" {
            return "Inferred: Transfers and aligns $subject between architecture layers."
        }
        "Coordinator" {
            return "Inferred: Coordinates $subject inputs, dependencies, and results."
        }
        "Investigator" {
            return "Inferred: Analyzes $subject within the litigation-intelligence process."
        }
        "Navigator" {
            return "Inferred: Routes $subject requests through the appropriate systems."
        }
        "Registry" {
            return "Inferred: Defines and exposes the authoritative $subject records used by consumers."
        }
        default {
            return "Inferred: Supplies reasoning configuration or reasoning support for $subject."
        }
    }
}

function Get-WorkflowPosition {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $searchValue = ($RelativePath + " " + $Name).ToLowerInvariant()

    if ($searchValue -match "intake|normalization") {
        return "1 - Intake and normalization"
    }

    if ($searchValue -match "casecontext|mastercase|case-system\\orchestration|case-system/orchestration|case-system\\contracts|case-system/contracts") {
        return "2 - Master case construction and core assembly"
    }

    if ($searchValue -match "ai-case-partner|conversation|caseinvestigation") {
        return "3 - AI case-partner interpretation and investigation"
    }

    if ($searchValue -match "knowledge|legal-intelligence") {
        return "4 - Knowledge retrieval and legal reasoning"
    }

    if ($searchValue -match "authority") {
        return "5 - Authority retrieval, verification, and integration"
    }

    if ($searchValue -match "evidence") {
        return "7 - Evidence analysis, assembly, and proof mapping"
    }

    if ($searchValue -match "procedur|rulesengine|workflow") {
        return "8 - Procedure and workflow orchestration"
    }

    if ($searchValue -match "form|document|draft|package|prefill") {
        return "9 - Forms, drafting, documents, and court packages"
    }

    if ($searchValue -match "trial") {
        return "10 - Trial preparation"
    }

    if ($searchValue -match "settlement") {
        return "11 - Settlement analysis"
    }

    if ($searchValue -match "litigation-intelligence|litigationstrategy|claimtheory|legaltheory|scenario|factpattern|contradiction|credibility|damages|narrative") {
        return "6 - Litigation analysis and strategy"
    }

    if ($searchValue -match "persistence|storage|supabase") {
        return "12 - Persistence and external storage"
    }

    if ($searchValue -match "dashboard|display") {
        return "13 - User-interface presentation"
    }

    if ($searchValue -match "civil|family|smallclaims|small-claims") {
        return "Court-area specialization"
    }

    return "Cross-cutting architecture support"
}

function Get-AiPipelinePosition {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    switch -Regex ($Name) {
        "^aiCasePartnerGateway$" {
            return "Entry - AI case-partner gateway"
        }
        "^aiCasePartnerOrchestrator$" {
            return "Control - AI case-partner orchestration"
        }
        "^conversationIntelligenceEngine$" {
            return "Interpretation - Conversation intelligence"
        }
        "^conversationMemoryEngine$" {
            return "Memory - Conversation state and continuity"
        }
        "^caseInvestigationEngine$" {
            return "Investigation - AI case investigation"
        }
        "^legalReasoningCoordinator$" {
            return "Reasoning - Legal reasoning coordination"
        }
        "^knowledgeRetrievalEngine$" {
            return "Knowledge - Legal knowledge retrieval"
        }
        "^courtSimplifiedBrainBridge$" {
            return "Integration - AI brain to master case system"
        }
        "^aiDraftingAssistantEngine$" {
            return "Output - AI-assisted drafting"
        }
    }

    if ($RelativePath -match "(?i)ai-case-partner") {
        return "Support - AI case-partner pipeline"
    }

    if ($Name -match "(?i)(reasoning|interpretation|scenarioConfidence)") {
        return "Support - Reasoning and confidence analysis"
    }

    return "No direct AI pipeline position detected"
}

function Resolve-ImportTarget {
    param(
        [Parameter(Mandatory = $true)]
        $Record,

        [Parameter(Mandatory = $true)]
        [string]$Specifier,

        [Parameter(Mandatory = $true)]
        [hashtable]$PathLookup,

        [Parameter(Mandatory = $true)]
        [hashtable]$BaseNameLookup
    )

    $candidateBases = @()
    $directorySeparator = [System.IO.Path]::DirectorySeparatorChar

    if ($Specifier.StartsWith(".")) {
        $localSpecifier = $Specifier.Replace("/", $directorySeparator)
        $candidateBases += [System.IO.Path]::GetFullPath(
            (Join-Path $Record.DirectoryName $localSpecifier)
        )
    }
    elseif ($Specifier.StartsWith("@/")) {
        $aliasSpecifier = $Specifier.Substring(2).Replace("/", $directorySeparator)
        $candidateBases += Join-Path (Join-Path $resolvedProjectRoot "src") $aliasSpecifier
        $candidateBases += Join-Path $resolvedProjectRoot $aliasSpecifier
    }
    elseif ($Specifier -match "^(?i)src/") {
        $sourceSpecifier = $Specifier.Replace("/", $directorySeparator)
        $candidateBases += Join-Path $resolvedProjectRoot $sourceSpecifier
    }

    foreach ($candidateBaseValue in $candidateBases) {
        $candidateBase = $candidateBaseValue

        if ($candidateBase.EndsWith(".js", [System.StringComparison]::OrdinalIgnoreCase)) {
            $candidateBase = $candidateBase.Substring(0, $candidateBase.Length - 3)
        }

        $candidates = @(
            $candidateBase,
            "${candidateBase}.ts",
            "${candidateBase}.tsx",
            (Join-Path $candidateBase "index.ts"),
            (Join-Path $candidateBase "index.tsx")
        )

        foreach ($candidate in $candidates) {
            $key = Get-NormalizedFullPath -Path $candidate

            if ($PathLookup.ContainsKey($key)) {
                return $PathLookup[$key]
            }
        }
    }

    if (
        $Specifier.StartsWith(".") -or
        $Specifier.StartsWith("@/") -or
        $Specifier -match "^(?i)src/"
    ) {
        $leafName = [System.IO.Path]::GetFileNameWithoutExtension(
            ($Specifier -replace "/", "\")
        )

        if ($leafName) {
            $leafKey = $leafName.ToLowerInvariant()

            if (
                $BaseNameLookup.ContainsKey($leafKey) -and
                @($BaseNameLookup[$leafKey]).Count -eq 1
            ) {
                return @($BaseNameLookup[$leafKey])[0]
            }
        }
    }

    return $null
}

function Get-NameTokens {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $words = (Convert-IdentifierToWords -Value $Name).ToLowerInvariant() -split "\s+"
    $ignoredWords = @(
        "engine",
        "orchestrator",
        "coordinator",
        "gateway",
        "investigator",
        "navigator",
        "bridge",
        "registry",
        "reasoning",
        "types",
        "legacy"
    )

    return @(
        $words |
            Where-Object {
                $_ -and $_ -notin $ignoredWords
            } |
            Sort-Object -Unique
    )
}

function Get-DuplicateDetection {
    param(
        [Parameter(Mandatory = $true)]
        $Row,

        [Parameter(Mandatory = $true)]
        [array]$AllRows
    )

    $findings = New-Object System.Collections.Generic.List[string]
    $otherRows = @(
        $AllRows |
            Where-Object {
                $_.File -ne $Row.File
            }
    )

    $exactNameMatches = @(
        $otherRows |
            Where-Object {
                $_.Name -eq $Row.Name
            } |
            Sort-Object File -Unique
    )

    if ($exactNameMatches.Count -gt 0) {
        $files = @(
            $exactNameMatches |
                ForEach-Object {
                    $_.File
                }
        ) -join ", "

        $findings.Add("Exact-name duplicate: $files")
    }

    foreach ($other in $otherRows) {
        if ($other.Name -eq $Row.Name) {
            continue
        }

        $sharedCallables = @(
            $Row.CallableExports |
                Where-Object {
                    $other.CallableExports -contains $_
                } |
                Sort-Object -Unique
        )

        if ($sharedCallables.Count -gt 0) {
            $findings.Add(
                "Shared callable export with $($other.Name): " +
                ($sharedCallables -join ", ")
            )
        }

        if ($other.Category -ne $Row.Category) {
            continue
        }

        $leftTokens = @($Row.NameTokens)
        $rightTokens = @($other.NameTokens)

        if ($leftTokens.Count -lt 2 -or $rightTokens.Count -lt 2) {
            continue
        }

        $intersection = @(
            $leftTokens |
                Where-Object {
                    $rightTokens -contains $_
                } |
                Sort-Object -Unique
        )

        $union = @(
            @($leftTokens + $rightTokens) |
                Sort-Object -Unique
        )

        if ($union.Count -eq 0) {
            continue
        }

        $similarity = $intersection.Count / $union.Count

        if ($intersection.Count -ge 2 -and $similarity -ge 0.66) {
            $percentage = [Math]::Round($similarity * 100)
            $findings.Add(
                "Potential name overlap with $($other.Name): $percentage%"
            )
        }
    }

    $uniqueFindings = @(
        $findings |
            Sort-Object -Unique
    )

    if ($uniqueFindings.Count -eq 0) {
        return "None detected"
    }

    return $uniqueFindings -join "; "
}

function Get-RiskLevel {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Category,

        [Parameter(Mandatory = $true)]
        [int]$Lines,

        [Parameter(Mandatory = $true)]
        [int]$DependencyCount,

        [Parameter(Mandatory = $true)]
        [int]$ConsumerCount,

        [Parameter(Mandatory = $true)]
        [string]$AiPipelinePosition
    )

    $score = 0
    $factors = New-Object System.Collections.Generic.List[string]

    if ($Name -match "(?i)(masterCase|courtSimplifiedBrain|workflowOrchestration|casePersistence|aiCasePartner|authority.*(?:Brain|CaseSystem|Workflow))") {
        $score += 3
        $factors.Add("core architecture")
    }

    if ($ConsumerCount -ge 10) {
        $score += 3
        $factors.Add("$ConsumerCount consumers")
    }
    elseif ($ConsumerCount -ge 5) {
        $score += 2
        $factors.Add("$ConsumerCount consumers")
    }
    elseif ($ConsumerCount -ge 1) {
        $score += 1
        $factors.Add("$ConsumerCount consumer(s)")
    }

    if ($DependencyCount -ge 10) {
        $score += 2
        $factors.Add("$DependencyCount dependencies")
    }
    elseif ($DependencyCount -ge 5) {
        $score += 1
        $factors.Add("$DependencyCount dependencies")
    }

    if ($Lines -ge 1500) {
        $score += 2
        $factors.Add("$Lines lines")
    }
    elseif ($Lines -ge 800) {
        $score += 1
        $factors.Add("$Lines lines")
    }

    if ($Category -in @("Gateway", "Orchestrator")) {
        $score += 2
        $factors.Add($Category.ToLowerInvariant())
    }
    elseif ($Category -in @("Bridge", "Coordinator")) {
        $score += 1
        $factors.Add($Category.ToLowerInvariant())
    }

    if ($AiPipelinePosition -notmatch "^No direct") {
        $score += 1
        $factors.Add("AI pipeline")
    }

    $level = if ($score -ge 8) {
        "Critical"
    }
    elseif ($score -ge 5) {
        "High"
    }
    elseif ($score -ge 3) {
        "Medium"
    }
    else {
        "Low"
    }

    $factorText = if ($factors.Count -gt 0) {
        @($factors | Sort-Object -Unique) -join ", "
    }
    else {
        "limited detected coupling"
    }

    return ("{0} (score {1}: {2})" -f $level, $score, $factorText)
}

function Get-IntegrationPoints {
    param(
        [Parameter(Mandatory = $true)]
        $Row
    )

    $points = New-Object System.Collections.Generic.List[string]

    $internalDependencies = @(
        $Row.InternalDependencies |
            ForEach-Object {
                $_.BaseName
            } |
            Sort-Object -Unique
    )

    if ($internalDependencies.Count -gt 0) {
        $points.Add(
            "Internal dependencies: " +
            ($internalDependencies -join ", ")
        )
    }

    $directConsumers = @(
        $Row.ConsumerRecords |
            ForEach-Object {
                $_.BaseName
            } |
            Sort-Object -Unique
    )

    if ($directConsumers.Count -gt 0) {
        $points.Add(
            "Direct consumers: " +
            ($directConsumers -join ", ")
        )
    }

    $apiRoutes = @(
        foreach ($consumer in $Row.ConsumerRecords) {
            $path = $consumer.RelativePath -replace "\\", "/"

            if ($path -match "^(?:src/)?app/api/(.+)/route\.tsx?$") {
                "/api/" + $Matches[1]
            }
        }
    ) | Sort-Object -Unique

    if ($apiRoutes.Count -gt 0) {
        $points.Add("API routes: " + ($apiRoutes -join ", "))
    }

    $uiRoutes = @(
        foreach ($consumer in $Row.ConsumerRecords) {
            $path = $consumer.RelativePath -replace "\\", "/"

            if ($path -match "^(?:src/)?app/(.+)/(?:page|layout)\.tsx?$") {
                "/" + $Matches[1]
            }
            elseif ($path -match "^(?:src/)?app/(?:page|layout)\.tsx?$") {
                "/"
            }
        }
    ) | Sort-Object -Unique

    if ($uiRoutes.Count -gt 0) {
        $points.Add("UI routes: " + ($uiRoutes -join ", "))
    }

    $externalDependencies = @(
        $Row.Dependencies |
            Where-Object {
                -not $_.StartsWith(".") -and
                -not $_.StartsWith("@/") -and
                $_ -notmatch "^(?i)src/"
            } |
            Sort-Object -Unique
    )

    if ($externalDependencies.Count -gt 0) {
        $points.Add(
            "External packages: " +
            ($externalDependencies -join ", ")
        )
    }

    if ($points.Count -eq 0) {
        return "No direct integration point detected"
    }

    return (
        @(
            $points |
                Sort-Object -Unique
        ) -join "; "
    )
}

if (-not (Test-Path -LiteralPath $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$tsFiles = @(
    Get-ChildItem `
        -LiteralPath $resolvedProjectRoot `
        -Recurse `
        -File `
        -Include @("*.ts", "*.tsx") |
        Where-Object {
            $_.Extension -in @(".ts", ".tsx") -and
            $_.FullName -notmatch "\\node_modules\\" -and
            $_.FullName -notmatch "\\.next\\" -and
            $_.FullName -notmatch "\\.git\\" -and
            $_.FullName -notmatch "\\_PROJECT_REGISTRY\\"
        } |
        Sort-Object FullName
)

$fileRecords = @(
    foreach ($file in $tsFiles) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $exports = @(Get-ExportNames -Content $content)
        $callableExports = @(Get-CallableExportNames -Content $content)
        $exportedContracts = @(Get-ExportedContractNames -Content $content)

        [PSCustomObject]@{
            BaseName = $file.BaseName
            FullName = $file.FullName
            FullPathKey = Get-NormalizedFullPath -Path $file.FullName
            DirectoryName = $file.DirectoryName
            RelativePath = Get-RelativeProjectPath -FullPath $file.FullName
            Content = $content
            Lines = ($content -split "`r?`n").Count
            Imports = @(Get-ImportSpecifiers -Content $content)
            Exports = $exports
            CallableExports = $callableExports
            ExportedContracts = $exportedContracts
        }
    }
)

$pathLookup = @{}
$baseNameLookup = @{}

foreach ($record in $fileRecords) {
    $pathLookup[$record.FullPathKey] = $record

    $baseNameKey = $record.BaseName.ToLowerInvariant()

    if (-not $baseNameLookup.ContainsKey($baseNameKey)) {
        $baseNameLookup[$baseNameKey] = @()
    }

    $baseNameLookup[$baseNameKey] = @(
        $baseNameLookup[$baseNameKey] + $record
    )
}

$consumerMap = @{}

foreach ($record in $fileRecords) {
    foreach ($specifier in $record.Imports) {
        $target = Resolve-ImportTarget `
            -Record $record `
            -Specifier $specifier `
            -PathLookup $pathLookup `
            -BaseNameLookup $baseNameLookup

        if ($null -eq $target) {
            continue
        }

        if (-not $consumerMap.ContainsKey($target.FullPathKey)) {
            $consumerMap[$target.FullPathKey] = @()
        }

        $consumerMap[$target.FullPathKey] = @(
            $consumerMap[$target.FullPathKey] + $record
        )
    }
}

$baseRows = @(
    foreach ($record in $fileRecords) {
        if ($record.BaseName -notmatch $enginePattern) {
            continue
        }

        $category = Get-EngineCategory -Name $record.BaseName
        $consumers = if ($consumerMap.ContainsKey($record.FullPathKey)) {
            @(
                $consumerMap[$record.FullPathKey] |
                    Sort-Object RelativePath -Unique
            )
        }
        else {
            @()
        }

        $internalDependencies = @(
            foreach ($specifier in $record.Imports) {
                $target = Resolve-ImportTarget `
                    -Record $record `
                    -Specifier $specifier `
                    -PathLookup $pathLookup `
                    -BaseNameLookup $baseNameLookup

                if ($null -ne $target) {
                    $target
                }
            }
        ) | Sort-Object RelativePath -Unique

        $inputContracts = @(
            $record.ExportedContracts |
                Where-Object {
                    $_ -match "(?i)(Input|Request|Params|Parameters|Options|Context|Payload|Command|Query)$"
                } |
                Sort-Object -Unique
        )

        $outputContracts = @(
            $record.ExportedContracts |
                Where-Object {
                    $_ -match "(?i)(Output|Result|Response|Package|Report|State|Diagnostic|Diagnostics|Assessment|Analysis)$"
                } |
                Sort-Object -Unique
        )

        $aiPipelinePosition = Get-AiPipelinePosition `
            -Name $record.BaseName `
            -RelativePath $record.RelativePath

        $inputDescription = if ($inputContracts.Count -gt 0) {
            $inputContracts -join ", "
        }
        else {
            "No named input contract detected"
        }

        $outputDescription = if ($outputContracts.Count -gt 0) {
            $outputContracts -join ", "
        }
        else {
            "No named output contract detected"
        }

        [PSCustomObject]@{
            Name = $record.BaseName
            Category = $category
            Purpose = Get-EnginePurpose `
                -Name $record.BaseName `
                -Category $category `
                -Content $record.Content
            Inputs = $inputDescription
            Outputs = $outputDescription
            Dependencies = @($record.Imports)
            Consumers = @(
                $consumers |
                    ForEach-Object {
                        $_.RelativePath
                    }
            )
            WorkflowPosition = Get-WorkflowPosition `
                -Name $record.BaseName `
                -RelativePath $record.RelativePath
            AiPipelinePosition = $aiPipelinePosition
            Lines = $record.Lines
            Exports = @($record.Exports)
            File = $record.RelativePath
            CallableExports = @($record.CallableExports)
            NameTokens = @(Get-NameTokens -Name $record.BaseName)
            InternalDependencies = @($internalDependencies)
            ConsumerRecords = @($consumers)
        }
    }
)

$rows = @(
    foreach ($baseRow in $baseRows) {
        $duplicateDetection = Get-DuplicateDetection `
            -Row $baseRow `
            -AllRows $baseRows

        $riskLevel = Get-RiskLevel `
            -Name $baseRow.Name `
            -Category $baseRow.Category `
            -Lines $baseRow.Lines `
            -DependencyCount (@($baseRow.Dependencies).Count) `
            -ConsumerCount (@($baseRow.Consumers).Count) `
            -AiPipelinePosition $baseRow.AiPipelinePosition

        $dependencyDescription = if (@($baseRow.Dependencies).Count -gt 0) {
            @($baseRow.Dependencies) -join ", "
        }
        else {
            "None detected"
        }

        $consumerDescription = if (@($baseRow.Consumers).Count -gt 0) {
            @($baseRow.Consumers) -join ", "
        }
        else {
            "None detected"
        }

        $exportDescription = if (@($baseRow.Exports).Count -gt 0) {
            @($baseRow.Exports) -join ", "
        }
        else {
            "-"
        }

        [PSCustomObject]@{
            Name = $baseRow.Name
            Category = $baseRow.Category
            Purpose = $baseRow.Purpose
            Inputs = $baseRow.Inputs
            Outputs = $baseRow.Outputs
            Dependencies = $dependencyDescription
            Consumers = $consumerDescription
            WorkflowPosition = $baseRow.WorkflowPosition
            AiPipelinePosition = $baseRow.AiPipelinePosition
            RiskLevel = $riskLevel
            DuplicateDetection = $duplicateDetection
            IntegrationPoints = Get-IntegrationPoints -Row $baseRow
            Lines = $baseRow.Lines
            Exports = $exportDescription
            File = $baseRow.File
        }
    }
)

$outputPath = Join-Path $OutputFolder "ENGINE_REGISTRY.md"
$duplicateRows = @(
    $rows |
        Where-Object {
            $_.DuplicateDetection -ne "None detected"
        }
)

$riskCounts = @{
    Critical = @($rows | Where-Object { $_.RiskLevel -match "^Critical" }).Count
    High = @($rows | Where-Object { $_.RiskLevel -match "^High" }).Count
    Medium = @($rows | Where-Object { $_.RiskLevel -match "^Medium" }).Count
    Low = @($rows | Where-Object { $_.RiskLevel -match "^Low" }).Count
}

$markdown = New-Object System.Collections.Generic.List[string]
$markdown.Add("# CourtSimplified Engine Registry")
$markdown.Add("")
$markdown.Add("**Generated:** $generatedAt")
$markdown.Add("")
$markdown.Add("> Generated through deterministic static analysis of the current TypeScript source. Purpose falls back to an explicitly labelled inference when no source-level Purpose or Responsibility annotation exists. Consumers are direct imports. Duplicate findings are review warnings, not automatic proof of duplicate functionality. Risk describes architectural change impact, not legal risk.")
$markdown.Add("")
$markdown.Add("## Registry Summary")
$markdown.Add("")
$markdown.Add("| Metric | Count |")
$markdown.Add("|---|---:|")
$markdown.Add("| Architecture systems | $($rows.Count) |")
$markdown.Add("| Duplicate-review candidates | $($duplicateRows.Count) |")
$markdown.Add("| Critical risk | $($riskCounts.Critical) |")
$markdown.Add("| High risk | $($riskCounts.High) |")
$markdown.Add("| Medium risk | $($riskCounts.Medium) |")
$markdown.Add("| Low risk | $($riskCounts.Low) |")
$markdown.Add("")
$markdown.Add("## Engine Records")
$markdown.Add("")

$columnDefinitions = @(
    @{ Header = "Name"; Property = "Name" },
    @{ Header = "Category"; Property = "Category" },
    @{ Header = "Purpose"; Property = "Purpose" },
    @{ Header = "Inputs"; Property = "Inputs" },
    @{ Header = "Outputs"; Property = "Outputs" },
    @{ Header = "Dependencies"; Property = "Dependencies" },
    @{ Header = "Consumers"; Property = "Consumers" },
    @{ Header = "Workflow Position"; Property = "WorkflowPosition" },
    @{ Header = "AI Pipeline Position"; Property = "AiPipelinePosition" },
    @{ Header = "Risk Level"; Property = "RiskLevel" },
    @{ Header = "Duplicate Detection"; Property = "DuplicateDetection" },
    @{ Header = "Integration Points"; Property = "IntegrationPoints" },
    @{ Header = "Lines"; Property = "Lines" },
    @{ Header = "Exports"; Property = "Exports" },
    @{ Header = "File"; Property = "File" }
)

$markdown.Add(
    "| " +
    (($columnDefinitions | ForEach-Object { $_.Header }) -join " | ") +
    " |"
)

$markdown.Add(
    "| " +
    (($columnDefinitions | ForEach-Object { "---" }) -join " | ") +
    " |"
)

foreach (
    $row in (
        $rows |
            Sort-Object -Property @("Category", "Name", "File")
    )
) {
    $cells = foreach ($column in $columnDefinitions) {
        Convert-ToMarkdownCell -Value $row.($column.Property)
    }

    $markdown.Add("| " + ($cells -join " | ") + " |")
}

$markdown |
    Set-Content -LiteralPath $outputPath -Encoding UTF8

Write-Host "Generated ENGINE_REGISTRY.md"
Write-Host "Engine records: $($rows.Count)"
Write-Host "Duplicate-review candidates: $($duplicateRows.Count)"

if ($PassThru) {
    Write-Output $rows
}