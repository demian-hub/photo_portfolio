param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Start', 'Stop')]
    [string]$Action,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$localFolder = Join-Path $siteRoot '.local'
$stateFile = Join-Path $localFolder 'server-process.json'
$siteUrl = 'http://127.0.0.1:4173'
Set-Location -LiteralPath $siteRoot

function Get-OwnedServer {
    if (-not (Test-Path -LiteralPath $stateFile)) { return $null }
    $record = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if (-not [string]::Equals($record.ProjectRoot, $siteRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The server record belongs to a different project. No process was stopped.'
    }
    $serverProcess = Get-Process -Id ([int]$record.ProcessId) -ErrorAction SilentlyContinue
    if ($null -eq $serverProcess) {
        Remove-Item -LiteralPath $stateFile
        return $null
    }
    $started = $serverProcess.StartTime.ToUniversalTime().Ticks.ToString()
    if ($started -ne [string]$record.StartTimeUtcTicks -or -not [string]::Equals($serverProcess.Path, $record.Executable, [StringComparison]::OrdinalIgnoreCase)) {
        # The original process ended and its PID may have been reused.
        Remove-Item -LiteralPath $stateFile
        Write-Host 'The previous server has ended. The unrelated process was left running.'
        return $null
    }
    return $serverProcess
}

function Test-SiteResponse {
    try {
        $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch { return $false }
}

try {
    New-Item -ItemType Directory -Path $localFolder -Force | Out-Null
    # Serialize start/stop operations, including two rapid double-clicks.
    $lockFile = Join-Path $localFolder 'server-manager.lock'
    try {
        $managerLock = [System.IO.File]::Open($lockFile, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    } catch {
        throw 'A start/stop operation is already running. Wait for it to finish.'
    }
    $ownedServer = Get-OwnedServer
    if ($Action -eq 'Stop') {
        if ($null -eq $ownedServer) {
            Write-Host 'This project server is already stopped. No other processes were changed.'
        } else {
            Stop-Process -InputObject $ownedServer -ErrorAction Stop
            $ownedServer.WaitForExit(10000) | Out-Null
            Remove-Item -LiteralPath $stateFile
            Write-Host 'Homepage stopped.'
        }
    } elseif ($null -ne $ownedServer) {
        if (-not (Test-SiteResponse)) { throw 'The managed server is running but not responding. Stop it, check .local logs, and start again.' }
        Write-Host "Homepage is already running: $siteUrl"
        if (-not $NoBrowser) { Start-Process -FilePath $siteUrl -WindowStyle Hidden }
    } else {
        $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
        $nextCli = Join-Path $siteRoot 'node_modules\next\dist\bin\next'
        if (-not (Test-Path -LiteralPath $nextCli)) { throw 'Dependencies are missing. Run npm.cmd install first.' }
        # Refuse to take over a port owned by another application or manual server.
        $portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 4173)
        try { $portProbe.Start() } catch { throw 'Port 4173 is in use. Close the existing manual server/application and try again. No other process was stopped.' }
        finally { $portProbe.Stop() }

        if (-not (Test-Path -LiteralPath (Join-Path $siteRoot '.next\BUILD_ID'))) {
            Write-Host 'Preparing the first production build...'
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) { throw 'Build failed. The homepage was not started.' }
        }
        $stdoutLog = Join-Path $localFolder 'server-output.log'
        $stderrLog = Join-Path $localFolder 'server-error.log'
        $serverProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + $nextCli + '"'), 'start', '--hostname', '127.0.0.1', '--port', '4173') -WorkingDirectory $siteRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
        $record = [ordered]@{
            ProjectRoot = $siteRoot
            ProcessId = $serverProcess.Id
            StartTimeUtcTicks = $serverProcess.StartTime.ToUniversalTime().Ticks.ToString()
            Executable = $nodeExecutable
            Url = $siteUrl
        }
        $record | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
        $ready = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            $serverProcess.Refresh()
            if ($serverProcess.HasExited) { break }
            if (Test-SiteResponse) { $ready = $true; break }
            Start-Sleep -Milliseconds 300
        }
        if (-not $ready) {
            $failedServer = Get-OwnedServer
            if ($null -ne $failedServer) { Stop-Process -InputObject $failedServer -ErrorAction Stop }
            if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
            throw 'Server startup failed. See .local/server-error.log and .local/server-output.log.'
        }
        Write-Host "Homepage started: $siteUrl"
        Write-Host "Admin page: $siteUrl/admin"
        Write-Host 'The server keeps running after this window closes. Use the stop launcher to stop it.'
        if (-not $NoBrowser) { Start-Process -FilePath $siteUrl -WindowStyle Hidden }
    }
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($null -ne $managerLock) { $managerLock.Dispose() }
}
