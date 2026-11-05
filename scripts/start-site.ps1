$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $siteRoot
if (-not (Test-Path -LiteralPath (Join-Path $siteRoot '.next/BUILD_ID'))) {
    throw '프로덕션 빌드가 없습니다. npm.cmd run build를 먼저 실행하세요.'
}
& npm.cmd run start
exit $LASTEXITCODE
