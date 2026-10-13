$ErrorActionPreference='Stop'
$echoRoot=Split-Path -Parent $PSScriptRoot
$echoTools=Join-Path $echoRoot 'work\tools'
New-Item -ItemType Directory -Path $echoTools -Force | Out-Null
# Portable community Redis build, used only for localhost development.
$echoRelease=Invoke-RestMethod -Uri 'https://api.github.com/repos/redis-windows/redis-windows/releases/tags/8.2.10'
$echoAsset=$echoRelease.assets | Where-Object name -eq 'Redis-8.2.10-Windows-x64-cygwin.zip'
if(-not $echoAsset){throw 'Pinned Redis asset not found'}
$echoArchive=Join-Path $echoTools 'redis.zip'
Invoke-WebRequest -Uri $echoAsset.browser_download_url -OutFile $echoArchive
if($echoAsset.digest -and $echoAsset.digest.StartsWith('sha256:')){
  $echoActual=(Get-FileHash -LiteralPath $echoArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if($echoActual -ne $echoAsset.digest.Substring(7)){throw 'Redis archive checksum mismatch'}
}
Expand-Archive -LiteralPath $echoArchive -DestinationPath (Join-Path $echoTools 'redis') -Force
Write-Output 'Portable Redis is ready. Run npm run dev:local. No Windows service was installed.'
