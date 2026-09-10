#Requires -Version 5.1
<#
.SYNOPSIS
    J2S-P1 검증 하네스. 커밋/배포 전에 실행해서 세 모듈이 모두 정상인지 확인한다.

.DESCRIPTION
    - backend        : Maven Wrapper 로 단위/슬라이스 테스트 실행 (H2, Supabase 접속 불필요)
    - frontend-admin : tsc --noEmit 타입체크 + vite 프로덕션 빌드
    - mobile-app     : tsc --noEmit 타입체크 (android/ios 네이티브 프로젝트가 없어 빌드는 생략)

    각 모듈 폴더에 node_modules 가 없으면 자동으로 npm install 을 먼저 실행한다.

.PARAMETER Backend
    백엔드만 검증한다.
.PARAMETER Frontend
    frontend-admin 만 검증한다.
.PARAMETER Mobile
    mobile-app 만 검증한다.
.PARAMETER SkipBuild
    frontend-admin 의 vite build 단계를 생략하고 타입체크만 한다 (빠른 반복 작업용).

.EXAMPLE
    .\scripts\check.ps1
.EXAMPLE
    .\scripts\check.ps1 -Backend
.EXAMPLE
    .\scripts\check.ps1 -Frontend -SkipBuild
#>
[CmdletBinding()]
param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Mobile,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

# 아무 스위치도 안 주면 전체 실행
$runAll = -not ($Backend -or $Frontend -or $Mobile)

$results = New-Object System.Collections.Generic.List[object]

function Invoke-Step {
    param(
        [string]$Name,
        [string]$WorkingDir,
        [scriptblock]$Action
    )
    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    $prevLoc = Get-Location
    try {
        Set-Location $WorkingDir
        & $Action
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
            throw "exit code $LASTEXITCODE"
        }
        $results.Add([pscustomobject]@{ Step = $Name; Ok = $true; Detail = '' })
        Write-Host "[OK] $Name" -ForegroundColor Green
    }
    catch {
        $results.Add([pscustomobject]@{ Step = $Name; Ok = $false; Detail = $_.Exception.Message })
        Write-Host "[FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        Set-Location $prevLoc
    }
}

function Ensure-NodeModules {
    param([string]$Dir, [string]$Label)
    if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
        Invoke-Step -Name "$Label : npm install" -WorkingDir $Dir -Action { npm install }
    }
}

# ---------------------------------------------------------------- backend
if ($runAll -or $Backend) {
    $backendDir = Join-Path $repoRoot 'backend'
    $mvnw = if ($IsWindows -or $env:OS -eq 'Windows_NT') { '.\mvnw.cmd' } else { './mvnw' }
    Invoke-Step -Name 'backend: mvn test (H2, Supabase 미접속)' -WorkingDir $backendDir -Action {
        & $mvnw -B test
    }
}

# ------------------------------------------------------------- frontend
if ($runAll -or $Frontend) {
    $feDir = Join-Path $repoRoot 'frontend-admin'
    Ensure-NodeModules -Dir $feDir -Label 'frontend-admin'
    Invoke-Step -Name 'frontend-admin: typecheck' -WorkingDir $feDir -Action {
        npm run typecheck
    }
    if (-not $SkipBuild) {
        Invoke-Step -Name 'frontend-admin: build' -WorkingDir $feDir -Action {
            npm run build
        }
    }
}

# --------------------------------------------------------------- mobile
if ($runAll -or $Mobile) {
    $mobileDir = Join-Path $repoRoot 'mobile-app'
    Ensure-NodeModules -Dir $mobileDir -Label 'mobile-app'
    Invoke-Step -Name 'mobile-app: typecheck (android/ios 네이티브 빌드는 스캐폴딩 미완성으로 생략)' -WorkingDir $mobileDir -Action {
        npm run typecheck
    }
}

# --------------------------------------------------------------- summary
Write-Host ""
Write-Host '================ 결과 요약 ================' -ForegroundColor Yellow
$results | ForEach-Object {
    $mark = if ($_.Ok) { '[OK]  ' } else { '[FAIL]' }
    $color = if ($_.Ok) { 'Green' } else { 'Red' }
    Write-Host "$mark $($_.Step)" -ForegroundColor $color
}

$failed = $results | Where-Object { -not $_.Ok }
if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "$($failed.Count)개 단계 실패." -ForegroundColor Red
    exit 1
}
else {
    Write-Host ""
    Write-Host '모든 검증 통과.' -ForegroundColor Green
    exit 0
}
