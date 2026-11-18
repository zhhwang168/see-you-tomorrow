param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Find-Tool($Name, $Paths) {
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command -and $command.Source -notlike '*\WindowsApps\python.exe') { return $command.Source }
    foreach ($candidate in $Paths) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
}

function Find-Python312 {
    $locations = @(
        'HKCU:\Software\Python\PythonCore\3.12\InstallPath',
        'HKLM:\Software\Python\PythonCore\3.12\InstallPath',
        'HKLM:\Software\WOW6432Node\Python\PythonCore\3.12\InstallPath'
    )
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:ProgramFiles\Python312\python.exe"
    )
    foreach ($location in $locations) {
        if (!(Test-Path -LiteralPath $location)) { continue }
        $key = Get-Item -LiteralPath $location
        $registered = $key.GetValue('ExecutablePath')
        $folder = $key.GetValue('')
        if ($registered) { $candidates += $registered }
        if ($folder) { $candidates += (Join-Path $folder 'python.exe') }
    }
    $launcher = Find-Tool 'py.exe' @("$env:WINDIR\py.exe","$env:LOCALAPPDATA\Programs\Python\Launcher\py.exe")
    if ($launcher) {
        $resolved = & $launcher -3.12 -c 'import sys; print(sys.executable)' 2>$null
        if ($LASTEXITCODE -eq 0 -and $resolved) { $candidates += $resolved }
    }
    $candidates += @(Get-Command python.exe -All -CommandType Application -ErrorAction SilentlyContinue |
        Where-Object Source -NotLike '*\WindowsApps\python.exe' | Select-Object -ExpandProperty Source)
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $version = & $candidate --version 2>$null
            if ($LASTEXITCODE -eq 0 -and $version -match '^Python 3\.12\.') { return $candidate }
        }
    }
}

function Run-Tool($Tool, [string[]]$Arguments) {
    & $Tool @Arguments
    if ($LASTEXITCODE) { throw "$Tool failed with exit code $LASTEXITCODE." }
}

function Install-Tool($Id) {
    Write-Host "Installing $Id with Windows Package Manager..."
    Run-Tool 'winget.exe' @('install','--id',$Id,'--exact','--source','winget')
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
}

function Ollama-Ready {
    try {
        Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null
        return $true
    } catch { return $false }
}

try {
    $nodePaths = @("$env:ProgramFiles\nodejs\node.exe")
    $ollamaPaths = @("$env:LOCALAPPDATA\Programs\Ollama\ollama.exe")
    $venv = Join-Path $PSScriptRoot '.kokoro\Scripts\python.exe'
    $node = Find-Tool 'node.exe' $nodePaths
    $ollama = Find-Tool 'ollama.exe' $ollamaPaths

    if ($CheckOnly) {
        Write-Host "Node: $node"
        Write-Host "Ollama: $ollama"
        $python = Find-Python312
        Write-Host "Python 3.12: $python"
        Write-Host "App Python environment present: $(Test-Path -LiteralPath $venv)"
        if (!$node -or !$ollama -or (!$python -and !(Test-Path -LiteralPath $venv))) { exit 1 }
        exit 0
    }

    if (!$node -or [int]((& $node --version).TrimStart('v').Split('.')[0]) -lt 22) {
        Install-Tool 'OpenJS.NodeJS.LTS'
        $node = Find-Tool 'node.exe' $nodePaths
    }
    if (!$ollama) {
        Install-Tool 'Ollama.Ollama'
        $ollama = Find-Tool 'ollama.exe' $ollamaPaths
    }
    if (!$node -or !$ollama) { throw 'Node.js or Ollama could not be found after installation.' }

    if (!(Test-Path -LiteralPath $venv)) {
        $python = Find-Python312
        if (!$python) {
            Install-Tool 'Python.Python.3.12'
            for ($attempt=0; $attempt -lt 5 -and !$python; $attempt++) {
                $python = Find-Python312
                if (!$python) { Start-Sleep -Milliseconds 750 }
            }
        }
        if (!$python) { throw 'Python 3.12 is not registered. Install the 64-bit Python 3.12 from python.org and run setup again.' }
        Write-Host "Using Python at $python"
        Run-Tool $python @('-m','venv','.kokoro')
    }

    $torchFiles = Get-ChildItem -Path (Join-Path $PSScriptRoot '.kokoro\Lib\site-packages\torch-*.dist-info') -ErrorAction SilentlyContinue
    if (!$torchFiles) {
        $index = if (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue) {
            'https://download.pytorch.org/whl/cu126'
        } else { 'https://download.pytorch.org/whl/cpu' }
        Write-Host 'Installing the local voice runtime. This can take several minutes.'
        Run-Tool $venv @('-m','pip','install','torch','--index-url',$index)
    }
    Write-Host 'Checking Kokoro and its English language model...'
    Run-Tool $venv @('-m','pip','install','kokoro==0.9.4','misaki[en]==0.9.4','faster-whisper==1.2.1','av==16.0.1')
    Run-Tool $venv @('-m','pip','install','https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl')

    if (!(Ollama-Ready)) {
        Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
        for ($attempt=0; $attempt -lt 20; $attempt++) {
            Start-Sleep -Milliseconds 500
            if (Ollama-Ready) { break }
        }
    }
    if (!(Ollama-Ready)) { throw 'Ollama did not start. Open Ollama from the Start menu and run setup again.' }
    $models = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
    if ($models.models.name -notcontains 'qwen3:4b-instruct') {
        Write-Host 'Downloading Qwen3 4B Instruct...'
        Run-Tool $ollama @('pull','qwen3:4b-instruct')
    }
    Write-Host 'Setup complete. Opening See You Tomorrow...'
    Run-Tool $node @('launcher.mjs')
} catch {
    Write-Host ("Setup stopped: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'You can run setup again. See README.md for manual setup.'
    exit 1
}



