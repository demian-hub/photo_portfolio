$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $siteRoot
try {
    Write-Host '데미안포토 촬영문의 이메일 알림 설정'
    Write-Host '발신·수신 계정: parkhanchul@gmail.com (자동 설정)'
    Write-Host 'Google 앱 이름: demianphoto_home'
    Write-Host ''
    Write-Host '아래에는 이메일 주소가 아닌, Google에서 발급한 16자리 앱 비밀번호만 입력하세요.'
    Write-Host '일반 Google 로그인 비밀번호는 입력하지 마세요.'
    Write-Host '붙여넣은 값은 화면에 표시되지 않습니다. 입력 후 Enter를 누르세요.'
    Write-Host '도움말: https://support.google.com/accounts/answer/185833'
    Write-Host '설정은 Git에서 제외된 .env.local에 저장됩니다.'
    $sender = 'parkhanchul@gmail.com'
    $securePassword = Read-Host '앱 비밀번호 16자리 (숨김 입력)' -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try { $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr).Replace(' ', '') }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
    if ($appPassword -notmatch '^[a-zA-Z0-9]{16}$') { throw 'Google에서 발급한 앱 비밀번호 16자리를 입력해주세요. 이메일 주소나 앱 이름은 입력하지 마세요.' }
    $envFile = Join-Path $siteRoot '.env.local'
    $lines = @()
    if (Test-Path -LiteralPath $envFile) { $lines = @(Get-Content -LiteralPath $envFile -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*SMTP_(HOST|PORT|USER|PASS)\s*=' }) }
    $lines += @('SMTP_HOST=smtp.gmail.com', 'SMTP_PORT=587', ('SMTP_USER=' + $sender), ('SMTP_PASS=' + $appPassword))
    [IO.File]::WriteAllText($envFile, (($lines -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
    $appPassword = $null
    $securePassword.Dispose()
    Write-Host '설정을 저장했습니다. 발송 인증 확인과 테스트 메일 발송을 진행합니다...'
    & node.exe scripts/check-mail.mjs --send-test
    if ($LASTEXITCODE -ne 0) { throw '발송 인증 또는 테스트 발송에 실패했습니다. parkhanchul@gmail.com에서 발급한 앱 비밀번호인지 확인한 뒤 다시 설정해주세요. 홈페이지는 재시작하지 않았습니다.' }
    # Restart only the server controlled by the project launcher.
    if (Test-Path -LiteralPath (Join-Path $siteRoot '.local/server-process.json')) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/manage-site.ps1 -Action Stop
        if ($LASTEXITCODE -ne 0) { throw '새 설정을 반영하려면 홈페이지를 종료하고 다시 시작해주세요.' }
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/manage-site.ps1 -Action Start -NoBrowser
        if ($LASTEXITCODE -ne 0) { throw '프로젝트 폴더의 홈페이지 시작 파일로 서버를 다시 실행해주세요.' }
    }
    Write-Host '대기 중인 문의 알림을 발송합니다...'
    & node.exe scripts/retry-mail.mjs
    if ($LASTEXITCODE -ne 0) { throw '일부 대기 알림을 발송하지 못했습니다. 관리자 화면에서 발송 상태를 확인해주세요.' }
    Write-Host '메일 알림 설정을 완료했습니다. 받은편지함과 스팸함에서 테스트 메일을 확인해주세요.'
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
