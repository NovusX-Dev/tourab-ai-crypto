# Operator Quick Checklist

Last updated: 2026-02-26

## Start of Session
1. Open Mission Control UI and confirm `LIVE_BACKEND` and `EXCHANGE_DEMO_OK`.
2. Role set to `Operator` or `Admin`, user id set to `operator-1`.
3. Demo Readiness card is green.
4. M5 Evidence card shows pass for today.

## Autonomy Settings
1. Entry autonomy is `policy_auto` only after a clean baseline window.
2. Auto-exit is enabled and uses the current config.
3. Allowed symbols: BTC-USDT, ETH-USDT, SOL-USDT only.

## During Run
1. Watch `Alerts` and `Incidents` for errors.
2. Auto-pause triggers on loss streak/drawdown/learning alerts; follow pause-and-research runbook.
3. Confirm trades are closing via TP/SL/time-stop (not forced stale closes).

## End of Session
1. Pause or Stop the bot.
2. Confirm no open orders remain.
3. Review session PnL and alerts.
4. Export learning incidents if any are open.
