$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dist = (Resolve-Path (Join-Path $root "dist")).Path
$release = Join-Path $root "release"
$archive = Join-Path $release "QueueScope-0.1.0-unpacked.zip"
$checksum = Join-Path $release "QueueScope-0.1.0-unpacked.sha256.txt"

if ($dist -eq $root -or -not $dist.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to package an unsafe distribution path."
}
New-Item -ItemType Directory -Force -Path $release | Out-Null
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $archive -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $checksum -Value "$hash  QueueScope-0.1.0-unpacked.zip" -Encoding utf8
Write-Output "Packaged $archive"
Write-Output "SHA256 $hash"
