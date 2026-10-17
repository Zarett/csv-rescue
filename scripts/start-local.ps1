$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$taskNode = Get-Command node -ErrorAction SilentlyContinue
$taskRuntime = if ($taskNode) { $taskNode.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskRuntime)) { throw 'Install Node.js 22.12 or newer, then reopen PowerShell and run npm ci.' }
if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) { throw 'Dependencies are missing. Run npm ci first.' }
& $taskRuntime 'node_modules/vite/bin/vite.js' '--host' '127.0.0.1'
