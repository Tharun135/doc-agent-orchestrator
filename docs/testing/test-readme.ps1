# Test README.md Quality

Write-Host ""
Write-Host "=== Documentation Agent Orchestrator README Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: File exists
Write-Host "[Test 1] Checking README.md exists..." -ForegroundColor Yellow
if (Test-Path "README.md") {
    Write-Host "  PASS - README.md found" -ForegroundColor Green
} else {
    Write-Host "  FAIL - README.md not found!" -ForegroundColor Red
    exit 1
}

# Test 2: File size
Write-Host ""
Write-Host "[Test 2] Checking file size..." -ForegroundColor Yellow
$fileSize = (Get-Item "README.md").Length
$fileSizeKB = [math]::Round($fileSize/1KB, 2)
Write-Host "  PASS - README.md is $fileSizeKB KB" -ForegroundColor Green

# Test 3: Line count
Write-Host ""
Write-Host "[Test 3] Counting lines..." -ForegroundColor Yellow
$lineCount = (Get-Content "README.md").Count
Write-Host "  PASS - README.md has $lineCount lines" -ForegroundColor Green

# Test 4: Check for required sections
Write-Host ""
Write-Host "[Test 4] Checking required sections..." -ForegroundColor Yellow
$content = Get-Content "README.md" -Raw

$sections = @{
    "Main Title" = "# Documentation Agent Orchestrator"
    "Getting Started" = "## Getting Started"
    "Basic Example" = "## Basic Example"
    "Commands" = "## Commands and Shortcuts"
    "Version History" = "## Version History"
    "Support" = "## Support"
}

$allSectionsFound = $true
foreach ($key in $sections.Keys) {
    $section = $sections[$key]
    if ($content.Contains($section)) {
        Write-Host "  PASS - Found: $key" -ForegroundColor Green
    } else {
        Write-Host "  FAIL - Missing: $key" -ForegroundColor Red
        $allSectionsFound = $false
    }
}

# Test 5: Check for links
Write-Host ""
Write-Host "[Test 5] Checking external links..." -ForegroundColor Yellow
$linkPattern = '\[([^\]]+)\]\((https?://[^\)]+)\)'
$links = [regex]::Matches($content, $linkPattern)
Write-Host "  PASS - Found $($links.Count) external links" -ForegroundColor Green

# Test 6: Check for code blocks
Write-Host ""
Write-Host "[Test 6] Checking code blocks..." -ForegroundColor Yellow
$codeMarkers = [regex]::Matches($content, '```')
$codeBlockCount = [math]::Floor($codeMarkers.Count / 2)
Write-Host "  PASS - Found $codeBlockCount code blocks" -ForegroundColor Green

# Test 7: Check markdown headings
Write-Host ""
Write-Host "[Test 7] Analyzing heading structure..." -ForegroundColor Yellow
$h1Count = ([regex]::Matches($content, '(?m)^# ')).Count
$h2Count = ([regex]::Matches($content, '(?m)^## ')).Count
$h3Count = ([regex]::Matches($content, '(?m)^### ')).Count
Write-Host "  INFO - H1 headings: $h1Count" -ForegroundColor Cyan
Write-Host "  INFO - H2 headings: $h2Count" -ForegroundColor Cyan
Write-Host "  INFO - H3 headings: $h3Count" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
if ($allSectionsFound) {
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  SOME TESTS FAILED - Check output above" -ForegroundColor Red
}

# Next steps
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "  1. Press Ctrl+Shift+V to preview in VS Code" -ForegroundColor White
Write-Host "  2. Use Dillinger.io for online rendering test" -ForegroundColor White
Write-Host "  3. Push to GitHub to see how it renders" -ForegroundColor White
Write-Host "  4. Test actual extension commands" -ForegroundColor White
Write-Host ""
