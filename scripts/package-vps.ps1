$ErrorActionPreference = 'Stop'
# The same checked packager runs on Windows and on GitHub's Linux runners.
& python (Join-Path $PSScriptRoot 'package-vps.py')
if ($LASTEXITCODE -ne 0) { throw 'Проверка или сборка публичных архивов не прошла.' }
