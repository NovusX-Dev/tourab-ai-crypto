$ErrorActionPreference = "Stop"

$root = "D:\Tourab Crypto AI"
Set-Location $root

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$serverOut = Join-Path $root "logs\btc-policy-auto-1h-server-$timestamp.out.log"
$serverErr = Join-Path $root "logs\btc-policy-auto-1h-server-$timestamp.err.log"
$runOut = Join-Path $root "logs\btc-policy-auto-1h-progress-$timestamp.out.log"
$runErr = Join-Path $root "logs\btc-policy-auto-1h-progress-$timestamp.err.log"

$env:TOURAB_WORKER_SYMBOLS = "BTC-USDT"
$env:TOURAB_WORKER_SYMBOL_OVERRIDES_JSON = '{"BTC-USDT":{"side":"auto"}}'
$env:TOURAB_WORKER_INTERVAL_MS = "5000"
$env:TOURAB_WORKER_MAX_NOTIONAL_USD = "5"
$env:TOURAB_WORKER_STOP_DISTANCE_BPS = "40"
$env:TOURAB_WORKER_DEFAULT_SIDE = "auto"
$env:TOURAB_WORKER_SIGNAL_LOOKBACK_SEC = "180"
$env:TOURAB_WORKER_SIGNAL_SHORT_LOOKBACK_SEC = "45"
$env:TOURAB_WORKER_SIGNAL_MIN_MOVE_BPS = "12"
$env:TOURAB_WORKER_SIGNAL_MIN_ABSOLUTE_MOVE_BPS = "6"
$env:TOURAB_WORKER_SIGNAL_TREND_VOLATILITY_THRESHOLD_MULTIPLIER = "3"
$env:TOURAB_WORKER_SIGNAL_MIN_VOLATILITY_BPS = "2"
$env:TOURAB_WORKER_SIGNAL_ROUND_TRIP_FEE_BPS = "16"
$env:TOURAB_WORKER_QUIET_REGIME_TREND_EFFICIENCY_MIN = "4"
$env:TOURAB_WORKER_QUIET_REGIME_MOVE_THRESHOLD_MULTIPLIER = "0.75"
$env:TOURAB_WORKER_EXPECTED_MOVE_HURDLE_ENABLED = "1"
$env:TOURAB_WORKER_EXPECTED_MOVE_TP_R_MULTIPLE = "1.0"
$env:TOURAB_WORKER_EXPECTED_MOVE_FEE_COVERAGE_MULTIPLIER = "1.5"
$env:TOURAB_WORKER_EXPECTED_MOVE_MIN_NET_EDGE_BPS = "2"
$env:TOURAB_WORKER_MARKET_INTELLIGENCE_MIN_CONFIDENCE_SCORE = "18"
$env:TOURAB_WORKER_MARKET_INTELLIGENCE_MAX_SPREAD_BPS = "2.5"
$env:TOURAB_WORKER_REQUIRE_MARKET_INTELLIGENCE_ALIGNMENT = "1"
$env:TOURAB_WORKER_BLOCK_CHOP_REGIMES = "1"
$env:TOURAB_WORKER_MAX_MOVE_BUDGET_USAGE_PCT = "100"
$env:TOURAB_WORKER_TRADE_SIDE_GATE_ENABLED = "1"
$env:TOURAB_WORKER_TRADE_SIDE_LOOKBACK_TRADES = "30"
$env:TOURAB_WORKER_TRADE_SIDE_MIN_TRADES = "5"
$env:TOURAB_WORKER_TRADE_SIDE_MIN_EXPECTANCY_USD = "0"
$env:TOURAB_WORKER_TRADE_SIDE_MAX_TIME_STOP_RATE_PCT = "95"
$env:TOURAB_ENTRY_STALE_TIMEOUT_SEC = "90"
$env:TOURAB_WORKER_MAX_PENDING_ENTRIES_PER_SYMBOL = "4"
$env:TOURAB_POLICY_AUTO_MAX_OPEN_TRADES_PER_SYMBOL = "2"
$env:TOURAB_POLICY_AUTO_LOSS_STREAK_COUNT = "8"
$env:TOURAB_POLICY_AUTO_COOLDOWN_MINUTES = "15"
Remove-Item Env:TOURAB_AUTO_EXIT_MAX_HOLD_SEC -ErrorAction SilentlyContinue
Remove-Item Env:TOURAB_AUTO_EXIT_TP_R_MULTIPLE -ErrorAction SilentlyContinue

$existing = Get-NetTCPConnection -LocalPort 7071 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $procIds = $existing | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $procIds) {
    try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch {}
  }
  Start-Sleep -Seconds 2
}

$server = Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run", "mission-control:server" `
  -WorkingDirectory $root `
  -RedirectStandardOutput $serverOut `
  -RedirectStandardError $serverErr `
  -PassThru

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $null = Invoke-RestMethod -Uri "http://localhost:7071/entry-autonomy/config" -Method Get -TimeoutSec 5
    $ready = $true
    break
  } catch {}
}

if (-not $ready) {
  throw "Mission Control server did not become ready on http://localhost:7071"
}

$headers = @{
  "x-tourab-role" = "admin"
  "x-user-id" = "codex"
}

Invoke-RestMethod -Uri "http://localhost:7071/entry-autonomy/config" -Method Post -Headers $headers -ContentType "application/json" -Body '{"approvalMode":"manual"}' | Out-Null
Invoke-RestMethod -Uri "http://localhost:7071/auto-exit/config" -Method Post -Headers $headers -ContentType "application/json" -Body '{"enabled":true,"maxHoldSec":300,"takeProfitRMultiple":1.0,"exitOffsetBps":1}' | Out-Null
try { Invoke-RestMethod -Uri "http://localhost:7071/pause" -Method Post -Headers $headers | Out-Null } catch {}
try {
  Invoke-RestMethod -Uri "http://localhost:7071/cancel-all" -Method Post -Headers $headers -ContentType "application/json" -Body '{"approvalToken":"dev-approval-token"}' | Out-Null
} catch {}
Invoke-RestMethod -Uri "http://localhost:7071/maintenance/clear-streams" -Method Post -Headers $headers | Out-Null
Invoke-RestMethod -Uri "http://localhost:7071/entry-autonomy/config" -Method Post -Headers $headers -ContentType "application/json" -Body '{"approvalMode":"policy_auto"}' | Out-Null
try { Invoke-RestMethod -Uri "http://localhost:7071/resume" -Method Post -Headers $headers | Out-Null } catch {}

$run = Start-Process -FilePath "npm.cmd" `
  -ArgumentList "exec", "--", "tsx", "scripts/policy-auto-progress-run.ts", "--label", "btc-policy-auto-1h-signal-gated", "--base-url", "http://localhost:7071", "--duration-sec", "3600", "--drain-sec", "300", "--poll-ms", "5000", "--progress-sec", "60" `
  -WorkingDirectory $root `
  -RedirectStandardOutput $runOut `
  -RedirectStandardError $runErr `
  -PassThru

$finishAt = (Get-Date).AddHours(1)

[PSCustomObject]@{
  serverPid = $server.Id
  runPid = $run.Id
  serverOut = $serverOut
  serverErr = $serverErr
  runOut = $runOut
  runErr = $runErr
  finishAtLocal = $finishAt.ToString("yyyy-MM-dd HH:mm:ss zzz")
} | ConvertTo-Json -Depth 3
