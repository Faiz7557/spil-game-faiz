# Resumable training runner.
#
#   powershell -ExecutionPolicy Bypass -File research\rl\run_all.ps1
#
# Skips any run whose run.json already records the target budget, so if the
# machine sleeps or the shell dies you re-run this exact command and it picks up
# where it stopped instead of redoing finished work.
#
# RUN IT FROM A PLAIN POWERSHELL WINDOW, not from an editor's or agent's
# integrated terminal. A 10-hour job launched as a child of a managed service
# dies when that service restarts for an update - which is what ended the run of
# 09-09 at 02:14, 27 seconds after the last checkpoint.
#
# Each run's console output goes to <out>\train.log so a crash leaves evidence
# instead of vanishing with the window.

param(
    [int]    $Timesteps = 10000000,
    [int]    $EvalFreq  = 100000,
    [string[]] $Algos    = @('ppo', 'a2c', 'dqn'),
    [int[]]  $Seeds     = @(0, 1, 2),
    [switch] $WhatIfOnly
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

# TensorFlow gets pulled in by torch.utils.tensorboard and prints an oneDNN
# banner to stderr. It is informational, but see the note above the python call:
# in PowerShell 5.1 any stderr line from a native exe becomes an ErrorRecord.
$env:TF_ENABLE_ONEDNN_OPTS = '0'
$env:TF_CPP_MIN_LOG_LEVEL = '3'

Write-Host ""
Write-Host "repo      : $repo"
Write-Host "anggaran  : $('{0:N0}' -f $Timesteps) langkah, eval tiap $('{0:N0}' -f $EvalFreq)"
Write-Host ""

$todo = @()
foreach ($a in $Algos) {
    foreach ($s in $Seeds) {
        $out  = Join-Path $repo "research\results\rl\${a}_seed${s}"
        $json = Join-Path $out 'run.json'
        $done = $false
        if (Test-Path $json) {
            try {
                $d = Get-Content $json -Raw | ConvertFrom-Json
                if ($d.timesteps -eq $Timesteps) { $done = $true }
            } catch { $done = $false }
        }
        if ($done) {
            Write-Host ("  lewati  {0}_seed{1}  (sudah {2:N0} langkah)" -f $a, $s, $Timesteps)
        } else {
            $todo += [pscustomobject]@{ Algo = $a; Seed = $s; Out = $out }
        }
    }
}

if ($todo.Count -eq 0) { Write-Host "`nSemua run sudah selesai."; exit 0 }

Write-Host ""
Write-Host ("akan dijalankan {0} run:" -f $todo.Count)
$todo | ForEach-Object { Write-Host ("  {0}_seed{1}" -f $_.Algo, $_.Seed) }
if ($WhatIfOnly) { Write-Host "`n(-WhatIfOnly: tidak ada yang dijalankan)"; exit 0 }

$started = Get-Date
$n = 0
foreach ($job in $todo) {
    $n++
    $tag = "{0}_seed{1}" -f $job.Algo, $job.Seed
    New-Item -ItemType Directory -Force -Path $job.Out | Out-Null
    $log = Join-Path $job.Out 'train.log'

    Write-Host ""
    Write-Host ("[{0}/{1}] {2}  mulai {3}" -f $n, $todo.Count, $tag, (Get-Date -Format 'HH:mm:ss'))

    $t0 = Get-Date
    # PowerShell 5.1 wraps every stderr line from a native executable in an
    # ErrorRecord, and under 'Stop' that kills the whole script the moment any
    # library prints an informational banner. Training writes plenty of those, so
    # the preference is relaxed across the call and the real outcome is read from
    # $LASTEXITCODE, which reports the process's actual exit code either way.
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    python -m research.rl.train --algo $job.Algo --timesteps $Timesteps `
        --seed $job.Seed --eval-freq $EvalFreq 2>&1 | Tee-Object -FilePath $log
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prevPref
    $mins = ((Get-Date) - $t0).TotalMinutes

    if ($code -ne 0) {
        Write-Host ("  GAGAL {0} (exit {1}) setelah {2:N1} mnt - lihat {3}" -f $tag, $code, $mins, $log)
        Write-Host "  jalankan ulang skrip ini untuk melanjutkan dari sini."
        exit $code
    }
    Write-Host ("  selesai {0} dalam {1:N1} mnt" -f $tag, $mins)
}

Write-Host ""
Write-Host ("SEMUA SELESAI dalam {0:N1} jam" -f ((Get-Date) - $started).TotalHours)
Write-Host "berikutnya:  python -m research.rl.finalize --dry-run"
