# Python Research Pipeline

## Summary
Python handles research, data processing, and backtesting workflows. Reproducibility and data lineage are required so strategy claims can be audited before any live usage.

## References
- pandas docs: https://pandas.pydata.org/docs/
- backtesting.py docs: https://kernc.github.io/backtesting.py/
- vectorbt docs: https://vectorbt.dev/
- DuckDB docs: https://duckdb.org/docs/

## Examples
- Pipeline stages:
  1. Ingest market/account data snapshots.
  2. Normalize and store canonical datasets.
  3. Generate features/signals.
  4. Backtest with fixed assumptions.
  5. Emit proposal candidates for Node gatekeeper review.

## Gotchas / failure modes
- Data snooping and look-ahead bias invalidate results.
- Non-deterministic environments make backtests non-reproducible.
- Missing metadata (data source, version, timezone) ruins traceability.

## What we decided for Tourab Crypto AI
- Use Python for research only in early milestones.
- Persist research artifacts with dataset/timeframe metadata.
- Require reproducible scripts/notebooks before strategy promotion.