# Project Index

Generated: 2026-02-23 12:08:59 UTC

## Summary
- Root: `.`
- Directories indexed: 225
- Files indexed: 639
- Exclusions: .git, .idea, node_modules, dist, build, coverage, .venv, venv, __pycache__, .pytest_cache

## Tree
```text
- .
  - .githooks/
    - post-checkout
    - post-merge
    - pre-commit
  - .github/
    - workflows/
      - ci.yml
  - apps/
    - dashboard/
      - src/
        - learning/
          - m7-research-pipeline.ts
        - mission-control/
          - approval-store.ts
          - auth.ts
          - event-bus.ts
          - event-factory.ts
          - jsonl-alert-store.ts
          - jsonl-event-store.ts
          - policy.ts
          - rate-limit.ts
          - runtime-events.ts
          - runtime-lifecycle-manager.ts
          - sqlite-event-store.ts
          - sqlite-ops-store.ts
          - worker-manager.ts
        - cli.ts
        - cli-validation.ts
        - env-loader.ts
        - execution-service.ts
        - human-approval.ts
        - lifecycle-store.ts
        - mission-control-server.ts
        - okx-demo-auto-loop-cli.ts
        - okx-demo-cancel-cli.ts
        - okx-demo-diagnostic-cli.ts
        - okx-demo-execute-cli.ts
        - okx-demo-health-cli.ts
        - okx-demo-orders-cli.ts
        - okx-demo-reconcile-cli.ts
        - okx-proposal-helper-cli.ts
        - proposal-helper.ts
        - reconciliation.ts
      - package.json
    - mission-control/
      - coverage/
        - coverage-summary.json
      - dist/
        - assets/
          - index-BBlSDNAE.css
          - index-BwGly-rJ.js
        - index.html
      - node_modules/
        - .vite/
          - deps/
            - _metadata.json
            - chunk-JPOJ7BIY.js
            - chunk-JPOJ7BIY.js.map
            - chunk-KTVQT34V.js
            - chunk-KTVQT34V.js.map
            - package.json
            - react.js
            - react.js.map
            - react_jsx-dev-runtime.js
            - react_jsx-dev-runtime.js.map
            - react_jsx-runtime.js
            - react_jsx-runtime.js.map
            - react-dom.js
            - react-dom.js.map
            - react-dom_client.js
            - react-dom_client.js.map
          - vitest/
            - da39a3ee5e6b4b0d3255bfef95601890afd80709/
              - results.json
        - .vite-temp/
      - src/
        - api/
          - BotApiClient.ts
          - LiveBotApiClient.ts
          - MockBotApiClient.ts
        - components/
          - AlertsPanel.tsx
          - ApprovalsPanel.tsx
          - AuditTimeline.tsx
          - AutonomyPanel.tsx
          - BotStatusCard.tsx
          - ControlDeck.tsx
          - DemoReadinessCard.tsx
          - EventStream.tsx
          - IncidentsPanel.tsx
          - LogsPanel.tsx
          - Milestone5ReadinessCard.tsx
          - OpsMetricsPanel.tsx
          - OrdersPanel.tsx
          - PortfolioPanel.tsx
          - ReconciliationCard.tsx
          - RiskPanel.tsx
          - ThemeSwitcher.tsx
        - logic/
          - controlAvailability.ts
          - eventFilters.ts
        - mock/
          - mockData.ts
        - state/
          - useDashboardData.ts
        - test/
          - control-availability.spec.ts
          - event-filters.spec.ts
          - event-stream-virtualization.spec.ts
          - portfolio-orders-panel.spec.ts
          - role-gating.spec.ts
          - setup.ts
        - App.tsx
        - format.ts
        - main.tsx
        - styles.css
        - theme.ts
        - types.ts
      - index.html
      - package.json
      - README.md
      - tsconfig.json
      - vite.config.ts
      - vitest.config.ts
    - research/
  - docs/
    - okx/
      - okx-docs-v5-en.html
      - source-verification.md
    - runbooks/
      - approval-governance.md
      - control-plane-incident.md
      - exchange-reliability.md
      - freshness-guard.md
      - learning-evaluation-guard.md
      - reconciliation-drift-circuit.md
    - decisions.md
    - deep-research-report.md
    - incident-taxonomy-and-slo.md
    - learning-report.md
    - m5-soak-plan.md
    - m7-research-pipeline.md
    - milestone-3-completion-report.md
    - milestone-3-invariants.md
    - roadmap.md
    - tomorrow-work.md
    - ui-prompts.md
  - logs/
    - m5-evidence-2026-02-17T19-33-51-490Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-17T20-03-47-498Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T12-15-19-710Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T12-34-39-806Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T12-42-28-783Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T13-17-20-576Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T13-55-27-115Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T14-08-55-068Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T14-41-32-838Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T15-27-01-008Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T15-55-56-628Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T16-19-35-422Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T16-43-09-110Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T17-04-11-287Z/
    - m5-evidence-2026-02-18T17-04-45-900Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T17-11-22-380Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T18-26-30-live-smoke/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-18T18-34-15-second-soak/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T07-51-17-242Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T09-00-50-297Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T09-54-36-995Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T10-42-25-324Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T11-13-26-100Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T11-42-53-302Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T12-12-40-167Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T12-41-11-574Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T13-10-04-449Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T14-08-41-682Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T14-37-19-010Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-19T15-08-29-436Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-20T08-33-39-013Z/
    - m5-evidence-2026-02-20T08-52-48-891Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-21T19-39-48-175Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-22T08-22-47-015Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-22T09-14-32-766Z/
      - evidence.json
      - summary.md
    - m5-evidence-2026-02-23T08-28-23-766Z/
      - evidence.json
      - summary.md
    - m5-soak-2026-02-17T18-11-37-293Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T18-16-26-291Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T18-21-13-365Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T18-26-42-664Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T18-42-58-381Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T18-51-28-365Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T19-42-32-554Z/
    - m5-soak-2026-02-17T19-43-21-074Z/
    - m5-soak-2026-02-17T19-44-10-829Z/
    - m5-soak-2026-02-17T19-45-12-494Z/
    - m5-soak-2026-02-17T20-01-55-749Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-17T20-04-50-290Z/
    - m5-soak-2026-02-18T11-57-13-348Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T12-16-32-118Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T12-36-22-047Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T12-45-55-854Z/
    - m5-soak-2026-02-18T12-50-10-782Z/
    - m5-soak-2026-02-18T13-11-12-606Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T13-18-42-130Z/
    - m5-soak-2026-02-18T13-36-15-429Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T13-55-52-871Z/
    - m5-soak-2026-02-18T14-02-19-452Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T14-22-38-166Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T15-04-08-946Z/
    - m5-soak-2026-02-18T15-05-34-617Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T15-30-19-993Z/
    - m5-soak-2026-02-18T15-33-26-705Z/
    - m5-soak-2026-02-18T15-34-36-035Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T15-57-43-996Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T16-21-11-917Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T16-52-48-817Z/
    - m5-soak-2026-02-18T16-53-18-518Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T17-05-07-165Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T18-21-12-051Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-18T18-27-09-506Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T06-53-38-245Z/
    - m5-soak-2026-02-19T06-54-09-871Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T07-52-29-812Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T08-27-32-026Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T09-28-25-114Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T10-13-15-506Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T10-47-05-159Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T11-15-44-010Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T11-45-31-984Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T12-13-59-111Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T12-42-34-271Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T13-41-14-683Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T14-09-58-232Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-19T14-45-20-008Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-20T08-32-13-230Z/
    - m5-soak-2026-02-20T08-34-37-063Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-20T10-14-48-651Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-20T11-58-11-535Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-20T12-14-26-419Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-20T12-21-50-029Z/
    - m5-soak-2026-02-21T19-19-54-459Z/
    - m5-soak-2026-02-21T19-21-42-196Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-22T07-59-55-148Z/
    - m5-soak-2026-02-22T08-01-37-574Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-22T08-56-27-598Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-22T09-32-49-351Z/
      - report.json
      - summary.md
    - m5-soak-2026-02-23T08-06-09-053Z/
    - m5-soak-2026-02-23T08-10-20-412Z/
      - report.json
      - summary.md
    - m6-acceptance-2026-02-19T08-04-49-497Z/
      - report.json
      - summary.md
    - m6-acceptance-2026-02-19T15-24-28-150Z/
      - report.json
      - summary.md
    - m7-dataset-2026-02-20T09-53-18-101Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-20T10-36-07-759Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-20T11-45-39-087Z/
    - m7-dataset-2026-02-20T11-49-28-484Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-20T12-33-24-460Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-22T09-30-27-990Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-22T09-51-00-685Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-2026-02-23T12-07-58-432Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-curated-validation-2026-02-23T08-10-32-002-03-00/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-sol-trial-2026-02-23T11-50-05-635Z/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-dataset-validation-2026-02-23T08-07-31-532-03-00/
      - closed-trade-features.ndjson
      - dataset-manifest.json
      - summary.md
    - m7-decision-bundle-2026-02-21T19-52-16-512Z/
      - bundle.json
      - summary.md
    - m7-gate-2026-02-20T09-55-35-588Z/
      - summary.md
    - m7-gate-2026-02-20T09-56-04-342Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-20T09-56-16-224Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-20T10-36-09-084Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-20T11-49-38-595Z/
      - summary.md
    - m7-gate-2026-02-20T11-50-50-160Z/
    - m7-gate-2026-02-20T11-51-19-233Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-20T12-33-37-386Z/
      - summary.md
    - m7-gate-2026-02-20T12-34-36-260Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-22T09-30-35-396Z/
      - summary.md
    - m7-gate-2026-02-22T09-51-17-082Z/
      - gate-result.json
      - summary.md
    - m7-gate-2026-02-23T09-55-30-036Z/
      - gate-result.json
      - summary.md
    - m7-gate-curated-validation-2026-02-23T08-10-32-002-03-00/
      - gate-result.json
      - summary.md
    - m7-gate-sol-reentry-moderate-2026-02-23T11-54-23-106Z/
      - gate-result.json
      - summary.md
    - m7-gate-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/
      - gate-result.json
      - summary.md
    - m7-gate-sol-reentry-strict-2026-02-23T11-54-23-106Z/
      - gate-result.json
      - summary.md
    - m7-gate-sol-trial-2026-02-23T11-50-05-635Z/
      - gate-result.json
      - summary.md
    - m7-gate-validation-2026-02-23T08-07-31-532-03-00/
      - gate-result.json
      - summary.md
    - m7-governance-2026-02-23T05-48-24-372-03-00/
      - events.json
      - incidents-export.json
      - strategy-promotion.json
      - summary.json
    - m7-governance-rehearsal-2026-02-21T19-50-57-215Z/
    - m7-governance-rehearsal-2026-02-21T19-51-20-648Z/
      - report.json
      - summary.md
    - m7-governance-rehearsal-rerun-2026-02-21T19-54-45-006Z/
      - run.js
    - m7-governance-rehearsal-rerun-2026-02-21T19-55-02-943Z/
      - report.json
      - run.cjs
      - summary.md
    - m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00/
      - incidents-export.json
      - learning-incidents-export-30d.json
      - summary.json
    - m7-retrain-2026-02-20T09-53-35-031Z/
      - approval-record.json
      - approval-record.json.template.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
      - validation-report.json.template.json
    - m7-retrain-2026-02-20T10-36-08-401Z/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-2026-02-20T11-45-39-087Z/
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
    - m7-retrain-2026-02-20T11-49-33-692Z/
      - approval-record.json
      - approval-record.json.template.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
      - validation-report.json.template.json
    - m7-retrain-2026-02-20T12-33-24-509Z/
      - approval-record.json.template.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json.template.json
    - m7-retrain-2026-02-20T12-33-37-385Z/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-2026-02-22T09-30-31-385Z/
      - approval-record.json.template.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json.template.json
    - m7-retrain-2026-02-22T09-51-04-418Z/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-retrain-validation-2026-02-23T08-07-31-532-03-00/
      - approval-record.json
      - metrics.json
      - model-card.md
      - promotion-packet.json
      - summary.md
      - training-run.json
      - validation-report.json
    - m7-rollback-drill-2026-02-21T20-04-56-516Z/
      - report.json
      - summary.md
    - m7-sol-reentry-2026-02-23T12-00-03-515Z/
      - dataset-curated/
        - closed-trade-features.ndjson
        - dataset-manifest.json
      - moderate/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - reintroduce/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - retrain/
        - approval-record.json
        - metrics.json
        - promotion-packet.json
        - training-run.json
        - validation-report.json
      - strict/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - summary.md
    - m7-sol-reentry-2026-02-23T12-02-21-596Z/
      - dataset-curated/
        - closed-trade-features.ndjson
        - dataset-manifest.json
      - moderate/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - reintroduce/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - retrain/
        - approval-record.json
        - metrics.json
        - promotion-packet.json
        - training-run.json
        - validation-report.json
      - strict/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - summary.md
    - m7-sol-reentry-2026-02-23T12-02-28-655Z/
      - dataset-curated/
        - closed-trade-features.ndjson
        - dataset-manifest.json
      - moderate/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - reintroduce/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - retrain/
        - approval-record.json
        - metrics.json
        - promotion-packet.json
        - training-run.json
        - validation-report.json
      - strict/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - summary.md
    - m7-sol-reentry-2026-02-23T12-08-03-731Z/
      - dataset-curated/
        - closed-trade-features.ndjson
        - dataset-manifest.json
      - moderate/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - reintroduce/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - retrain/
        - approval-record.json
        - metrics.json
        - promotion-packet.json
        - training-run.json
        - validation-report.json
      - strict/
        - gate-result.json
        - summary.md
        - walk-forward-report.json
      - summary.md
    - m7-walk-forward-2026-02-23T09-55-24-508Z/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-curated-validation-2026-02-23T08-10-32-002-03-00/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-sol-reentry-moderate-2026-02-23T11-54-23-106Z/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-sol-reentry-strict-2026-02-23T11-54-23-106Z/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-sol-trial-2026-02-23T11-50-05-635Z/
      - summary.md
      - walk-forward-report.json
    - m7-walk-forward-validation-2026-02-23T08-07-31-532-03-00/
      - summary.md
      - walk-forward-report.json
    - session/
      - mission-control-server.err.log
      - mission-control-server.out.log
    - context.e2e.json
    - local-terminal.err.log
    - local-terminal.out.log
    - local-terminal.pid
    - m5-evidence-server.err.log
    - m5-evidence-server.out.log
    - m5-evidence-server.pid
    - m5-soak-run.err.log
    - m5-soak-run.out.log
    - m5-soak-server.err.log
    - m5-soak-server.out.log
    - m5-soak-server.pid
    - m7-monitor-server.err.log
    - m7-monitor-server.out.log
    - m7-sol-reentry-summary-2026-02-23T11-54-23-106Z.md
    - mc-server.err.log
    - mc-server.out.log
    - mission-alerts.jsonl
    - mission-control-server.err.log
    - mission-control-server.out.log
    - mission-events.jsonl
    - mission-events.sqlite
    - mission-events.sqlite-shm
    - mission-events.sqlite-wal
    - mission-ops.sqlite
    - mission-ops.sqlite-shm
    - mission-ops.sqlite-wal
    - okx-snapshot.json
    - order-intents.jsonl
    - proposal.e2e.json
    - proposal-audit.jsonl
    - reconcile-report.json
    - tmp-test.js
  - packages/
    - okx-demo-adapter/
      - src/
        - index.ts
      - package.json
    - risk-gatekeeper/
      - src/
        - index.ts
      - package.json
    - shared/
      - src/
        - index.ts
        - mission-control.ts
        - schemas.ts
        - types.ts
      - package.json
  - scripts/
    - install-index-hooks.ps1
    - m5-evidence-rollup.ts
    - m5-soak.ts
    - m6-acceptance-walkthrough.ts
    - m7-dataset-curate.ts
    - m7-dataset-snapshot.ts
    - m7-gate-promotion.ts
    - m7-retrain-offline.ts
    - m7-rollback-drill.ts
    - m7-sol-reentry-stages.ts
    - m7-walk-forward.ts
    - update-project-index.ps1
  - skills/
    - okx/
      - okx-auth-signing.md
      - okx-demo-vs-live.md
      - okx-overview.md
      - okx-rate-limits-errors.md
    - architecture.md
    - backend-ws-contracts.md
    - logging-audit-replay.md
    - mission-control-ui-patterns.md
    - node-dashboard-patterns.md
    - phase-delivery-playbook.md
    - python-research-pipeline.md
    - README.md
    - release-hardening.md
    - risk-gatekeeper.md
    - security-api-keys.md
    - skill-factory-governor.md
    - trading-oracle.md
    - trading-safety-guardrails.md
  - tests/
    - fixtures/
      - context.auto.json
      - context.valid.json
      - proposal.auto.json
      - proposal.demo-check.json
      - proposal.invalid.json
      - proposal.valid.json
    - approval-store.spec.ts
    - cli-validation.spec.ts
    - execution-service.spec.ts
    - human-approval.spec.ts
    - m6-attribution-contract.spec.ts
    - m7-learning-contract.spec.ts
    - m7-promotion-gate.spec.ts
    - m7-research-pipeline.spec.ts
    - m7-walk-forward.spec.ts
    - milestone3-integration.spec.ts
    - mission-control-contract.spec.ts
    - mission-control-event-normalization.spec.ts
    - mission-control-policy.spec.ts
    - mission-control-runtime.spec.ts
    - okx-demo-adapter.spec.ts
    - proposal-helper.spec.ts
    - reconciliation.spec.ts
    - risk-gatekeeper.property.spec.ts
    - risk-gatekeeper.spec.ts
    - TEST_PLAN.md
    - worker-manager.spec.ts
    - worker-symbol-quality-gate.spec.ts
  - .env
  - .env.example
  - .gitattributes
  - .gitignore
  - .prettierignore
  - .prettierrc.json
  - AGENTS.md
  - eslint.config.mjs
  - package.json
  - package-lock.json
  - README.md
  - tsconfig.json
  - tsc-trace.log
  - vitest.config.ts
```

## File Catalog
| Path | Size (bytes) | Last Modified (UTC) | SHA256 |
|---|---:|---|---|
| `.env` | 1219 | 2026-02-18 13:10:40 | `609bd71bae3e602ae4f49e5ec31793fd7739c588f914742647fe97a30e6e7484` |
| `.env.example` | 1259 | 2026-02-18 13:10:36 | `bd1b12931c3508ae9d8a4f4db5a9e2afd6b9ba7c82714ad4bfaad58a53623658` |
| `.gitattributes` | 24 | 2026-02-16 07:43:43 | `6fda4653ef71808abc2eb5e88b7cf1ec9912e800d3bad13d3b4f46abc8d6f7ea` |
| `.githooks/post-checkout` | 243 | 2026-02-16 07:41:58 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/post-merge` | 243 | 2026-02-16 07:41:54 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/pre-commit` | 274 | 2026-02-16 07:41:51 | `9a68a1a9e1b68e7ea8f44c5e4368bae6eafc89ad6e928a2d68cc2113c6812339` |
| `.github/workflows/ci.yml` | 781 | 2026-02-20 08:12:39 | `f03742e6850a241f6e84c6e3acdbdfddfab4f56f13894deb00b253bfb97770be` |
| `.gitignore` | 385 | 2026-02-15 08:24:52 | `b0e963bbe4731fbadd53f9fb4519b2dadc110279778dcfaecc695d528a052122` |
| `.prettierignore` | 70 | 2026-02-20 08:07:47 | `5c33c4b244f0aa1ab177e9578ddc43a7984c22d396a7f8c5bf4a154c41b086ac` |
| `.prettierrc.json` | 91 | 2026-02-20 08:07:44 | `739aa155790541c532c7d304adbbbab422ab3026ab6c9ac9f59d9cd4958293b8` |
| `AGENTS.md` | 4669 | 2026-02-20 07:56:32 | `d7c74cd5943aa084333ad209ba1d44efff6133b513c754f939ee55519a99d69b` |
| `apps/dashboard/package.json` | 388 | 2026-02-16 17:34:55 | `279db4746ec4b34e0b80a6a470f706141dca3b820764d6ce38d18e98e1ee24c1` |
| `apps/dashboard/src/cli.ts` | 2739 | 2026-02-16 08:22:42 | `65b65600773088fa34d56c25abb0ee54c99647f1afdc11f148b009391a385b15` |
| `apps/dashboard/src/cli-validation.ts` | 1532 | 2026-02-16 08:22:27 | `1d7bd77d440d0ac9d265c556515fe93879d76ac8b4e473074911b4e0da2dac27` |
| `apps/dashboard/src/env-loader.ts` | 1576 | 2026-02-18 13:10:32 | `06a98ddf889b8648e26cddc5098e58a88f457ab6280d205aeec3fecc01756d8d` |
| `apps/dashboard/src/execution-service.ts` | 10605 | 2026-02-17 08:11:53 | `e722a434d3470c41b11581df8658183f1e7c4fdcc8528653651179d919405275` |
| `apps/dashboard/src/human-approval.ts` | 2802 | 2026-02-17 07:18:23 | `33af47ee9cf61e08a7652541b8a55ae28ce485c4ec68182d797ef9ef8d1da6d5` |
| `apps/dashboard/src/learning/m7-research-pipeline.ts` | 13943 | 2026-02-23 09:51:34 | `b5484c9d335bc7a4d313ae8f93ef839412b875db6f9665e1f0e89a2b9efd89b4` |
| `apps/dashboard/src/lifecycle-store.ts` | 1135 | 2026-02-16 09:06:05 | `d836bad7d35bb5ba19d65b4a9625bb40838261f599332bae7bcfc80d30dda38d` |
| `apps/dashboard/src/mission-control/approval-store.ts` | 4203 | 2026-02-17 14:26:17 | `75f20d521508f8339f975de05709817666af7148bcf228fde08c4195c42e5bee` |
| `apps/dashboard/src/mission-control/auth.ts` | 3410 | 2026-02-17 08:23:16 | `67ed07c06224b04b7e6ff2fde2cff66e0da5f221f2d96cc7f4e8e80bed6d0229` |
| `apps/dashboard/src/mission-control/event-bus.ts` | 437 | 2026-02-16 17:31:37 | `c3ecaad332d8fb3f15223daf611846d01487b2561d971072b9dc3593434b4354` |
| `apps/dashboard/src/mission-control/event-factory.ts` | 512 | 2026-02-16 17:31:37 | `9e03c058e7a01ba7c791df03d6d4aae88470903d0987565949557824c8524553` |
| `apps/dashboard/src/mission-control/jsonl-alert-store.ts` | 2941 | 2026-02-17 20:00:31 | `30b9cddee6c57e942d1d0f22970e5419917a22364bb46c3fba2405cd32c78da6` |
| `apps/dashboard/src/mission-control/jsonl-event-store.ts` | 2000 | 2026-02-16 17:38:27 | `19326a5855984e101e777c1daa80644cf4110b988310b6ade897177c2c13a23c` |
| `apps/dashboard/src/mission-control/policy.ts` | 1232 | 2026-02-17 14:26:07 | `1b6a895a3a32f06647b8576d38fb91b680d69674b0e03564b2a5bb1601f544cb` |
| `apps/dashboard/src/mission-control/rate-limit.ts` | 785 | 2026-02-16 17:31:55 | `0f947e591afbb854c2233d260a6734f7228125ff124baa5d24dc7cb336d6da06` |
| `apps/dashboard/src/mission-control/runtime-events.ts` | 1463 | 2026-02-16 17:32:25 | `e5a3f33b7f5ef9570fff92188ff47b76643468c02e5122f095460dfc5bb78c3f` |
| `apps/dashboard/src/mission-control/runtime-lifecycle-manager.ts` | 5209 | 2026-02-17 14:26:35 | `e8b4b0336af1856789874dce668ef4abae4bc79127c703500915efb11e1be9ba` |
| `apps/dashboard/src/mission-control/sqlite-event-store.ts` | 4967 | 2026-02-18 16:51:12 | `639918252486f4000bd224c1567bbb2a5e2962d61371baa597d7a416cf896e6c` |
| `apps/dashboard/src/mission-control/sqlite-ops-store.ts` | 24341 | 2026-02-23 10:53:46 | `d6310f60f36af9ad76a921d8f4e5967ac84fde434280bbce6f7672b5b422090c` |
| `apps/dashboard/src/mission-control/worker-manager.ts` | 9517 | 2026-02-23 11:36:18 | `8bf5101024698824c1a092e9f27a16ffc510ccc725559e2cc661037452cd57b7` |
| `apps/dashboard/src/mission-control-server.ts` | 207684 | 2026-02-23 12:06:12 | `e78c852398ebb77ea86a7baf5e0305bb7a681c7705e23430b549dc4ef634f0bc` |
| `apps/dashboard/src/okx-demo-auto-loop-cli.ts` | 10196 | 2026-02-17 14:03:52 | `1a99e46e1bfceb646ce6a5c56bbe5ecde6bf9e8ee6a1c55f1a9c610b0d683c01` |
| `apps/dashboard/src/okx-demo-cancel-cli.ts` | 4304 | 2026-02-17 14:03:47 | `abf004a0c761c5feec4c7916124fb349256ff5a616acbc0dd708653107d72edf` |
| `apps/dashboard/src/okx-demo-diagnostic-cli.ts` | 6491 | 2026-02-18 13:10:48 | `d3ed9b32a93474eef8fac634fa6c0a4bf2ed275a45fc333b0a3a46702afdd225` |
| `apps/dashboard/src/okx-demo-execute-cli.ts` | 6377 | 2026-02-17 14:03:32 | `ee706275e1797a2b0df5ec08cb5f761dd4cafd44918e42c881d9269d18d70298` |
| `apps/dashboard/src/okx-demo-health-cli.ts` | 2928 | 2026-02-18 12:45:17 | `da51017e648581f48a3072b1bfbe6a78ee8fb53f88056cd40afaaf6c1f916920` |
| `apps/dashboard/src/okx-demo-orders-cli.ts` | 2276 | 2026-02-17 14:03:36 | `876b580a6b41b3f631281c5a0e69c6caf8b66efc5e9b5602227735e1258e213b` |
| `apps/dashboard/src/okx-demo-reconcile-cli.ts` | 3554 | 2026-02-17 14:03:43 | `11a6aa74138ebf7deca28b4aa6ae1ede344bd6941829893fde646e4a66628bfa` |
| `apps/dashboard/src/okx-proposal-helper-cli.ts` | 4804 | 2026-02-17 14:03:58 | `bb70a8b220e2055b4173685c597ca06d4c76b66a360cf57d86ebe6461b8021c6` |
| `apps/dashboard/src/proposal-helper.ts` | 6727 | 2026-02-16 09:01:09 | `c7904f9d9d4031626eae07d84e2c13fde3aeee8e158eb86af36e45834033e306` |
| `apps/dashboard/src/reconciliation.ts` | 6040 | 2026-02-16 09:10:08 | `e5f55769e0e1138f12facf33e0575cf932b4237298f02e58439f36490e7e8ee4` |
| `apps/mission-control/coverage/coverage-summary.json` | 2253 | 2026-02-20 08:11:47 | `80c9a184db23dfea6bb22877fe7295fd61abb53f4e2fc5be63c5845045d9c9ce` |
| `apps/mission-control/dist/assets/index-BBlSDNAE.css` | 14374 | 2026-02-19 06:38:50 | `62e19ce6ef5220755ee0bd2ecebe77f35e606a973bc08f74e0db425a9ed99b7e` |
| `apps/mission-control/dist/assets/index-BwGly-rJ.js` | 287171 | 2026-02-19 06:38:50 | `200ad6193d828532f8e9343040f5d8ebc2bc5da6c3e37efd174a64710961d3ae` |
| `apps/mission-control/dist/index.html` | 408 | 2026-02-19 06:38:50 | `62968f2571b4183261f7648c0cff2173fe0b08adf507de8716d61c0e7146f882` |
| `apps/mission-control/index.html` | 310 | 2026-02-16 17:06:38 | `08590a3a9a172d25533738243d7ead030a850e32d52ab09543d150a4ddec4253` |
| `apps/mission-control/node_modules/.vite/deps/_metadata.json` | 1211 | 2026-02-17 08:51:22 | `846836cb1a2ae78c345471f7028b7051f367bf3f8917c78eb937c68dfeb1e232` |
| `apps/mission-control/node_modules/.vite/deps/chunk-JPOJ7BIY.js` | 16132 | 2026-02-17 08:51:22 | `4f3c3830d64d7b27285b15fde6f43f138372b1891876d9cbb04d5f453c2ddf76` |
| `apps/mission-control/node_modules/.vite/deps/chunk-JPOJ7BIY.js.map` | 26410 | 2026-02-17 08:51:22 | `265c923e3529eb1ba6996566b0e3ee9ebd915d0b825583349c4c958ae7e90723` |
| `apps/mission-control/node_modules/.vite/deps/chunk-KTVQT34V.js` | 45726 | 2026-02-17 08:51:22 | `10e86cf462484a29350d481c741b1205dccb5b5e457eedafa07f6d6386d2da83` |
| `apps/mission-control/node_modules/.vite/deps/chunk-KTVQT34V.js.map` | 71095 | 2026-02-17 08:51:22 | `b11d89625c6613aa65b16e6bf009ba2b56df26fc9b5df583581b6ade5ff4803f` |
| `apps/mission-control/node_modules/.vite/deps/package.json` | 23 | 2026-02-17 08:51:22 | `3ca9d4afd21425087cf31893b8f9f63c81b0b8408db5e343ca76e5f8aa26ab9a` |
| `apps/mission-control/node_modules/.vite/deps/react.js` | 87 | 2026-02-17 08:51:22 | `06640fabeb7b2123ec45465979881ce618868528983edba1f8f72bb6f75b391f` |
| `apps/mission-control/node_modules/.vite/deps/react.js.map` | 93 | 2026-02-17 08:51:22 | `ed562b0bba7ee7214e56ac7f728054b3496bec4597c94a4eb7b4179e6f5cb1c9` |
| `apps/mission-control/node_modules/.vite/deps/react_jsx-dev-runtime.js` | 12293 | 2026-02-17 08:51:22 | `d0bbd77becf517bfb0e113d3f224297d51791a85d2f063196fbd2971b6268995` |
| `apps/mission-control/node_modules/.vite/deps/react_jsx-dev-runtime.js.map` | 18686 | 2026-02-17 08:51:22 | `6ebfed12b34897f3dcaae7f340160435345b7e6009c14a21697f5045b5c02e5c` |
| `apps/mission-control/node_modules/.vite/deps/react_jsx-runtime.js` | 12655 | 2026-02-17 08:51:22 | `3cb4d5413870a207016cc3ec14e0ad30f889ed09637630a0d20b2ff6110c0f89` |
| `apps/mission-control/node_modules/.vite/deps/react_jsx-runtime.js.map` | 19287 | 2026-02-17 08:51:22 | `2b0357cd59b2de61e5b6a3b5ffc16f99b1c530de384422f96846f6ecfe65e167` |
| `apps/mission-control/node_modules/.vite/deps/react-dom.js` | 125 | 2026-02-17 08:51:22 | `ef70f69b80c6896d45d65d5b82a7022d72ec485fb02c20208e01580f7cec7079` |
| `apps/mission-control/node_modules/.vite/deps/react-dom.js.map` | 93 | 2026-02-17 08:51:22 | `ed562b0bba7ee7214e56ac7f728054b3496bec4597c94a4eb7b4179e6f5cb1c9` |
| `apps/mission-control/node_modules/.vite/deps/react-dom_client.js` | 1005187 | 2026-02-17 08:51:22 | `f14b7bce848f545229136f9afb30e703ae9582a00e355ba92207e4aa8399f858` |
| `apps/mission-control/node_modules/.vite/deps/react-dom_client.js.map` | 1559234 | 2026-02-17 08:51:22 | `6137b61d61b94540bff33a497aa550caed7b5fc5a22a550fdbe0109e9ae8ee22` |
| `apps/mission-control/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 473 | 2026-02-20 08:21:03 | `280736d02530dd4bd7fcd21ecc9393a5e9822f080e7d0d8831d675583c9c4471` |
| `apps/mission-control/package.json` | 669 | 2026-02-16 17:42:43 | `3024c620c459bc2e3913d4089b1595f968279f16f76d94c51d93ade2b841ce8e` |
| `apps/mission-control/README.md` | 5011 | 2026-02-17 13:32:41 | `8a2923353fdf2206681aa99dde2fdb85ab98505b108c85766f90d9f3c9a11c14` |
| `apps/mission-control/src/api/BotApiClient.ts` | 5965 | 2026-02-23 10:50:15 | `538549d7c745b2699e4bbcdadd2b620309cd676a3054f2dc9b2fd477d6eb8d69` |
| `apps/mission-control/src/api/LiveBotApiClient.ts` | 32505 | 2026-02-23 10:52:05 | `dc505e5ce44c0ae84f7dd6505c51df48868cf3748a88d9049a016da49ded052e` |
| `apps/mission-control/src/api/MockBotApiClient.ts` | 31720 | 2026-02-23 10:53:37 | `3be76fac5699b9f00c159e4dc947b94fa9b6c44c4406142357f666bec3cb5dec` |
| `apps/mission-control/src/App.tsx` | 38854 | 2026-02-23 11:00:41 | `fb1e6c9ba38bd9d2f5fa18ac7c66773446f87fc8b7427d4d98fe64b45e8c6c54` |
| `apps/mission-control/src/components/AlertsPanel.tsx` | 3935 | 2026-02-20 11:55:28 | `5fd90237a939c9ecef41427dda4e228879f630974f4fbee9ce2e22a719efd7d4` |
| `apps/mission-control/src/components/ApprovalsPanel.tsx` | 4599 | 2026-02-17 16:33:52 | `d2147ce924654de3c6c36aab79043f1088419978e1bfb0772984278856d775b6` |
| `apps/mission-control/src/components/AuditTimeline.tsx` | 1307 | 2026-02-16 17:05:08 | `4b7dce32b967dd32649ec3395eefc00800bda128404c5335da450528aaa3b6ea` |
| `apps/mission-control/src/components/AutonomyPanel.tsx` | 38405 | 2026-02-23 10:56:06 | `3b88d969cfdba51fe32f9841ea46bba770faf1633255ed1bdc27ac5be9adb5b6` |
| `apps/mission-control/src/components/BotStatusCard.tsx` | 1480 | 2026-02-16 17:04:22 | `8e20b77c5543d8d4d8d2656fe82eae10c976b9a105ee5062d172db5c6099fadf` |
| `apps/mission-control/src/components/ControlDeck.tsx` | 1610 | 2026-02-16 17:04:22 | `eb3c9bc99165976a7ecaa3dcb7489e336df8a315d8dbf908b97ad32a17afa159` |
| `apps/mission-control/src/components/DemoReadinessCard.tsx` | 1532 | 2026-02-17 15:49:47 | `183b6da47182e40ab56c2cb19606758b719aec344c5645acc1bdcdaf1fd2ebef` |
| `apps/mission-control/src/components/EventStream.tsx` | 7034 | 2026-02-17 13:15:12 | `043b3b5fd5e1e0eb83f7cccf9f1471e21215a12f3d03d88e77c64c56c62a4766` |
| `apps/mission-control/src/components/IncidentsPanel.tsx` | 2971 | 2026-02-21 20:11:58 | `6ffb6c22006c41b5144da164710546cd48d31bbdc52a724349f52fc0f4f01757` |
| `apps/mission-control/src/components/LogsPanel.tsx` | 2301 | 2026-02-17 16:52:22 | `21ba0d957605368d3e4e9add682446ede91f3940cf18ea88dcda9f68a6ac7ee1` |
| `apps/mission-control/src/components/Milestone5ReadinessCard.tsx` | 1328 | 2026-02-17 19:29:30 | `644d8160c260b76ee356b7eac89614a6dda6fc9727a5aa5e890cdd9c21e14aed` |
| `apps/mission-control/src/components/OpsMetricsPanel.tsx` | 2381 | 2026-02-17 14:54:17 | `059fb7100261676e15041908fdb21269b88f494a39dabd73503331c4504b74b0` |
| `apps/mission-control/src/components/OrdersPanel.tsx` | 1854 | 2026-02-17 13:11:29 | `c068a905309ad03371156a89c9533d1cb67ce95d94e07af8f40c6c8c6902d9c1` |
| `apps/mission-control/src/components/PortfolioPanel.tsx` | 7744 | 2026-02-17 17:11:26 | `add2669d999a9472a5d9e4dfc5d316b5a7f74ade2e7552ba15c7bc4c89bb8ca6` |
| `apps/mission-control/src/components/ReconciliationCard.tsx` | 1794 | 2026-02-17 07:58:23 | `3fe557ca91b9748b10b3804d932247b6badeaac6ca2c05efe61a2be4291f4a5a` |
| `apps/mission-control/src/components/RiskPanel.tsx` | 1451 | 2026-02-16 17:05:08 | `f45614d33170f004137945ec69bf1748942425a5f7067662652afe55423256ad` |
| `apps/mission-control/src/components/ThemeSwitcher.tsx` | 565 | 2026-02-16 17:04:22 | `861e77d8dd27e259d3347d23616f888b0e14f558086650b2eb5f667f3ca79a05` |
| `apps/mission-control/src/format.ts` | 733 | 2026-02-17 17:13:58 | `40a94e946986d80831ce0527981df67a85c8fe3b41afbcab85dd7cbdb16df02c` |
| `apps/mission-control/src/logic/controlAvailability.ts` | 1258 | 2026-02-17 14:26:12 | `59cb9bbf799732d838a0591f4d284f3497d82b40cbefd996d1c213aee9e99d85` |
| `apps/mission-control/src/logic/eventFilters.ts` | 1743 | 2026-02-16 17:34:21 | `82adc811a7d2838f41805609311bc10b8c5699f37658e9db5e923aca183a1776` |
| `apps/mission-control/src/main.tsx` | 232 | 2026-02-16 17:06:38 | `adbc6a19142a0e6bfd6289063814cda1d9748df74d8f6dfc04d0d810f218a6ee` |
| `apps/mission-control/src/mock/mockData.ts` | 6054 | 2026-02-16 17:43:47 | `0de386d7f19a8d5db8ad9e34d8c8c700f8fabbbb82e64e9cd177db2ef36a550a` |
| `apps/mission-control/src/state/useDashboardData.ts` | 13783 | 2026-02-20 11:24:05 | `b84a2fbbd2262b3b8cf2ec9494bac2139004683e2bd3e51844301036bb7d5107` |
| `apps/mission-control/src/styles.css` | 18198 | 2026-02-17 19:29:56 | `0260f7ce6572cf4e2a1900130e06daea0833cf2f7efc8f58ea3b4a86d22a6067` |
| `apps/mission-control/src/test/control-availability.spec.ts` | 628 | 2026-02-16 17:06:56 | `f19d2b619f4bf956bb0e9763be060fa3c11f02de6f6e292d881fa53ef0d39560` |
| `apps/mission-control/src/test/event-filters.spec.ts` | 1221 | 2026-02-16 17:06:56 | `e39b0758d48483a9fe3d35d7302cc60d33a48c46d1ed523f2d76534b88a3a8a5` |
| `apps/mission-control/src/test/event-stream-virtualization.spec.ts` | 3099 | 2026-02-17 13:19:27 | `27a4d0b136cc8cf9078a26ff9bea052581d17865f0038d66e23bb3d3afc46ed5` |
| `apps/mission-control/src/test/portfolio-orders-panel.spec.ts` | 3929 | 2026-02-17 17:14:02 | `7420d229b5742bfaf04196343bf1a06af145c35638804bbfd698aa35c995de80` |
| `apps/mission-control/src/test/role-gating.spec.ts` | 535 | 2026-02-16 17:06:56 | `ca39f817f2980ceac531cd3d4fffd1a2fff448b8e5ea742ea406fa205fe025e4` |
| `apps/mission-control/src/test/setup.ts` | 44 | 2026-02-16 17:06:56 | `60aa525f7ffa6bfd3045d22710d4eeef3a5ff2074ecc3dbcef99374badebad17` |
| `apps/mission-control/src/theme.ts` | 692 | 2026-02-16 17:02:33 | `dc8c55efbfffe4573575285c142021e013f38c985a02cba371af5b785917c7a3` |
| `apps/mission-control/src/types.ts` | 6405 | 2026-02-23 10:25:32 | `9b275af29339d660b2134ddf2db3f32d74bb692dbf5090729c416c2832c0e861` |
| `apps/mission-control/tsconfig.json` | 393 | 2026-02-16 17:43:04 | `11b5b470f0b39ee4262c5e0eded1137103c0bdd16970fcd1c353c403c2eb1b28` |
| `apps/mission-control/vite.config.ts` | 136 | 2026-02-16 17:02:09 | `d2d053ba4043a83d1a93e2c22a7aeb72b67535791d5113e6bfe843335439e5ed` |
| `apps/mission-control/vitest.config.ts` | 672 | 2026-02-20 08:07:58 | `014165672e00c033e5b61268b3a36f5d68b04e420603d80a88fdd98ed3b5a9a8` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/incident-taxonomy-and-slo.md` | 999 | 2026-02-17 08:14:36 | `62ed677505f66b742d92d9697a651d6cc5c986b76ba56435fa4a7092e4285a73` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/m5-soak-plan.md` | 2634 | 2026-02-17 19:41:37 | `31fe93e4063a501f85805ae545fcc034c9d26c36b82cc5e82c6890ade9533340` |
| `docs/m7-research-pipeline.md` | 3151 | 2026-02-23 12:02:15 | `13dede45dea62fba3bb26781a08eadf267e0f0164e28e25a27d647bf75c0aec7` |
| `docs/milestone-3-completion-report.md` | 2402 | 2026-02-17 07:19:51 | `5ea39346e2dcf983ee4e36d81321851c9400b014910c8a395372108d0442225e` |
| `docs/milestone-3-invariants.md` | 2457 | 2026-02-17 07:18:59 | `30e964d5ca026aa78c43971b8c828f0f8a5549348b6e7139ce68cd6ac713d8ea` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 18048 | 2026-02-23 11:10:55 | `713e12ef71854c2b72df104e7fca18c663542a4f2d94074980c97b35a26ca338` |
| `docs/runbooks/approval-governance.md` | 511 | 2026-02-17 08:14:21 | `22173a75980107cd50ea20e20026edc797b638ddca01af77054dc59c4998e7a0` |
| `docs/runbooks/control-plane-incident.md` | 2732 | 2026-02-17 13:33:00 | `00a6a6aae859f6b82d31d5c44d6d823544d2aafdc5064d958f4aa99cc768f421` |
| `docs/runbooks/exchange-reliability.md` | 508 | 2026-02-17 08:14:36 | `05b52676536a6fe45d01f85e54778cfe30239fb313f6e8fff7146f813b22e40e` |
| `docs/runbooks/freshness-guard.md` | 612 | 2026-02-17 08:14:21 | `9b34580d9ee2080fe59c635ed4a4fe675401c29d8ed318d785957ca2efb0d8e4` |
| `docs/runbooks/learning-evaluation-guard.md` | 1814 | 2026-02-20 10:54:42 | `1170205da16105b7171b98f71994c8ff4037700ae0603809ce855f8310cb7a59` |
| `docs/runbooks/reconciliation-drift-circuit.md` | 660 | 2026-02-17 08:14:21 | `e1c20250b36afbd059c08da1dc10747313821972de49feae9febdb22f0ae6217` |
| `docs/tomorrow-work.md` | 2948 | 2026-02-23 11:11:03 | `cd725f632ff8c7cee4dd9d2605e7881f0c045184dfa74f78c702f22cb61e2e66` |
| `docs/ui-prompts.md` | 16045 | 2026-02-16 17:00:33 | `de5e884a5d4fc1f5b340efe9bc28adfcb313ccee16d4e9136b1c73818e832c3c` |
| `eslint.config.mjs` | 1975 | 2026-02-20 08:19:22 | `7bc26fbaf896e1ba9bbc8a9d658cd60fe4eac6c53878f21fdc6e0a6c268d7be3` |
| `logs/context.e2e.json` | 295 | 2026-02-17 13:49:59 | `30cbda451beabc5dd7ac3a11ba4e4c148bf6785692c71239c36148fb9b16205e` |
| `logs/local-terminal.err.log` | 173 | 2026-02-17 20:04:53 | `d052ca9bf1d9124f21bb6832673ce32c6cbd451ab287e65d2af85805b9a71a31` |
| `logs/local-terminal.out.log` | 6005 | 2026-02-17 20:04:50 | `3b2f9d873d6e051f27daf6cd854bae9aaf3459630737ead18dadb62228b4ceea` |
| `logs/local-terminal.pid` | 7 | 2026-02-17 20:01:00 | `ccb7cf046f379b2fd4753d38a546dfedea3fd4aca8912adb1ab1d41102b73c40` |
| `logs/m5-evidence-2026-02-17T19-33-51-490Z/evidence.json` | 783 | 2026-02-17 19:33:51 | `73401ad671d41ef76718aeea02eac9cd71cfe92ee3eccd8d3356ef8ea8f60f18` |
| `logs/m5-evidence-2026-02-17T19-33-51-490Z/summary.md` | 470 | 2026-02-17 19:33:51 | `387de3aa1153c2c24a3c17891ab21e9e6be7cf5f6033970df81192e3ea0bf634` |
| `logs/m5-evidence-2026-02-17T20-03-47-498Z/evidence.json` | 852 | 2026-02-17 20:03:47 | `4218b9feb07b2ced27598b20c0cde4f6b9d6a4acf581cbf1792973e3522c23c7` |
| `logs/m5-evidence-2026-02-17T20-03-47-498Z/summary.md` | 518 | 2026-02-17 20:03:47 | `e8d4f375808a6ccc2b9db63594a1adad71cbabc636a47c53579f7ba65d7e26be` |
| `logs/m5-evidence-2026-02-18T12-15-19-710Z/evidence.json` | 1189 | 2026-02-18 12:15:19 | `f09cd1940a1581af39b6103be6d841dd77abdcca103135377ea3df878dddf0b9` |
| `logs/m5-evidence-2026-02-18T12-15-19-710Z/summary.md` | 603 | 2026-02-18 12:15:19 | `c2d5a1f009b899f84ab5d86ffe74eb858929e759b48489e9faccfe0868576aa4` |
| `logs/m5-evidence-2026-02-18T12-34-39-806Z/evidence.json` | 1189 | 2026-02-18 12:34:39 | `cfa8603041b31e0049cce174af6d68ec4c83c25764b701dec321695c705e3fd8` |
| `logs/m5-evidence-2026-02-18T12-34-39-806Z/summary.md` | 603 | 2026-02-18 12:34:39 | `404f48cae16322d13d76ee883111fbe81bc5b2070cd3117de3cadb69166c933d` |
| `logs/m5-evidence-2026-02-18T12-42-28-783Z/evidence.json` | 1189 | 2026-02-18 12:42:28 | `de8d34ed9ea129d210dd2f31ebff40f384136f0e595cb65d2bc908061bd1a8fd` |
| `logs/m5-evidence-2026-02-18T12-42-28-783Z/summary.md` | 603 | 2026-02-18 12:42:28 | `fdf8e833d8656d61592dfbf4dea73a34101e6d5705c5106522969f709e27b26e` |
| `logs/m5-evidence-2026-02-18T13-17-20-576Z/evidence.json` | 1134 | 2026-02-18 13:17:20 | `84e18762884008f21f1108b689f512697ef723a117a23da31cfba521e373d754` |
| `logs/m5-evidence-2026-02-18T13-17-20-576Z/summary.md` | 566 | 2026-02-18 13:17:20 | `431bc830d0173be1f7a4d5909916dc26c6d72150151012a7822dedc4b1cab000` |
| `logs/m5-evidence-2026-02-18T13-55-27-115Z/evidence.json` | 1205 | 2026-02-18 13:55:29 | `b0be5946e97815e296938c444baec5215baa46a538594b842ac0a9665c10fc8b` |
| `logs/m5-evidence-2026-02-18T13-55-27-115Z/summary.md` | 616 | 2026-02-18 13:55:29 | `94d63f97e98122b6376dc2becc5c4c8e254ce22112cafc299563eea54edd420b` |
| `logs/m5-evidence-2026-02-18T14-08-55-068Z/evidence.json` | 1191 | 2026-02-18 14:08:55 | `d17047e600b65dc8e3b2da806c92b932de6ab5b87532db3cb23989b46f8ba761` |
| `logs/m5-evidence-2026-02-18T14-08-55-068Z/summary.md` | 605 | 2026-02-18 14:08:55 | `5635139402c58d7bf6445769f222be128c4a4084bc68f76844296c7e0ad4a8aa` |
| `logs/m5-evidence-2026-02-18T14-41-32-838Z/evidence.json` | 1197 | 2026-02-18 14:41:32 | `53564c00d94bdd53f6819b2e1f456988593badd15af5622ab9b43885fc2691c9` |
| `logs/m5-evidence-2026-02-18T14-41-32-838Z/summary.md` | 608 | 2026-02-18 14:41:32 | `dd724364745cb700f02b23550fdfea1d8768ae3c5dbba12a5af132ac5058df4c` |
| `logs/m5-evidence-2026-02-18T15-27-01-008Z/evidence.json` | 1191 | 2026-02-18 15:27:01 | `c55500065be5999def417d59df337a3d80f076968293e2245ce2e674a211220d` |
| `logs/m5-evidence-2026-02-18T15-27-01-008Z/summary.md` | 605 | 2026-02-18 15:27:01 | `8aaf46aea8e5634b8bd21476b3e044d39e4bca4fb055490c751da8b84244d96c` |
| `logs/m5-evidence-2026-02-18T15-55-56-628Z/evidence.json` | 1193 | 2026-02-18 15:55:56 | `d6a4ddc381ce262adf81557c064d63f81734e693c3c479685a2172babcfde510` |
| `logs/m5-evidence-2026-02-18T15-55-56-628Z/summary.md` | 607 | 2026-02-18 15:55:56 | `1d41bec69144c00b52d471186d642c22979f2ae8edf8f76e3c95d80724bd1431` |
| `logs/m5-evidence-2026-02-18T16-19-35-422Z/evidence.json` | 1199 | 2026-02-18 16:19:35 | `259bce7dae66862b3c3bf214a9bb8c192eda2c9e856e3ded0028e8040c3c9488` |
| `logs/m5-evidence-2026-02-18T16-19-35-422Z/summary.md` | 610 | 2026-02-18 16:19:35 | `33d6892de6babddeaa4e9702d072f368095bb7b10705377400259ae3429c2852` |
| `logs/m5-evidence-2026-02-18T16-43-09-110Z/evidence.json` | 1201 | 2026-02-18 16:43:09 | `3f06eec77026dc7ec1f590c58cbe2756e6b2244cd795fed76a0da3c57e365e1c` |
| `logs/m5-evidence-2026-02-18T16-43-09-110Z/summary.md` | 612 | 2026-02-18 16:43:09 | `fd20d45540e407709fa1cd60b20286f075fb0237a65369fd1bb7356c285a8623` |
| `logs/m5-evidence-2026-02-18T17-04-45-900Z/evidence.json` | 1134 | 2026-02-18 17:04:47 | `a2886e264f91f66770761bd04f10f8efd3886fcaf5428c23781f0ddcc122fecb` |
| `logs/m5-evidence-2026-02-18T17-04-45-900Z/summary.md` | 566 | 2026-02-18 17:04:47 | `44c34c0bc6c873bc1a929f3705845b407d1111b13587ff48685e26efbb37464d` |
| `logs/m5-evidence-2026-02-18T17-11-22-380Z/evidence.json` | 1134 | 2026-02-18 17:11:24 | `ba9367f20237c22d0cc66b758f90c43b9bde163265a858de72e06316e5bad57a` |
| `logs/m5-evidence-2026-02-18T17-11-22-380Z/summary.md` | 566 | 2026-02-18 17:11:24 | `dfb9c18380dd0e35c7675c75ea5dd5fe49e6e4d7a9b4a2ffb03fe164e4fae412` |
| `logs/m5-evidence-2026-02-18T18-26-30-live-smoke/evidence.json` | 1193 | 2026-02-18 18:26:19 | `487e5568cdf5c7503f5315470760cef8c95c7da79d0a7ae464458bd456de4fab` |
| `logs/m5-evidence-2026-02-18T18-26-30-live-smoke/summary.md` | 607 | 2026-02-18 18:26:19 | `9f09963aa93ca99041e5dc9d4ad5ac655ebd7b4be4d66b3516ab5531aaa4a700` |
| `logs/m5-evidence-2026-02-18T18-34-15-second-soak/evidence.json` | 1138 | 2026-02-18 18:34:09 | `e81c19eab2ab060356e437c8834c7c234aaecc7984aeb804d6aff323c96e4457` |
| `logs/m5-evidence-2026-02-18T18-34-15-second-soak/summary.md` | 567 | 2026-02-18 18:34:09 | `eeacee07e9b1fac3993997512960e31806adbb8b7710163ed09be6bf7842be69` |
| `logs/m5-evidence-2026-02-19T07-51-17-242Z/evidence.json` | 1550 | 2026-02-19 07:51:17 | `0321be76012b3a01ff685ebfe102301e64bd4e1dbb0b3f045c6a5df982727042` |
| `logs/m5-evidence-2026-02-19T07-51-17-242Z/summary.md` | 706 | 2026-02-19 07:51:17 | `b0e0d6308e4fa2434f2f94a0125e048764875554bafc8a1e0378f3f8133b122a` |
| `logs/m5-evidence-2026-02-19T09-00-50-297Z/evidence.json` | 1548 | 2026-02-19 09:00:50 | `82385b5f3c5d14cf2054722bbbe8227133ed93610c3761acbc5005f1d3b497f9` |
| `logs/m5-evidence-2026-02-19T09-00-50-297Z/summary.md` | 704 | 2026-02-19 09:00:50 | `bfdd373c1307663230588a5c5a14458a7bcd6f8ff30dae38a1e8b17dc5f7260c` |
| `logs/m5-evidence-2026-02-19T09-54-36-995Z/evidence.json` | 1548 | 2026-02-19 09:54:37 | `b70abd910353fb51a35aae419e6e43d2f5342bbdbff1275793215de68ac16fd1` |
| `logs/m5-evidence-2026-02-19T09-54-36-995Z/summary.md` | 705 | 2026-02-19 09:54:37 | `2fe038a7a6315223048d718aa0233e48e74ff8cc8f211a2010529336defe40e6` |
| `logs/m5-evidence-2026-02-19T10-42-25-324Z/evidence.json` | 1550 | 2026-02-19 10:42:25 | `69d1b8936e73306dacc46ff01b6b08bf7f67dd80a814fcf75112b61bf0743897` |
| `logs/m5-evidence-2026-02-19T10-42-25-324Z/summary.md` | 706 | 2026-02-19 10:42:25 | `961c71cdb74ede86b7f86ac0cf6ddc6bde9b2ec7ce4d2a02438ca9e1b5f8794c` |
| `logs/m5-evidence-2026-02-19T11-13-26-100Z/evidence.json` | 1550 | 2026-02-19 11:13:26 | `2a21fa82d6f7881098b54e2eb6e56d1f957244e4fadfc5f492f8bd05aaddcce5` |
| `logs/m5-evidence-2026-02-19T11-13-26-100Z/summary.md` | 706 | 2026-02-19 11:13:26 | `c54a11f2d12db9fa6ee450ea6f278bc06d87728176c734e16166fa88964b9b07` |
| `logs/m5-evidence-2026-02-19T11-42-53-302Z/evidence.json` | 1552 | 2026-02-19 11:42:53 | `a01e3f83f1b2ac896083561a3959eb7aac950a2f85cb51461adfc6c32cd7a4cf` |
| `logs/m5-evidence-2026-02-19T11-42-53-302Z/summary.md` | 708 | 2026-02-19 11:42:53 | `46bdf000418057091c45149937eb766c366369dbe61b567c7e9f041aabf018ee` |
| `logs/m5-evidence-2026-02-19T12-12-40-167Z/evidence.json` | 1544 | 2026-02-19 12:12:40 | `de8ce889b8676dab4cfa6bf2a4dce02ef2a685bcfa52aa2676c5691b7993288a` |
| `logs/m5-evidence-2026-02-19T12-12-40-167Z/summary.md` | 703 | 2026-02-19 12:12:40 | `424f46a56eba9b2bfb4558839ea8134a611ee6783ba7628d61653063131f9ee8` |
| `logs/m5-evidence-2026-02-19T12-41-11-574Z/evidence.json` | 1550 | 2026-02-19 12:41:11 | `09b5b15ee7d152c6f1ea25e55c3c9a854a1d15ef6dd8a98774bcc4078a7e6a69` |
| `logs/m5-evidence-2026-02-19T12-41-11-574Z/summary.md` | 706 | 2026-02-19 12:41:11 | `a01eb3940684744c8d6f7991e86ef251d0bda4553f64fffaa92b99b0306650a5` |
| `logs/m5-evidence-2026-02-19T13-10-04-449Z/evidence.json` | 1552 | 2026-02-19 13:10:04 | `aa5fc1e9094d290c4706a14f4bb8d7a2ffb41a492b8d5f9c656e4391a76d0bf9` |
| `logs/m5-evidence-2026-02-19T13-10-04-449Z/summary.md` | 708 | 2026-02-19 13:10:04 | `c033753e9916e292de6257855779b9c68fa1812c0a45ec6c0f4b9550c7662c06` |
| `logs/m5-evidence-2026-02-19T14-08-41-682Z/evidence.json` | 1546 | 2026-02-19 14:08:41 | `722ffc356cadc028971a460f5abb76c428e9456ea5e1d16c14a99519baca6afd` |
| `logs/m5-evidence-2026-02-19T14-08-41-682Z/summary.md` | 705 | 2026-02-19 14:08:41 | `f0a6aac1daa5a1e74dcc0a43ec2b9f034c5f7c32d90bfb8d24782762f36e5d07` |
| `logs/m5-evidence-2026-02-19T14-37-19-010Z/evidence.json` | 1544 | 2026-02-19 14:37:19 | `7fa131f8893b689f45e6292fd7063083e3eaca320f5abc5e5e28a99819df179c` |
| `logs/m5-evidence-2026-02-19T14-37-19-010Z/summary.md` | 703 | 2026-02-19 14:37:19 | `89f3b6dc6c2ad44360d66867eed927eecd94d9a14bb75fcf81b43501d3d37fef` |
| `logs/m5-evidence-2026-02-19T15-08-29-436Z/evidence.json` | 1483 | 2026-02-19 15:08:29 | `efd10d325e6b350d6248acbe65b662818658b26b1e940c64122967dc6f59b68e` |
| `logs/m5-evidence-2026-02-19T15-08-29-436Z/summary.md` | 660 | 2026-02-19 15:08:29 | `6b354f2718bb3ba5c86518c3d7deffd9ab67bc81fe4e10d05eb0f073d0a7490a` |
| `logs/m5-evidence-2026-02-20T08-52-48-891Z/evidence.json` | 1830 | 2026-02-20 08:52:48 | `e66aa030c5bab354bc67a5db7b7044c0bd16d726e5f529c2a5798df1413ab72c` |
| `logs/m5-evidence-2026-02-20T08-52-48-891Z/summary.md` | 755 | 2026-02-20 08:52:49 | `fc8c15d98413d11f99e70d951a5fa6a5c8855a2f30f7c9a7568e5bca1a9fa1f6` |
| `logs/m5-evidence-2026-02-21T19-39-48-175Z/evidence.json` | 2175 | 2026-02-21 19:39:48 | `8f25cfef6cb46f8592344fc99fb2fff310567a027b37800f9cff5365b598db15` |
| `logs/m5-evidence-2026-02-21T19-39-48-175Z/summary.md` | 848 | 2026-02-21 19:39:48 | `8ba05536413be2160e471dda9e7c065fbd216f7ff43e2431f33933f1e005d3e2` |
| `logs/m5-evidence-2026-02-22T08-22-47-015Z/evidence.json` | 2589 | 2026-02-22 08:22:47 | `6fdaca864415a459719625b46c5b1513a98cfb5f9f28174cada7070e8d0a5e7a` |
| `logs/m5-evidence-2026-02-22T08-22-47-015Z/summary.md` | 989 | 2026-02-22 08:22:47 | `d8a097c71e208d7fa14770f7d389a0dcf70e12a4dd82c01185e7fa4dd45205b1` |
| `logs/m5-evidence-2026-02-22T09-14-32-766Z/evidence.json` | 2522 | 2026-02-22 09:14:32 | `c32ea39eaba7f67bb9139419317da018c7a6efcee750a261e74802f4d6197354` |
| `logs/m5-evidence-2026-02-22T09-14-32-766Z/summary.md` | 943 | 2026-02-22 09:14:32 | `56ab04712eadd53c59175c6f4a24ac9946606e216f31364e893a9c1575873fdd` |
| `logs/m5-evidence-2026-02-23T08-28-23-766Z/evidence.json` | 2869 | 2026-02-23 08:28:23 | `5bd9085e9e2c6555b64cc5461cebef2d5f6cbac98c9fffd70c22766acfcba1e5` |
| `logs/m5-evidence-2026-02-23T08-28-23-766Z/summary.md` | 1038 | 2026-02-23 08:28:23 | `b5658614a4824c5e8a0f6bdd794e562f59427f0066d250a8006cee89a4b63c04` |
| `logs/m5-evidence-server.err.log` | 170 | 2026-02-17 19:40:37 | `d9a645ccb73ee43ae720ee86d1671b9cbfa20afd564d804c8d91231f91e14a1d` |
| `logs/m5-evidence-server.out.log` | 493 | 2026-02-17 19:33:51 | `975802daaf5e23ce651bdbc7b6540b02071da907031fa9882ef1efb219a402d6` |
| `logs/m5-evidence-server.pid` | 7 | 2026-02-17 19:33:33 | `a5f588000542d5c04e807c71ab9db3c9c084639ea83b7f5f77f0082cc5b00a36` |
| `logs/m5-soak-2026-02-17T18-11-37-293Z/report.json` | 874 | 2026-02-17 18:15:38 | `e6ec26027a0ed9348c900015ffe0c8edf63ae16f4714c53b81424b69376497c0` |
| `logs/m5-soak-2026-02-17T18-11-37-293Z/summary.md` | 512 | 2026-02-17 18:15:38 | `3232dc455c799c26e937ccec04580c1733541a1cb1e26ca891fb55af5d1b40d0` |
| `logs/m5-soak-2026-02-17T18-16-26-291Z/report.json` | 877 | 2026-02-17 18:20:28 | `bdaa9a29a6762e3b3a53adf746e60be74a9a3c462a55f55add9a5d1c0ce34632` |
| `logs/m5-soak-2026-02-17T18-16-26-291Z/summary.md` | 513 | 2026-02-17 18:20:28 | `af62339afc800455abdbaf684ffca6831cda1a87c75ca72a1f2ee827c87f48bd` |
| `logs/m5-soak-2026-02-17T18-21-13-365Z/report.json` | 985 | 2026-02-17 18:26:13 | `24145ff875a76b34e501e02bf9cc6a042eee39a35b2f75b0957c2ce7bb3453c0` |
| `logs/m5-soak-2026-02-17T18-21-13-365Z/summary.md` | 616 | 2026-02-17 18:26:13 | `df3ac0604b4756f845abded4ee87bfa78f75904fa9d5190a0850fd690e9a2c41` |
| `logs/m5-soak-2026-02-17T18-26-42-664Z/report.json` | 1030 | 2026-02-17 18:34:44 | `299da27f6f1fa5d2a786b31259d30f53e8f5cbaf78b0e7dc421d30a99931493e` |
| `logs/m5-soak-2026-02-17T18-26-42-664Z/summary.md` | 670 | 2026-02-17 18:34:44 | `30359ebcc2c0241f93f3fa03f9fdf941de95dc26e4b8001b6ee0f380d2ca0dc7` |
| `logs/m5-soak-2026-02-17T18-42-58-381Z/report.json` | 929 | 2026-02-17 18:50:59 | `c8a17165223d45bba576abaa9fb692dc428dc06448c55eaa4d3e12345cb5e493` |
| `logs/m5-soak-2026-02-17T18-42-58-381Z/summary.md` | 573 | 2026-02-17 18:50:59 | `badee7b7b4aa76a725e6b5b287a7f2afc01d06343d60c618312deb23938bfa00` |
| `logs/m5-soak-2026-02-17T18-51-28-365Z/report.json` | 924 | 2026-02-17 19:02:30 | `e97255cdb6439622b835e7221d56af1caff4cf5527b1287f2ac5e32abec4d14b` |
| `logs/m5-soak-2026-02-17T18-51-28-365Z/summary.md` | 570 | 2026-02-17 19:02:30 | `b13af1df544fb4d1dbdda9de99f509c29caa528dd86b12684c771f80b1ad4ce1` |
| `logs/m5-soak-2026-02-17T20-01-55-749Z/report.json` | 1040 | 2026-02-17 20:03:39 | `426319781d167444912f34a8fc4177609423cb9a32c42677e7cc618b0dbcf4ea` |
| `logs/m5-soak-2026-02-17T20-01-55-749Z/summary.md` | 678 | 2026-02-17 20:03:39 | `f4d8c2d6d7dec49ece865cfedee5e142c4f7a00de73ac8f5dec5b9154b620bd6` |
| `logs/m5-soak-2026-02-18T11-57-13-348Z/report.json` | 1032 | 2026-02-18 12:15:15 | `9fc85863c3f7cd8c6f784669cd7816715d59e868c09c439d86d9838ff84997f9` |
| `logs/m5-soak-2026-02-18T11-57-13-348Z/summary.md` | 676 | 2026-02-18 12:15:15 | `5c49778decf850a39bf366da4a57afa1566d8c107b71a82901d56dd1545a3036` |
| `logs/m5-soak-2026-02-18T12-16-32-118Z/report.json` | 925 | 2026-02-18 12:34:34 | `f6d2958decb79b49f7f441f653542b917572cc16b2e74fbd7d30540be21d817f` |
| `logs/m5-soak-2026-02-18T12-16-32-118Z/summary.md` | 574 | 2026-02-18 12:34:34 | `e658475bd0d3176d0fc7ae69f152abd33d3da4ea0f6bc4153e6d851c257d1fb3` |
| `logs/m5-soak-2026-02-18T12-36-22-047Z/report.json` | 926 | 2026-02-18 12:42:24 | `5230e59421b0f5c3de2dcf425a2a9472c15659af5db054163b53aad1927eeb53` |
| `logs/m5-soak-2026-02-18T12-36-22-047Z/summary.md` | 574 | 2026-02-18 12:42:24 | `b0d669607806c7606e5ad90aeb4bc0d879a2a804335c0793e44d3dfef27de745` |
| `logs/m5-soak-2026-02-18T13-11-12-606Z/report.json` | 932 | 2026-02-18 13:17:14 | `85e215a2b2a9663d58ec26c6955c17114bf85cde8b821caaf7530d95a62e94b6` |
| `logs/m5-soak-2026-02-18T13-11-12-606Z/summary.md` | 577 | 2026-02-18 13:17:14 | `81d156742dc945ff1dde6891bb60b9a72bb86f9169e95e89194636c7b38116fc` |
| `logs/m5-soak-2026-02-18T13-36-15-429Z/report.json` | 939 | 2026-02-18 13:55:15 | `a10af9844f7e7d10e7e51e9452a28cc16397e16b053750adbf3b7bcd1f6b1d26` |
| `logs/m5-soak-2026-02-18T13-36-15-429Z/summary.md` | 582 | 2026-02-18 13:55:15 | `e2e4e6d286f58c4df988978f9fec51464c34834ec74692f61f0fb5d54e0898f4` |
| `logs/m5-soak-2026-02-18T14-02-19-452Z/report.json` | 924 | 2026-02-18 14:08:46 | `12b85fc3c0566801cc53ef4bde5965510fada799c3b1d2c7162c25d110d660ab` |
| `logs/m5-soak-2026-02-18T14-02-19-452Z/summary.md` | 573 | 2026-02-18 14:08:46 | `cf9276205f78573b83a9f661650e19bc42f589ee4d58932008c151d39a95ea66` |
| `logs/m5-soak-2026-02-18T14-22-38-166Z/report.json` | 1015 | 2026-02-18 14:41:22 | `0166f266003361e18ece75f645e7ab0fcb18b859af8011f339c943d8ae598733` |
| `logs/m5-soak-2026-02-18T14-22-38-166Z/summary.md` | 657 | 2026-02-18 14:41:22 | `e77c30eff8b3dd49885603ff699964fc0985a70952b67a12ca86ff74afb52eae` |
| `logs/m5-soak-2026-02-18T15-05-34-617Z/report.json` | 1021 | 2026-02-18 15:26:42 | `cb080f422e00cd77504396d2eaaeaf15c28a796d1fda6f740f09123e5708fffa` |
| `logs/m5-soak-2026-02-18T15-05-34-617Z/summary.md` | 663 | 2026-02-18 15:26:42 | `232e7beec2f298aee7fa8489c06c18898c9d01d49a11ffef87f9998e75f689c9` |
| `logs/m5-soak-2026-02-18T15-34-36-035Z/report.json` | 1022 | 2026-02-18 15:55:44 | `a7e635734c5fe877f6eb7332d24fb8afd1a4ca12abaeb04a88723341383095c8` |
| `logs/m5-soak-2026-02-18T15-34-36-035Z/summary.md` | 663 | 2026-02-18 15:55:44 | `81e959ca69449e5dfb100c6ca23836b5918faf34c8551fdba72c667bd45366e1` |
| `logs/m5-soak-2026-02-18T15-57-43-996Z/report.json` | 1024 | 2026-02-18 16:19:16 | `64117cfe0e4fca644390a96c6ecaca1f624f434147295048a1bab3a13bf8e15b` |
| `logs/m5-soak-2026-02-18T15-57-43-996Z/summary.md` | 666 | 2026-02-18 16:19:16 | `1f7e61fc61ada0b16fbf3893c7145f62bdfd0e1a76245d2e794e19f51d7794ed` |
| `logs/m5-soak-2026-02-18T16-21-11-917Z/report.json` | 1026 | 2026-02-18 16:42:55 | `b3355596a37f881910610f4897c6d6a4db40b04387eb334db676328629876abe` |
| `logs/m5-soak-2026-02-18T16-21-11-917Z/summary.md` | 667 | 2026-02-18 16:42:55 | `8ff12f04cf915a7ba3bdfe1d94c020b660931a3da074f4385a20c276522d13e5` |
| `logs/m5-soak-2026-02-18T16-53-18-518Z/report.json` | 1067 | 2026-02-18 17:04:02 | `725b3921d71a0700ea1f89b0d53046349ca071f142a061f6212ac4ec7969e5ea` |
| `logs/m5-soak-2026-02-18T16-53-18-518Z/summary.md` | 722 | 2026-02-18 17:04:02 | `6cdda4c80b640f398594a62cc29ff7b6258d5b3d333454099482f19e9ae448cd` |
| `logs/m5-soak-2026-02-18T17-05-07-165Z/report.json` | 1068 | 2026-02-18 17:10:41 | `8c5048f281fa41e7178ae2de4385e89c6d4cb14ef451b827c5edf3f6dec4b4a8` |
| `logs/m5-soak-2026-02-18T17-05-07-165Z/summary.md` | 722 | 2026-02-18 17:10:41 | `24d571110a6e01de2719f6032183eb02f0724af74645f3fab389094c1b1fa086` |
| `logs/m5-soak-2026-02-18T18-21-12-051Z/report.json` | 1175 | 2026-02-18 18:26:13 | `11122c6dfbe8ea8c720a5f9b6bfc4a7d4ff231af79a2287a0a0a56906dc0bb52` |
| `logs/m5-soak-2026-02-18T18-21-12-051Z/summary.md` | 825 | 2026-02-18 18:26:13 | `c4649901f30260fc60c56227dc4e5ac536265f17bbf7779f559f598852306460` |
| `logs/m5-soak-2026-02-18T18-27-09-506Z/report.json` | 1073 | 2026-02-18 18:34:03 | `4139519be4f12d6a3d10d7c91b2d76be878f5cf7b66e330c7cfa68bf0c6c7ada` |
| `logs/m5-soak-2026-02-18T18-27-09-506Z/summary.md` | 727 | 2026-02-18 18:34:03 | `1316765157a820efa731303ade2c1980e8859330c8469b6969b7a9e519760086` |
| `logs/m5-soak-2026-02-19T06-54-09-871Z/report.json` | 1030 | 2026-02-19 07:15:55 | `5c19baa9e9bf66372e96bab915e6d7db54b1c3ac01805b9b8645f846f6d437ab` |
| `logs/m5-soak-2026-02-19T06-54-09-871Z/summary.md` | 689 | 2026-02-19 07:15:55 | `c5178ba59a280fddc1b901a5b3f47b2e2b2f91455b873b39e39d3ab3fb3bec89` |
| `logs/m5-soak-2026-02-19T07-52-29-812Z/report.json` | 1028 | 2026-02-19 08:18:27 | `94317fe8be6babe0da0d852acc9c4ca9ac782c8f78772653ecd572bf115db8a1` |
| `logs/m5-soak-2026-02-19T07-52-29-812Z/summary.md` | 689 | 2026-02-19 08:18:27 | `31382cf75047d8dfdac6c8513e50e8ddf5b6985abba7f33a3fe1c760fe15a318` |
| `logs/m5-soak-2026-02-19T08-27-32-026Z/report.json` | 1132 | 2026-02-19 09:00:41 | `ef63c39ea216c875e85d2a64361004aa2ef09dc14cfb7180138bf4416c77f135` |
| `logs/m5-soak-2026-02-19T08-27-32-026Z/summary.md` | 789 | 2026-02-19 09:00:41 | `c5c4ad4416c8675c53fd2ea5fabd11a2ff82309c8ac3d255d286dc306a206565` |
| `logs/m5-soak-2026-02-19T09-28-25-114Z/report.json` | 1132 | 2026-02-19 09:54:29 | `39715bf695743a8330ca82dfee7668c6e1107a552e0835b10aa86e650e78674f` |
| `logs/m5-soak-2026-02-19T09-28-25-114Z/summary.md` | 788 | 2026-02-19 09:54:29 | `a3fb44d1c17ec42f4940a863838b664e584a758afb433586c2758651ab751ffd` |
| `logs/m5-soak-2026-02-19T10-13-15-506Z/report.json` | 1026 | 2026-02-19 10:42:17 | `199ab648c003e8fd28d9a462ddb1be13f7b31262002caa5630bacae78b7ee527` |
| `logs/m5-soak-2026-02-19T10-13-15-506Z/summary.md` | 688 | 2026-02-19 10:42:17 | `63dc5a017e0b7826618f2801adfa5fbcfffec89f3d64be9e59fff05aaf44d8ac` |
| `logs/m5-soak-2026-02-19T10-47-05-159Z/report.json` | 1027 | 2026-02-19 11:13:19 | `1dd8f220315cc56f5f9617875ecdc6dca272162f78da0e4a7b54415aa939bfbb` |
| `logs/m5-soak-2026-02-19T10-47-05-159Z/summary.md` | 688 | 2026-02-19 11:13:19 | `65877913e2af4df1d1d802f59dced5ecb7512c25d09e96883975c488fe7bb978` |
| `logs/m5-soak-2026-02-19T11-15-44-010Z/report.json` | 1077 | 2026-02-19 11:42:47 | `c372595ebf9ab67f73512947c742e812f0cd3fe7b2ac0a9568025f64376880cc` |
| `logs/m5-soak-2026-02-19T11-15-44-010Z/summary.md` | 731 | 2026-02-19 11:42:47 | `db9a294275fc1be9ee77f61955f64df15845e66169ebaa9f225229459fc139bf` |
| `logs/m5-soak-2026-02-19T11-45-31-984Z/report.json` | 1072 | 2026-02-19 12:12:34 | `f4ccdffbeebcd88c96e6a47e6bad6be52f3990aaa7f46e7a1831c67a00502668` |
| `logs/m5-soak-2026-02-19T11-45-31-984Z/summary.md` | 727 | 2026-02-19 12:12:34 | `e1f1176fd7d50cbfee29883965b1ca22616d0e1f7ef6327d2c61fb1cd9edd9e0` |
| `logs/m5-soak-2026-02-19T12-13-59-111Z/report.json` | 1075 | 2026-02-19 12:41:02 | `37dc4ca5f85444d6de1bbbd681b9308d2c1af0730d755cb7b0f4675816130cd0` |
| `logs/m5-soak-2026-02-19T12-13-59-111Z/summary.md` | 730 | 2026-02-19 12:41:02 | `c6fe203581f81bf3045215cf4ced953dc22929099b561d1ea76621c95fd4f5d1` |
| `logs/m5-soak-2026-02-19T12-42-34-271Z/report.json` | 1077 | 2026-02-19 13:09:57 | `2ae297bca02df0e138563861c1ced28459fec2407b04969a9c146cd8678575dd` |
| `logs/m5-soak-2026-02-19T12-42-34-271Z/summary.md` | 731 | 2026-02-19 13:09:57 | `5c0b1f779750c1b255b15c98cc68ae74f13888ee643cb52cdd7fe3e470b343d6` |
| `logs/m5-soak-2026-02-19T13-41-14-683Z/report.json` | 1074 | 2026-02-19 14:08:33 | `a02f061ecaaff59fb9bef6139b07e71d5f5d4dc7ba4e8699b75ac52ec51aec0e` |
| `logs/m5-soak-2026-02-19T13-41-14-683Z/summary.md` | 728 | 2026-02-19 14:08:33 | `2202672b52a336f1cc5bb8290e6406c189233e48d4f33a73f446bfb5db5d4186` |
| `logs/m5-soak-2026-02-19T14-09-58-232Z/report.json` | 1072 | 2026-02-19 14:37:09 | `0157e693834b6671d543def4db50a20e7b069d2c69d261630ff01a7c244d124f` |
| `logs/m5-soak-2026-02-19T14-09-58-232Z/summary.md` | 727 | 2026-02-19 14:37:09 | `3a6a806e7106da1c2d540764f005d5aa0daf539b6dfc1948b12c0510c5d2816e` |
| `logs/m5-soak-2026-02-19T14-45-20-008Z/report.json` | 1067 | 2026-02-19 15:08:21 | `14274f2c4038e7b1ce31e91853431cb8dfc7bfaea130b66bba76ef3b24d32181` |
| `logs/m5-soak-2026-02-19T14-45-20-008Z/summary.md` | 722 | 2026-02-19 15:08:21 | `85c42f253b582b0d7e8d5c22d0728083d0a1dd8d8c89eb8a76ca1c850b927e22` |
| `logs/m5-soak-2026-02-20T08-34-37-063Z/report.json` | 1022 | 2026-02-20 08:52:48 | `048fe49048188655429cc65abae93a034f266a63a7525aa1b34be8d20bc80087` |
| `logs/m5-soak-2026-02-20T08-34-37-063Z/summary.md` | 681 | 2026-02-20 08:52:48 | `eaf4a43317c3ec4e9a18c3216f86a583d05e4996f290fe21f9c7aa94ba28ed16` |
| `logs/m5-soak-2026-02-20T10-14-48-651Z/report.json` | 1027 | 2026-02-20 10:36:07 | `fbaf9db756465c9c4bcb7b22ca6d95bb396ba0bb57b091b2b8505d253bc37b9a` |
| `logs/m5-soak-2026-02-20T10-14-48-651Z/summary.md` | 688 | 2026-02-20 10:36:07 | `4d788343f80bdbd7d5fbaa49cae530ddbf4689bbfc3a3c70d7292eac826bdb77` |
| `logs/m5-soak-2026-02-20T11-58-11-535Z/report.json` | 1123 | 2026-02-20 12:05:41 | `87c2d61e7c90a78e9a3ac90ce907bd9ccc9188cb52db8727c85a689470dd2cf2` |
| `logs/m5-soak-2026-02-20T11-58-11-535Z/summary.md` | 781 | 2026-02-20 12:05:41 | `59f2b49b3c463b72b5bde3c9d5c4b764426258b5e8e3244580f3cd0ae3c124ae` |
| `logs/m5-soak-2026-02-20T12-14-26-419Z/report.json` | 1128 | 2026-02-20 12:24:01 | `bd4bc6899d802b04c9101568b0bd0efa090ff70376a901fcc55000207d6d682a` |
| `logs/m5-soak-2026-02-20T12-14-26-419Z/summary.md` | 784 | 2026-02-20 12:24:01 | `c74bb98a113bfa95284d67d66fa387d77a09d6bb58d783b7968b303ceeafaec8` |
| `logs/m5-soak-2026-02-21T19-21-42-196Z/report.json` | 1129 | 2026-02-21 19:39:43 | `b14525e37218ad4c6e397ef7cd2d54fc011405160bfdfed226e1e8546ee94c64` |
| `logs/m5-soak-2026-02-21T19-21-42-196Z/summary.md` | 783 | 2026-02-21 19:39:43 | `f8488ab3244ed16249d8cdecef9af2f8a9bae56c53570dfe1c8ad808dd517516` |
| `logs/m5-soak-2026-02-22T08-01-37-574Z/report.json` | 1030 | 2026-02-22 08:22:42 | `0e4d96241b31160430e8fb255e9ae6509b58a03ce0db856ad0d68fd6cf9bf9d8` |
| `logs/m5-soak-2026-02-22T08-01-37-574Z/summary.md` | 689 | 2026-02-22 08:22:42 | `29d22ad5c7f534e9d3587be8b5f26c4b7e28974f7acaeac3dbd57e6b57527e1c` |
| `logs/m5-soak-2026-02-22T08-56-27-598Z/report.json` | 1130 | 2026-02-22 09:14:28 | `dc8ef6b6190ec43de60249385987b0d4a492a475929092b8cd4fbf7d0cc02012` |
| `logs/m5-soak-2026-02-22T08-56-27-598Z/summary.md` | 784 | 2026-02-22 09:14:28 | `5ffaecd94ddfaf0b0e149e2b0f37a0e9bbb28a4f9bab3cef5d509f516d04d506` |
| `logs/m5-soak-2026-02-22T09-32-49-351Z/report.json` | 1130 | 2026-02-22 09:50:49 | `b546cc82c7f9afaa28b5d610e202233d49bae4e347a399761e59506dc21624ef` |
| `logs/m5-soak-2026-02-22T09-32-49-351Z/summary.md` | 784 | 2026-02-22 09:50:49 | `9671b8072e03ba2707800c16559671aa03819d68cb146692773f7855d05183da` |
| `logs/m5-soak-2026-02-23T08-10-20-412Z/report.json` | 1130 | 2026-02-23 08:28:22 | `752c7e6b0cb81ddb7b3a0e213747c531703f672505bfe64dcbd736c77300852b` |
| `logs/m5-soak-2026-02-23T08-10-20-412Z/summary.md` | 784 | 2026-02-23 08:28:22 | `e5723de5ac6e48acca89caf09fcfb54c964257d00a7ed6d15fc26d72fd864dbc` |
| `logs/m5-soak-run.err.log` | 375 | 2026-02-19 06:53:40 | `0c12ad4352b5f4110bf7ee1302283b76662f15eff4629b197a10de2b01ebeb6f` |
| `logs/m5-soak-run.out.log` | 823 | 2026-02-19 08:18:27 | `4acc3d9aef736926027fb38a4653d1ec0071da0e9c8bcb5c4d5ba86070de2352` |
| `logs/m5-soak-server.err.log` | 169 | 2026-02-19 06:53:56 | `6d6432eae09ebe038866b6ffd2cb85d11f85d43761728834388996d6693e0b33` |
| `logs/m5-soak-server.out.log` | 709795 | 2026-02-19 11:15:17 | `45ddefda0910f5f39d53e97f1a6020de388cdb665361c867a2f533fed8e9c6bd` |
| `logs/m5-soak-server.pid` | 7 | 2026-02-17 18:42:43 | `9a0cf3e80acd3cc81bd7851fb0ca2533c0c6963c0f61013bd8786a31d8c5dd0a` |
| `logs/m6-acceptance-2026-02-19T08-04-49-497Z/report.json` | 104668 | 2026-02-19 08:04:50 | `7b24234641be575ed597a560f7c3986fc40149f5bd91de01f84c65e6aa0c7947` |
| `logs/m6-acceptance-2026-02-19T08-04-49-497Z/summary.md` | 613 | 2026-02-19 08:04:50 | `1630c41db3deb9367036f779418d9ebb889fac155e97f1deb2b83d1a1a85d412` |
| `logs/m6-acceptance-2026-02-19T15-24-28-150Z/report.json` | 98547 | 2026-02-19 15:24:29 | `e2631a9713b657b5a13a46a6f44ff0539f4c80674b391b33c27fd04b26112219` |
| `logs/m6-acceptance-2026-02-19T15-24-28-150Z/summary.md` | 613 | 2026-02-19 15:24:29 | `3bcc1d755a9f2017202d2a1a3fc9564468ea59cf42a31fd0afd10dfaebe8c25a` |
| `logs/m7-dataset-2026-02-20T09-53-18-101Z/closed-trade-features.ndjson` | 0 | 2026-02-20 09:53:18 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/m7-dataset-2026-02-20T09-53-18-101Z/dataset-manifest.json` | 731 | 2026-02-20 09:53:18 | `e24b4b31f3c46d94f3a79e758b3d0b1bb6ef8832275e3fc5475d61e388f1c2b7` |
| `logs/m7-dataset-2026-02-20T09-53-18-101Z/summary.md` | 449 | 2026-02-20 09:53:18 | `d170de16f84e646368fd509a881f8f47a83542ffcead839fa9de7b649fab5587` |
| `logs/m7-dataset-2026-02-20T10-36-07-759Z/closed-trade-features.ndjson` | 52651 | 2026-02-20 10:36:07 | `358b831ca6336cf9f498ceb499dab28e9c40ea76b43dd79f80bd01cf7a7d0944` |
| `logs/m7-dataset-2026-02-20T10-36-07-759Z/dataset-manifest.json` | 1056 | 2026-02-20 10:36:07 | `c13dc04e360ecd7df300c37a20773562178e69b8804dd85f4739f016885060e2` |
| `logs/m7-dataset-2026-02-20T10-36-07-759Z/summary.md` | 491 | 2026-02-20 10:36:07 | `dd30e1c58b12f190ac1c0d07052a65823af369549ce1153463105aa0f327dc36` |
| `logs/m7-dataset-2026-02-20T11-49-28-484Z/closed-trade-features.ndjson` | 0 | 2026-02-20 11:49:28 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/m7-dataset-2026-02-20T11-49-28-484Z/dataset-manifest.json` | 731 | 2026-02-20 11:49:28 | `a1168ba24028e522fa5bfd715ad5dec823a69c5a64240dfca1a0619b8ad622cc` |
| `logs/m7-dataset-2026-02-20T11-49-28-484Z/summary.md` | 449 | 2026-02-20 11:49:28 | `c281645e0edc0e6fbc8c2bc15c2964937e62d1f52070abb724407fd320b21999` |
| `logs/m7-dataset-2026-02-20T12-33-24-460Z/closed-trade-features.ndjson` | 44528 | 2026-02-20 12:33:24 | `d802753e89c940b894ead52fa56b9761326cd98de0483ce4486c14bd7f770bd0` |
| `logs/m7-dataset-2026-02-20T12-33-24-460Z/dataset-manifest.json` | 1018 | 2026-02-20 12:33:24 | `44ceb8fd7072482b3c60a9f32ea08810dd9da775420196a83d793c20c985fe33` |
| `logs/m7-dataset-2026-02-20T12-33-24-460Z/summary.md` | 491 | 2026-02-20 12:33:24 | `9b250257e5890cccb3e81a302c740a0cbda2496d01367fd5c8822792db6379d5` |
| `logs/m7-dataset-2026-02-22T09-30-27-990Z/closed-trade-features.ndjson` | 0 | 2026-02-22 09:30:28 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/m7-dataset-2026-02-22T09-30-27-990Z/dataset-manifest.json` | 731 | 2026-02-22 09:30:28 | `d581c6baf2d1f16be2404ad98ca8cc35797e27c4d27c3a4782237a0bc0db3e00` |
| `logs/m7-dataset-2026-02-22T09-30-27-990Z/summary.md` | 449 | 2026-02-22 09:30:28 | `4507bdfcf82b0f5511085e139df3573c7d63de60f78ffd1dcadc2424254af1d4` |
| `logs/m7-dataset-2026-02-22T09-51-00-685Z/closed-trade-features.ndjson` | 18444 | 2026-02-22 09:51:00 | `37aac06a999f566e4b2b3a2468c62246b59b10d462da0fcebe7c2d7346c652d5` |
| `logs/m7-dataset-2026-02-22T09-51-00-685Z/dataset-manifest.json` | 1019 | 2026-02-22 09:51:00 | `3e0fc981f94ccfdbb258927323f0405bbac9c2c33ab525015e4599af2476c182` |
| `logs/m7-dataset-2026-02-22T09-51-00-685Z/summary.md` | 481 | 2026-02-22 09:51:00 | `2e96592b79b12d2879140769d97e77b15763b2eb34848878631f2d05ba5eceb5` |
| `logs/m7-dataset-2026-02-23T12-07-58-432Z/closed-trade-features.ndjson` | 151889 | 2026-02-23 12:07:58 | `6de9186b93a687cad788d1ff26e7b68479e8917811174015e13061b18149bd7a` |
| `logs/m7-dataset-2026-02-23T12-07-58-432Z/dataset-manifest.json` | 1038 | 2026-02-23 12:07:58 | `175fc5a40d125c5895cefd7affa1ef365d40311e9938bceb37cbb8918d5c6294` |
| `logs/m7-dataset-2026-02-23T12-07-58-432Z/summary.md` | 492 | 2026-02-23 12:07:58 | `2f0c3582a4ca97e520937d441982c1e4fad98f492c2b33c5555474cae72c4171` |
| `logs/m7-dataset-curated-validation-2026-02-23T08-10-32-002-03-00/closed-trade-features.ndjson` | 98294 | 2026-02-23 11:10:32 | `de704690f3632186beaa148a066d8e98820e2815c8a70279f177e13b4072423d` |
| `logs/m7-dataset-curated-validation-2026-02-23T08-10-32-002-03-00/dataset-manifest.json` | 1118 | 2026-02-23 11:10:32 | `35f7063edda65b7fdd6518bca3d333ccebd9a16b3c6d9c1b9743ae8b597a19f2` |
| `logs/m7-dataset-curated-validation-2026-02-23T08-10-32-002-03-00/summary.md` | 293 | 2026-02-23 11:10:32 | `d187e67edd4a07d798b0f84af6edec229debc2e08110a68616b42a5374fb1f81` |
| `logs/m7-dataset-sol-trial-2026-02-23T11-50-05-635Z/closed-trade-features.ndjson` | 53594 | 2026-02-23 11:50:07 | `b1035b5b8cc7e7009533b31d333f97339a0eb330d9fd8d36051d965d04862ec2` |
| `logs/m7-dataset-sol-trial-2026-02-23T11-50-05-635Z/dataset-manifest.json` | 1055 | 2026-02-23 11:50:07 | `3c21c148e0f180e8e999f155afe3148a926df028c70377542b223e91c43f8d87` |
| `logs/m7-dataset-sol-trial-2026-02-23T11-50-05-635Z/summary.md` | 269 | 2026-02-23 11:50:07 | `a741116a6d0075bd35959d35c9cc67730ce7507d7a04a8c4171f3ac68dce263d` |
| `logs/m7-dataset-validation-2026-02-23T08-07-31-532-03-00/closed-trade-features.ndjson` | 151889 | 2026-02-23 11:07:35 | `d4da3110ea53981a29a8ed5fee0d61c4dd8c6478b4dcde8a6a034142621c6d1f` |
| `logs/m7-dataset-validation-2026-02-23T08-07-31-532-03-00/dataset-manifest.json` | 1038 | 2026-02-23 11:07:35 | `153362bf8e60e4998c606c0aaabebd8bf8156e7560c90fdb6cdbb02457749b17` |
| `logs/m7-dataset-validation-2026-02-23T08-07-31-532-03-00/summary.md` | 524 | 2026-02-23 11:07:35 | `8c945d0ef43e2962e706226e186ade6f0126a0398ad28837ce56cf8847c15fe2` |
| `logs/m7-decision-bundle-2026-02-21T19-52-16-512Z/bundle.json` | 1073 | 2026-02-21 19:52:16 | `a47664ed5d1791332cf6c9ac902c963b27bbe032a3f80335f0f141c2543724bb` |
| `logs/m7-decision-bundle-2026-02-21T19-52-16-512Z/summary.md` | 767 | 2026-02-21 19:52:16 | `01bdec7627a97d449ced85d849ad038932d6cac31206f6a9254a45903a72a87b` |
| `logs/m7-gate-2026-02-20T09-55-35-588Z/summary.md` | 317 | 2026-02-20 09:55:35 | `bb80174420c5c284b536b52604c53e33d1135e9cc2ae8efc573541772fdada1a` |
| `logs/m7-gate-2026-02-20T09-56-04-342Z/gate-result.json` | 515 | 2026-02-20 09:56:04 | `45a857f8c430379c64d3a5596749f38afe8cd20afa27f9997dd5096edf9694da` |
| `logs/m7-gate-2026-02-20T09-56-04-342Z/summary.md` | 381 | 2026-02-20 09:56:04 | `93c9cdd552fa433452569af0314d087cf0c5951090c74f4c9322cee552ab40f7` |
| `logs/m7-gate-2026-02-20T09-56-16-224Z/gate-result.json` | 515 | 2026-02-20 09:56:16 | `8453f6603b52cdfaf6264f6e24eacdddf223b4b2a25a8e3a05716bd31ebfa966` |
| `logs/m7-gate-2026-02-20T09-56-16-224Z/summary.md` | 381 | 2026-02-20 09:56:16 | `93c9cdd552fa433452569af0314d087cf0c5951090c74f4c9322cee552ab40f7` |
| `logs/m7-gate-2026-02-20T10-36-09-084Z/gate-result.json` | 486 | 2026-02-20 10:36:09 | `add306b265b1d53278614801e6fde8914a9e4d38af4469297b6cc238aa31e362` |
| `logs/m7-gate-2026-02-20T10-36-09-084Z/summary.md` | 366 | 2026-02-20 10:36:09 | `63e3658d99fb6cdbae2a868e012ee7a09778ac5a0585e04cf0ad0c8b04415b03` |
| `logs/m7-gate-2026-02-20T11-49-38-595Z/summary.md` | 317 | 2026-02-20 11:49:38 | `61b6093846ba06b9e7c04772e7b30fc9efb741e195b2bcf8bbe5cae8eb50b8d3` |
| `logs/m7-gate-2026-02-20T11-51-19-233Z/gate-result.json` | 515 | 2026-02-20 11:51:19 | `3a206e9b9cf04cf23c2e24a1d363e55f79c82177bb99c9a26b3f978ec6972c08` |
| `logs/m7-gate-2026-02-20T11-51-19-233Z/summary.md` | 381 | 2026-02-20 11:51:19 | `c442a622af34216d4f828f7fdab405848af3c3cb23d408823134e503d10669b8` |
| `logs/m7-gate-2026-02-20T12-33-37-386Z/summary.md` | 357 | 2026-02-20 12:33:37 | `69d3076a5d69a55e5b74f84d8552286243bce5bbf46ca4ba2d2304852496dfd0` |
| `logs/m7-gate-2026-02-20T12-34-36-260Z/gate-result.json` | 486 | 2026-02-20 12:34:36 | `9c4b7738e7e866f05964c53e0867cb0bb8746febb3e5f4832a7d297becb916e0` |
| `logs/m7-gate-2026-02-20T12-34-36-260Z/summary.md` | 366 | 2026-02-20 12:34:36 | `bfa2d6f44230f4712b3318032cb9d2b2c662b49a303be7b395355a94da8d35b5` |
| `logs/m7-gate-2026-02-22T09-30-35-396Z/summary.md` | 317 | 2026-02-22 09:30:35 | `9971c2d8f5f2bbe54d8128ef28fefb2901a3ac30981dc1236e2cea444abc0905` |
| `logs/m7-gate-2026-02-22T09-51-17-082Z/gate-result.json` | 486 | 2026-02-22 09:51:17 | `cd17f6025e3e2ce4f35a237e6a4cbaab66d14e4d51622440bef460793104be8d` |
| `logs/m7-gate-2026-02-22T09-51-17-082Z/summary.md` | 366 | 2026-02-22 09:51:17 | `861858c51935bed72cc216deb215d5ec9e2b0f22c1f2cd30cc8be2dae817be74` |
| `logs/m7-gate-2026-02-23T09-55-30-036Z/gate-result.json` | 524 | 2026-02-23 09:55:30 | `3315e94f1b4db5e2cf73e744631a70a376d92d79bda0a9dabe425252eb116a9f` |
| `logs/m7-gate-2026-02-23T09-55-30-036Z/summary.md` | 399 | 2026-02-23 09:55:30 | `2cc2f496d2a76e600db54709bb4283a88938d8cf700919b21af44f9c1da0d961` |
| `logs/m7-gate-curated-validation-2026-02-23T08-10-32-002-03-00/gate-result.json` | 524 | 2026-02-23 11:10:34 | `375819a5bd6cf104e59ca1709e1cdd29c9e1066e4112ea674600388cf5278ea9` |
| `logs/m7-gate-curated-validation-2026-02-23T08-10-32-002-03-00/summary.md` | 399 | 2026-02-23 11:10:34 | `f376000b475335d48e812c03bf4320376d6c0070f95e341e60eca91473cb5bbb` |
| `logs/m7-gate-sol-reentry-moderate-2026-02-23T11-54-23-106Z/gate-result.json` | 560 | 2026-02-23 11:54:26 | `2f2bf916ffaa2e4ea6e0064d474aca63c38e0a99d6788a49fbbf2d3ce6a3354d` |
| `logs/m7-gate-sol-reentry-moderate-2026-02-23T11-54-23-106Z/summary.md` | 421 | 2026-02-23 11:54:26 | `d9248c108af10728bae656b09591813f8bdafa4ac918c79fd1b871128aefad1f` |
| `logs/m7-gate-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/gate-result.json` | 524 | 2026-02-23 11:54:28 | `dd23ac19ba216af98592be95569683700cff406f5d63f926f3cda2653ee47a16` |
| `logs/m7-gate-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/summary.md` | 399 | 2026-02-23 11:54:28 | `29eee46e93ca7852d5f0a94e84b0f7f5fa39c9ccc06bdae2c9b45a92be23ab57` |
| `logs/m7-gate-sol-reentry-strict-2026-02-23T11-54-23-106Z/gate-result.json` | 560 | 2026-02-23 11:54:25 | `cf8c56d2d992fa8c2a7e4d1aeb883e8db56bfe71c5883e7fad51ff31514d25e6` |
| `logs/m7-gate-sol-reentry-strict-2026-02-23T11-54-23-106Z/summary.md` | 421 | 2026-02-23 11:54:25 | `d9248c108af10728bae656b09591813f8bdafa4ac918c79fd1b871128aefad1f` |
| `logs/m7-gate-sol-trial-2026-02-23T11-50-05-635Z/gate-result.json` | 560 | 2026-02-23 11:50:30 | `08a1cfd430c148da9638b61350fe466d4f0bef7371488e9a3a347d0ec23c9e2f` |
| `logs/m7-gate-sol-trial-2026-02-23T11-50-05-635Z/summary.md` | 421 | 2026-02-23 11:50:30 | `36444f054c0871519f8d75381d406b4d3c9c5a514448c5b5a4618b1326263241` |
| `logs/m7-gate-validation-2026-02-23T08-07-31-532-03-00/gate-result.json` | 560 | 2026-02-23 11:08:03 | `7879128bdbccbadf665dd239f9f99cf5639bc96ab6d1d1634b19a853c3141714` |
| `logs/m7-gate-validation-2026-02-23T08-07-31-532-03-00/summary.md` | 421 | 2026-02-23 11:08:03 | `a63376294bcbf2405025551ee2653b7f4f3b397f4b210d7c4a27bd85966221f5` |
| `logs/m7-governance-2026-02-23T05-48-24-372-03-00/events.json` | 30279 | 2026-02-23 08:48:41 | `3cdf521a01e41e345742669c7852b34b5af08e182fd3f864c590dee69f7a9b12` |
| `logs/m7-governance-2026-02-23T05-48-24-372-03-00/incidents-export.json` | 1305 | 2026-02-23 08:48:41 | `15db88282b1832655acd0c65cbf8d1b2cf275a50bb2b64c36a24deaf766ebb3f` |
| `logs/m7-governance-2026-02-23T05-48-24-372-03-00/strategy-promotion.json` | 2298 | 2026-02-23 08:48:41 | `d4723affa449154b41faf5dba67928d20e3286ff4fc6cf39c2d3ec62c3dc905d` |
| `logs/m7-governance-2026-02-23T05-48-24-372-03-00/summary.json` | 1004 | 2026-02-23 08:48:54 | `88a1ba72b66ac3c7dab88be54ad906f56e1477c9030115726d79843191498f5c` |
| `logs/m7-governance-rehearsal-2026-02-21T19-51-20-648Z/report.json` | 234582 | 2026-02-21 19:51:21 | `c76c8c47d690d90f4bbaba17a7373476fb839362261ac4beea8f095038e59ed1` |
| `logs/m7-governance-rehearsal-2026-02-21T19-51-20-648Z/summary.md` | 836 | 2026-02-21 19:51:21 | `e226a2e06cf77fb280c1b2531fa91b93ba45486ec6d686719ec920519548978f` |
| `logs/m7-governance-rehearsal-rerun-2026-02-21T19-54-45-006Z/run.js` | 2776 | 2026-02-21 19:54:45 | `7f538f83f72f956b4185cd7d6e481533be5cc890480eb512c8ebe6fa0df411b9` |
| `logs/m7-governance-rehearsal-rerun-2026-02-21T19-55-02-943Z/report.json` | 50983 | 2026-02-21 19:55:03 | `d4a80c071689baf486757ebc2e7225fffb33ccb1ede7de57699c97663b245a55` |
| `logs/m7-governance-rehearsal-rerun-2026-02-21T19-55-02-943Z/run.cjs` | 2776 | 2026-02-21 19:55:02 | `7f538f83f72f956b4185cd7d6e481533be5cc890480eb512c8ebe6fa0df411b9` |
| `logs/m7-governance-rehearsal-rerun-2026-02-21T19-55-02-943Z/summary.md` | 577 | 2026-02-21 19:55:03 | `f580afe7ef18f11d9ee838c52dff462ac74519830322f667604e62fe1dea5a70` |
| `logs/m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00/incidents-export.json` | 1305 | 2026-02-23 08:52:05 | `68eb90454ca7a905dff2a44c13397b964012d3cc429fbf7068807b3b528ccc4c` |
| `logs/m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00/learning-incidents-export-30d.json` | 2554 | 2026-02-23 08:52:05 | `d453d50a064f3a49a74cbd8dd6db446824b069409ef67ab5d9bfc2588bcea407` |
| `logs/m7-incidents-export-validation-2026-02-23T05-52-05-317-03-00/summary.json` | 1676 | 2026-02-23 08:52:05 | `789f08dbe8232c938c951265a81ddcbff1ed6f5f65876a567f1e70821009dfbc` |
| `logs/m7-monitor-server.err.log` | 1066 | 2026-02-23 12:07:59 | `c4d1a124a40bb9e1da34ecba6f41556f6a1da069682b61d45a22867d2887044b` |
| `logs/m7-monitor-server.out.log` | 78 | 2026-02-23 12:07:57 | `c9941beb3fdaaf4309daa7b585123015786f0d5bee593f25c8eba3475a40ae63` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/approval-record.json` | 281 | 2026-02-20 09:56:15 | `31a42ba2e72057eb6bb17003b0b76d62c062f07ced0a53d7fbda525228d3f9af` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/approval-record.json.template.json` | 327 | 2026-02-20 09:55:35 | `cf2cd087bdc152490cf9305b73522337be008e9dc511f670422a4ac70bedf457` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/metrics.json` | 155 | 2026-02-20 09:53:35 | `c32de41ad5f3a66cf4d71c7ea1a698ae1f5c2913a1a9e92935f3384a47eed434` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/model-card.md` | 463 | 2026-02-20 09:53:35 | `632e9b9aaf01ed3ce905a61bec7baaa83c81fe12f577fd54d0bf70d28fc1e9c0` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/promotion-packet.json` | 698 | 2026-02-20 09:53:35 | `0b1e33a6bac766f6b3c8e35f6b1511377e41d618a60ffc18e97d126ae2b03319` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/summary.md` | 511 | 2026-02-20 09:53:35 | `8ecbb924872ac8d919b051a3a738ab9d5cf18c3cf6974d60782fccb9df685fdb` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/training-run.json` | 1027 | 2026-02-20 09:53:35 | `95c8a23d3262083e6c301145034c7fcb550b2a3fb021ef43fe004843f9b7119c` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/validation-report.json` | 663 | 2026-02-20 09:56:15 | `368dbc84b6a1ba242ef7f8f2c08cbe412d0f6073090dd32be8e595ffa10ce84d` |
| `logs/m7-retrain-2026-02-20T09-53-35-031Z/validation-report.json.template.json` | 541 | 2026-02-20 09:55:35 | `107d136bce43554cdc6252f861348d64cf503a398d4db4dc25e9be48dda0b856` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/approval-record.json` | 312 | 2026-02-20 10:36:08 | `8d9a9241d329ec673a8075f0eef6f898bdd8ca54af0415b6c954f5b9a325aaea` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/metrics.json` | 547 | 2026-02-20 10:36:08 | `f28f0dddf6190df5091527279962265199654b09b8daf539b7c9773cf340e535` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/model-card.md` | 487 | 2026-02-20 10:36:08 | `59f449f764bc9939f09130ee07fef08cfc58acc539cc4e392f75647ec4b2e232` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/promotion-packet.json` | 698 | 2026-02-20 10:36:08 | `c0e0c7b984198cd79f4a73ae07aef32cafe95a8323b0a86f865ac77ca254235e` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/summary.md` | 520 | 2026-02-20 10:36:08 | `9e2df73d0c666fe3f95501aa3de78b7803f65d78a3422e352eae04fd3242672a` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/training-run.json` | 1458 | 2026-02-20 10:36:08 | `b2b55544e2e49e2902f2414e56f55793fab271b1f047b8469e3f08db1983bff2` |
| `logs/m7-retrain-2026-02-20T10-36-08-401Z/validation-report.json` | 859 | 2026-02-20 10:36:08 | `3d7ec0aaff046709dcdfef91155bd73b994022dfbc146bf4b77ea76f197b3513` |
| `logs/m7-retrain-2026-02-20T11-45-39-087Z/metrics.json` | 547 | 2026-02-20 11:45:39 | `f28f0dddf6190df5091527279962265199654b09b8daf539b7c9773cf340e535` |
| `logs/m7-retrain-2026-02-20T11-45-39-087Z/model-card.md` | 487 | 2026-02-20 11:45:39 | `5aafb58046f86eaa21d0718c213f3ef7bcd74e49947a46de3b012a4045f2c795` |
| `logs/m7-retrain-2026-02-20T11-45-39-087Z/promotion-packet.json` | 698 | 2026-02-20 11:45:39 | `62771f935b090f2bfac2843299c205f69a75a5ca96fa3889912a5653ae64fdd4` |
| `logs/m7-retrain-2026-02-20T11-45-39-087Z/summary.md` | 520 | 2026-02-20 11:45:39 | `791704b92180c89249e3d8d12a68d5fa5242036f01ea49c8dfaa7bb65ab5ae24` |
| `logs/m7-retrain-2026-02-20T11-45-39-087Z/training-run.json` | 1458 | 2026-02-20 11:45:39 | `3cb20bb2a1bfe860971274224cbb6f2afbddd02696660b2df36c478396cf64a2` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/approval-record.json` | 298 | 2026-02-20 11:51:13 | `46f64eee384cd74101c721dd4ec4f647072a35721d3dc0a497c36fbb9d9a172e` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/approval-record.json.template.json` | 327 | 2026-02-20 11:49:38 | `14e234ae3c3eb59ff9385875a8cf75a2af960728965ae96a8a1f854a2c4b3360` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/metrics.json` | 155 | 2026-02-20 11:49:33 | `c32de41ad5f3a66cf4d71c7ea1a698ae1f5c2913a1a9e92935f3384a47eed434` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/model-card.md` | 463 | 2026-02-20 11:49:33 | `fb259b53f8f7f95f0d0a25a9824640dac5a7155c6f98f4c2148fe9288b4588d8` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/promotion-packet.json` | 698 | 2026-02-20 11:49:33 | `ff5ef5f7d6a011a25d49d2ccb5d53b72b4c79453faa569b2bd1acfcb9b9bcf1d` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/summary.md` | 511 | 2026-02-20 11:49:33 | `4005005294e561bac4f878273435610db856f1d3c013d2ace8cbf3239feb3070` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/training-run.json` | 1027 | 2026-02-20 11:49:33 | `fc2f55b4db7ae9accd4f0604556bf228068d66949d55ddec9ed7aae873a97ec4` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/validation-report.json` | 637 | 2026-02-20 11:51:13 | `30270a1342cf9db5f48baa318917a83cf0c9c9ab75db69ade790cb60f9451140` |
| `logs/m7-retrain-2026-02-20T11-49-33-692Z/validation-report.json.template.json` | 541 | 2026-02-20 11:49:38 | `cb7cddbf80cd959cf88b729ac232db537118a7e3ae7a64dc3065037c1a054f44` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/approval-record.json.template.json` | 327 | 2026-02-20 12:33:37 | `73bf4ab825a8db9cd3d3526b68eb59ea67af68d33b096a66ff2549d8f252a9a7` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/metrics.json` | 155 | 2026-02-20 12:33:24 | `c32de41ad5f3a66cf4d71c7ea1a698ae1f5c2913a1a9e92935f3384a47eed434` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/model-card.md` | 463 | 2026-02-20 12:33:24 | `c7ccb50b21ae8b5630a7c8e30067c7c42d78fb7c4f4f2ea610148cc141efade0` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/promotion-packet.json` | 698 | 2026-02-20 12:33:24 | `bbed6cf009e7dc30552dd26ff90a6d5542bd704690988ebd7a89ecb547c2cd03` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/summary.md` | 511 | 2026-02-20 12:33:24 | `8e5de4f18881a2d1ce9c70010e67aa0520bd0467b41289eb49667ac5ebc4bda4` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/training-run.json` | 1027 | 2026-02-20 12:33:24 | `7aff507e2feee2a9f0bfd7f5d140f193f202e88738dc5c9a6c526c53bc3a0dc1` |
| `logs/m7-retrain-2026-02-20T12-33-24-509Z/validation-report.json.template.json` | 541 | 2026-02-20 12:33:37 | `d5b6e042d85801394969acb423cfcd620150f09d3445d0b78b86bee1e48807bf` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/approval-record.json` | 326 | 2026-02-20 12:34:29 | `2ebdd0659847cbeddda665c521b39fbea386984c159b28df7683218f3750d74b` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/metrics.json` | 544 | 2026-02-20 12:33:37 | `c04aa003f7673074721aab2d40bd1398b262cda1fd2d667140a37ebc1e8a8944` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/model-card.md` | 488 | 2026-02-20 12:33:37 | `af33f60537337a35c4ece06eee85d50065e78b3abdbffed4c6b165a95aa602b9` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/promotion-packet.json` | 698 | 2026-02-20 12:33:37 | `6851093fd95f7701f8ea46ea931fa9d02a67d15433867de470bac3491f941dee` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/summary.md` | 519 | 2026-02-20 12:33:37 | `df856fdabaeeba4d314157bdd12893a5b74adb6b2bd17c705b57d528bd1e7727` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/training-run.json` | 1455 | 2026-02-20 12:33:37 | `7ed7227b6a92914f914c062b7a16c440dac20a3030259fcc2dc041213a768222` |
| `logs/m7-retrain-2026-02-20T12-33-37-385Z/validation-report.json` | 798 | 2026-02-20 12:34:29 | `39b8e3c2470cd3e0faaa3c567922be9ef6942bcffbed9b61b6f48c7497d79c92` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/approval-record.json.template.json` | 327 | 2026-02-22 09:30:35 | `bbdaf7ae8296e8aa302acd99f1bc0657554fa5d8f6e3cc6715598de86d75804e` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/metrics.json` | 155 | 2026-02-22 09:30:31 | `c32de41ad5f3a66cf4d71c7ea1a698ae1f5c2913a1a9e92935f3384a47eed434` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/model-card.md` | 463 | 2026-02-22 09:30:31 | `2cae605dd11a8b81b8bca02f4b4321f07ff3e04a79d597c7da7311e33ff7f848` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/promotion-packet.json` | 698 | 2026-02-22 09:30:31 | `93a1462e97db23a8afd5f7615440f6ce47f3454f8a33df8a2c3400dae4d3b2d5` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/summary.md` | 511 | 2026-02-22 09:30:31 | `7662179b39721479e25cb3f36e377eb46a1f9fc4a9ab1e47f103649b9f4af0e4` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/training-run.json` | 1027 | 2026-02-22 09:30:31 | `ad100e2de64478a37b2aa68b7608560cf1be28cff64b8fd3901399f4b8222990` |
| `logs/m7-retrain-2026-02-22T09-30-31-385Z/validation-report.json.template.json` | 541 | 2026-02-22 09:30:35 | `9cea653a36ebf74f557f53a3b47e79fdcb7b532c7ff796a21b93c62089c2d71f` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/approval-record.json` | 324 | 2026-02-22 09:51:13 | `f856f5f67b13fbf39d64ab47971c9dcec775c68226124c5da637d2e5624ff9c3` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/metrics.json` | 431 | 2026-02-22 09:51:04 | `c6e81645d3b387294bdc7426e4932319dea7f47ee0605fee25ce44819e708930` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/model-card.md` | 486 | 2026-02-22 09:51:04 | `3484a25375c2d4a2f6e2bedcc5ebcb1c30e00da86ceca1f5a9a9da30ade79c47` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/promotion-packet.json` | 698 | 2026-02-22 09:51:04 | `719fe27a2507250f82d84ea7fc410d3f4d24df0f48eaa664b23c61e4e204cc6e` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/summary.md` | 520 | 2026-02-22 09:51:04 | `d2e555b723cf47b49eb824bb7ff33f28b5a9977d3888f0cb1bde35dc99d21198` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/training-run.json` | 1330 | 2026-02-22 09:51:04 | `7b122a86607093ae6a052678bbac38e864e9238e6fda14ee44eb630ac03e3a43` |
| `logs/m7-retrain-2026-02-22T09-51-04-418Z/validation-report.json` | 912 | 2026-02-22 09:51:13 | `530e88930ae7e664983eb737175c950e9c05249fc2d4ffbfd7500314fcc73404` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/approval-record.json` | 356 | 2026-02-23 11:10:33 | `d7148dcfb85eace6de8a355023dd2b86f64acbc1483310e5eb4a208fe45625d8` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/metrics.json` | 436 | 2026-02-23 11:10:33 | `81ce2088f61b152fcbfa751573c55af2bdf96ba90d1b6a0f26f84825625ab9ea` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/model-card.md` | 487 | 2026-02-23 11:10:33 | `e6431af14433c1180671bf188b7fb21230aa2cead421cff859a182a6fc449dc7` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/promotion-packet.json` | 698 | 2026-02-23 11:10:33 | `ed08bd7db5e3d30edec49405bb60b422894908f2c593e6873c02896005519603` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/summary.md` | 617 | 2026-02-23 11:10:33 | `154c24e0fcc276ab0d03f62b3b1d5f8bc797ca3ae2b117e2bd419bcd9ecd713d` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/training-run.json` | 1336 | 2026-02-23 11:10:33 | `61ce29f0da4e92e2826af634c836ce34c51d094fbcfb572fcd182034dfbf0e60` |
| `logs/m7-retrain-curated-validation-2026-02-23T08-10-32-002-03-00/validation-report.json` | 993 | 2026-02-23 11:10:33 | `54206bc181af438b9be48c47d947b90ec82ed093541b26ff8e8d800afb580e37` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/approval-record.json` | 268 | 2026-02-23 11:54:23 | `7a43e2c50e5ae429fa42521e46dcff566678eb49a7ce6592dd061ef5741aace9` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/metrics.json` | 305 | 2026-02-23 11:54:23 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/model-card.md` | 482 | 2026-02-23 11:54:23 | `aac7ab669c52e22962cef29808309c9b9903e084cfae39f4e0dd012a00a053ac` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/promotion-packet.json` | 698 | 2026-02-23 11:54:23 | `93de7babbc2649326aef6bc14434e8130bffeda1d57ebd82391a61f5e5218216` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/summary.md` | 561 | 2026-02-23 11:54:23 | `b0900d68032d5cea84349e256e6def66dd34e13535598ec305f5e6c04bd5a50c` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/training-run.json` | 1193 | 2026-02-23 11:54:23 | `057ebf808e2f89538fc62170a8d0cd12949c04ce25f71852efb92c162915cbae` |
| `logs/m7-retrain-sol-reentry-2026-02-23T11-54-23-106Z/validation-report.json` | 829 | 2026-02-23 11:54:23 | `c5b72c01389b8b760c18973d09da8c8dc84b05b769eadd58b6201e65fe7bc64d` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/approval-record.json` | 266 | 2026-02-23 11:50:29 | `9e017d94643eb87969e996911ba57819fa712269b76adbc53dfdb9ec4b0fb979` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/metrics.json` | 305 | 2026-02-23 11:50:08 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/model-card.md` | 482 | 2026-02-23 11:50:08 | `6b80b8af533e6096296e71a0a7d8b77014fc9ca09fa49c84d4e1e689764a2250` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/promotion-packet.json` | 698 | 2026-02-23 11:50:08 | `bc5c2f59ee1cfac974673e4c5f63d1533e23f49a4324217202eab71e7260c1e6` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/summary.md` | 553 | 2026-02-23 11:50:08 | `aa35e92b6adadf8f315c7b6d0d639fa73c907f673994be8b6571e5d182cc85f4` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/training-run.json` | 1193 | 2026-02-23 11:50:08 | `cf3e1a7541e04e887b5439600817bab4df966f252cf0369d546bebe4d555a052` |
| `logs/m7-retrain-sol-trial-2026-02-23T11-50-05-635Z/validation-report.json` | 809 | 2026-02-23 11:50:29 | `385fc8b13b7d566b5e2d81c5f2f2fe63e6abfe9e72eae097a9735bd47660c655` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/approval-record.json` | 345 | 2026-02-23 11:08:02 | `1b86a3e04a188640d9a47554361421f0b53ff21047936cc2c59c265d6bb67a90` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/metrics.json` | 554 | 2026-02-23 11:07:35 | `d76f25e8afd6b23e5b45e789bcb1b4bb5018967aeaca9b881665ce179b790cad` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/model-card.md` | 489 | 2026-02-23 11:07:35 | `53ab5f1c28f73d30f13b5dfa79f9969d3e63b3c84aa559da489c7a0d78fdddaf` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/promotion-packet.json` | 698 | 2026-02-23 11:07:35 | `dfc8984cab58d58e7a624bc639dc9be438ef3678c5a28b2dcdb24f9c3daafe88` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/summary.md` | 585 | 2026-02-23 11:07:35 | `d520abb80aa2cfb807b672bfb0d7dad80e70d3f930842527b82fa3045d9e1b4b` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/training-run.json` | 1466 | 2026-02-23 11:07:35 | `f191488738ef35517a5a107e7d508d932d12ae5b731bf6126c54b3e46740d18c` |
| `logs/m7-retrain-validation-2026-02-23T08-07-31-532-03-00/validation-report.json` | 976 | 2026-02-23 11:08:02 | `b3d2af8a344b49539038f8c2a9102ba865c40ab01ede85f06d3768d1d930498d` |
| `logs/m7-rollback-drill-2026-02-21T20-04-56-516Z/report.json` | 27835 | 2026-02-21 20:04:57 | `8573f1e97ae07eec27ec425f00830bd568254c2701e209f5d76882375a2067db` |
| `logs/m7-rollback-drill-2026-02-21T20-04-56-516Z/summary.md` | 745 | 2026-02-21 20:04:57 | `dea9458f7ca8c88ffa5b8442702008dc905ee453c7d837d4dbad7db018b13f17` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/dataset-curated/closed-trade-features.ndjson` | 53594 | 2026-02-23 12:00:03 | `b1035b5b8cc7e7009533b31d333f97339a0eb330d9fd8d36051d965d04862ec2` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/dataset-curated/dataset-manifest.json` | 1066 | 2026-02-23 12:00:03 | `f37f94d200549233f305ecb04dc96ba2d79b781e5321316ecef592433852570f` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/moderate/gate-result.json` | 560 | 2026-02-23 12:00:03 | `5f3e6747c9eb8b8ef4761339e41b3593d0efb404c3a603da2e5085f3abad9f6c` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/moderate/summary.md` | 183 | 2026-02-23 12:00:03 | `565e2f2aa608ef1934cdeada6e35d035f945ab47c6b33e578047b88864bfb993` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/moderate/walk-forward-report.json` | 1514 | 2026-02-23 12:00:03 | `0be1de7c7adde34927e90c4a0807f159aff62388a2ba5d49dd380db7f34da9bd` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/reintroduce/gate-result.json` | 524 | 2026-02-23 12:00:03 | `22c37643e7ab354446ac2e9dfab0cb3fefa32fb7476cca7078edbb1146832810` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/reintroduce/summary.md` | 165 | 2026-02-23 12:00:03 | `7592f208b54dce5f4c193b0f331dd0dd6d4ffb222ca48b9294a0a308c2eb6cad` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/reintroduce/walk-forward-report.json` | 1511 | 2026-02-23 12:00:03 | `a18be554f572ef59c5decf2f30d0383eec538d4c87f5ced7499cbab3e0c2a38f` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/retrain/approval-record.json` | 314 | 2026-02-23 12:00:03 | `c950e2a34ee7f873fe3111e67aaadafb6e1ed5d39dd987f793047cb920749250` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/retrain/metrics.json` | 305 | 2026-02-23 12:00:03 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/retrain/promotion-packet.json` | 698 | 2026-02-23 12:00:03 | `1901377d0b6becb83987f87b134da56c7e2149b8a28a6df6674298a496e91698` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/retrain/training-run.json` | 1193 | 2026-02-23 12:00:03 | `0bc735521a03357ba879d3c48f62684c5a77429608ebe53275eb32e4bd8cd5ab` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/retrain/validation-report.json` | 780 | 2026-02-23 12:00:03 | `7905eaf48ae50f584f98a904fd8f092caa5cf1d40b535b1dab31db8a8026d9c3` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/strict/gate-result.json` | 560 | 2026-02-23 12:00:03 | `24617026bbf88a82a5b3289f74953bed0c2a05f83049c2946a194a52892e93bc` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/strict/summary.md` | 176 | 2026-02-23 12:00:03 | `c8dbb31cc8aff82dae4dbe48b19d593ecf5e4b239ddd89659a0e1bb0830cd0fb` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/strict/walk-forward-report.json` | 1509 | 2026-02-23 12:00:03 | `16e1575100fbb70fb4862fc8014b03acf13513c560b3b51bc12a5b30f20f08ff` |
| `logs/m7-sol-reentry-2026-02-23T12-00-03-515Z/summary.md` | 899 | 2026-02-23 12:00:03 | `71bbf4b251804166af3226c4e82e949ae6dd439b2ca1c841fe05023550e3acf1` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/dataset-curated/closed-trade-features.ndjson` | 53594 | 2026-02-23 12:02:21 | `b1035b5b8cc7e7009533b31d333f97339a0eb330d9fd8d36051d965d04862ec2` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/dataset-curated/dataset-manifest.json` | 1066 | 2026-02-23 12:02:21 | `b81deaffea2c9a665d8c66fe33c9b201909af3c0e0776499eb9e82e174df6b98` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/moderate/gate-result.json` | 560 | 2026-02-23 12:02:21 | `d81772c037b2815e7db52b50a273ef7e98f67f95ca52fa0d7aa7a70e02f2dcb8` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/moderate/summary.md` | 183 | 2026-02-23 12:02:21 | `565e2f2aa608ef1934cdeada6e35d035f945ab47c6b33e578047b88864bfb993` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/moderate/walk-forward-report.json` | 1514 | 2026-02-23 12:02:21 | `9d03576d42c495bca1dc72d77bc0608f32f624c784b917705275713cd465dd46` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/reintroduce/gate-result.json` | 524 | 2026-02-23 12:02:21 | `ad2a8b6d56ab7dae241dd46dd0f7c0e397650d830e9cce611898bc6a5dfc5952` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/reintroduce/summary.md` | 165 | 2026-02-23 12:02:21 | `7592f208b54dce5f4c193b0f331dd0dd6d4ffb222ca48b9294a0a308c2eb6cad` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/reintroduce/walk-forward-report.json` | 1511 | 2026-02-23 12:02:21 | `f886406fd22bddb10702a4675b8e14d41a6f0bae9308bac41e2deefd2a62b000` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/retrain/approval-record.json` | 314 | 2026-02-23 12:02:21 | `20be1522803bf221762d9fc65af5143d66f647cf2651c0784828f281179ea4df` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/retrain/metrics.json` | 305 | 2026-02-23 12:02:21 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/retrain/promotion-packet.json` | 698 | 2026-02-23 12:02:21 | `aeebe772b57eb722e5cb54eef23795b60ad498209d667b19304db35532bd57e0` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/retrain/training-run.json` | 1193 | 2026-02-23 12:02:21 | `648a79604d4afee98576b7191ce8565f3284d442645aa493f5e736eac1697f31` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/retrain/validation-report.json` | 780 | 2026-02-23 12:02:21 | `0bb0a19ca7608d69d07a4b3db7832cda08f27f2727966e3bbc2908abaeffce15` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/strict/gate-result.json` | 560 | 2026-02-23 12:02:21 | `d9172a77cd4114052b2fa04f768c5aaa36e50926f9eafe56a89185209bf0e433` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/strict/summary.md` | 176 | 2026-02-23 12:02:21 | `c8dbb31cc8aff82dae4dbe48b19d593ecf5e4b239ddd89659a0e1bb0830cd0fb` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/strict/walk-forward-report.json` | 1509 | 2026-02-23 12:02:21 | `f6a9276197beb9438b65f1ec17100dc34d864337666edd14bb56cd3773ca850b` |
| `logs/m7-sol-reentry-2026-02-23T12-02-21-596Z/summary.md` | 953 | 2026-02-23 12:02:21 | `16e39aa1a5dedd36176ec0ba293064ab66c93acaa5d406a4a9737b5a0493ee41` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/dataset-curated/closed-trade-features.ndjson` | 53594 | 2026-02-23 12:02:28 | `b1035b5b8cc7e7009533b31d333f97339a0eb330d9fd8d36051d965d04862ec2` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/dataset-curated/dataset-manifest.json` | 1066 | 2026-02-23 12:02:28 | `4121d2e144dd09d5d54b2fefaa1061efe426e75d00f9013b99355bff5982fc3d` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/moderate/gate-result.json` | 560 | 2026-02-23 12:02:28 | `88d7aef11d6f92ea4b9bff9c8eb48bfd8730b6dddae3cbf9d7e74493cd38cf33` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/moderate/summary.md` | 183 | 2026-02-23 12:02:28 | `565e2f2aa608ef1934cdeada6e35d035f945ab47c6b33e578047b88864bfb993` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/moderate/walk-forward-report.json` | 1514 | 2026-02-23 12:02:28 | `ffcf195bbb04d01b03a86d82bcee6af0dcadcdbdc319e363620fc3933ee8aba9` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/reintroduce/gate-result.json` | 524 | 2026-02-23 12:02:28 | `d02b87322d3924395a77e2d58245e16b747be354c7be1d7fdf450ae0ea50adb0` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/reintroduce/summary.md` | 165 | 2026-02-23 12:02:28 | `7592f208b54dce5f4c193b0f331dd0dd6d4ffb222ca48b9294a0a308c2eb6cad` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/reintroduce/walk-forward-report.json` | 1511 | 2026-02-23 12:02:28 | `1e4268b63bfeb97a5c376f16de1c6350c17c93d59013f8edd522dc3c7d402820` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/retrain/approval-record.json` | 314 | 2026-02-23 12:02:28 | `365422fd13e7f735f9426e10f003ba99a321e22fb6cd442e400cdd8530d128f0` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/retrain/metrics.json` | 305 | 2026-02-23 12:02:28 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/retrain/promotion-packet.json` | 698 | 2026-02-23 12:02:28 | `81f1e75c19e57a05b2c0b138c9307e8d4355e7aba95436a51ea235d8428dc153` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/retrain/training-run.json` | 1193 | 2026-02-23 12:02:28 | `dd1677eb320e3447d9d874843b32fdca2bad4a5bd2b817fb2e7a27b503f3044d` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/retrain/validation-report.json` | 780 | 2026-02-23 12:02:28 | `b13baed5d628d08b0e0466548fa708f03885d5f983b8ce80f325d5876a37152b` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/strict/gate-result.json` | 560 | 2026-02-23 12:02:28 | `95716f046191a9d3db8b88dd36055b0a82e3b1527cfae00178ac79d7ff480578` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/strict/summary.md` | 176 | 2026-02-23 12:02:28 | `c8dbb31cc8aff82dae4dbe48b19d593ecf5e4b239ddd89659a0e1bb0830cd0fb` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/strict/walk-forward-report.json` | 1509 | 2026-02-23 12:02:28 | `79d1f5dafbe4f194276879475a044865f14289bff1b683d15dc0779ae5380e03` |
| `logs/m7-sol-reentry-2026-02-23T12-02-28-655Z/summary.md` | 949 | 2026-02-23 12:02:28 | `a66fe3bf36b6e66226bfea0fc4fd9b1e672d9b545b53283676fece543e5ab3c5` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/dataset-curated/closed-trade-features.ndjson` | 53594 | 2026-02-23 12:08:03 | `562a13565d92b692092d24b618def82b1187a3c1fe0d32cd41c6ac22bd297396` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/dataset-curated/dataset-manifest.json` | 1066 | 2026-02-23 12:08:03 | `c10fb4075ca25d3f15243144819f2acb45e81dc3c70113384c22153e6d51ddcb` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/moderate/gate-result.json` | 560 | 2026-02-23 12:08:03 | `d0ece7a1231f77b50413291a0acd975b60b5369409992d05744f7c879bceb4c0` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/moderate/summary.md` | 183 | 2026-02-23 12:08:03 | `565e2f2aa608ef1934cdeada6e35d035f945ab47c6b33e578047b88864bfb993` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/moderate/walk-forward-report.json` | 1514 | 2026-02-23 12:08:03 | `faecd230a291351386905972e532ed723379a8dd12624d23c7268bf6cde4c198` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/reintroduce/gate-result.json` | 524 | 2026-02-23 12:08:03 | `96c9a75919dfb622a2841a35a445a643702472dbb1218cf27acfa66069ce9680` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/reintroduce/summary.md` | 165 | 2026-02-23 12:08:03 | `7592f208b54dce5f4c193b0f331dd0dd6d4ffb222ca48b9294a0a308c2eb6cad` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/reintroduce/walk-forward-report.json` | 1511 | 2026-02-23 12:08:03 | `0208cb0b5b9bb321652075d27dc1a782e3040a9ffdf75b34d9afd3392d06fdc2` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/retrain/approval-record.json` | 314 | 2026-02-23 12:08:03 | `b1909b3dcb66364796c9312bc5aab9baa5cbb5968170e2051432ba66af1c683d` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/retrain/metrics.json` | 305 | 2026-02-23 12:08:03 | `3a4ff099fe703dc9f521ff107c29a62ebf3c6d0d5381ea82c9a3caff242ce137` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/retrain/promotion-packet.json` | 698 | 2026-02-23 12:08:03 | `96fe469058e1299cd26313c10eefa3975d677e6271db8e75dd1d7208ecfdd343` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/retrain/training-run.json` | 1193 | 2026-02-23 12:08:03 | `bd01a44dfeed45717eb371155b0258eeffd7a4100910e72fa68497caa7f7904c` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/retrain/validation-report.json` | 780 | 2026-02-23 12:08:03 | `5d013a067e74083d1013064ca914b0f0d007a8174e9f7144a9b0b39f4ff069a6` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/strict/gate-result.json` | 560 | 2026-02-23 12:08:03 | `b7350ff0950d7736cb11a12733a487a06297cd1178c61b9aef7c0b2e0e201f22` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/strict/summary.md` | 176 | 2026-02-23 12:08:03 | `c8dbb31cc8aff82dae4dbe48b19d593ecf5e4b239ddd89659a0e1bb0830cd0fb` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/strict/walk-forward-report.json` | 1509 | 2026-02-23 12:08:03 | `9eb0c7c6769b2bb3147bfdaef9645ac39adbe9b21e836c203f7ca96da38cc2ac` |
| `logs/m7-sol-reentry-2026-02-23T12-08-03-731Z/summary.md` | 935 | 2026-02-23 12:08:03 | `dbee5160ffa31623f55803acc557bd451c5188094e2531eed3d25d23c2918e9f` |
| `logs/m7-sol-reentry-summary-2026-02-23T11-54-23-106Z.md` | 564 | 2026-02-23 11:54:28 | `4ffe3acde6002b610e5498ff8ce7547805f5760ca632a609f5f7fb830ebdc220` |
| `logs/m7-walk-forward-2026-02-23T09-55-24-508Z/summary.md` | 452 | 2026-02-23 09:55:24 | `f620dfe451220b0db86764e35c4e842de3a1985d0724d0458dc53eeb6f33348e` |
| `logs/m7-walk-forward-2026-02-23T09-55-24-508Z/walk-forward-report.json` | 1762 | 2026-02-23 09:55:24 | `603bd40818257b3e78c47ed52b8ecf143cdf908ed90a6cbf6ff052123e16d6db` |
| `logs/m7-walk-forward-curated-validation-2026-02-23T08-10-32-002-03-00/summary.md` | 477 | 2026-02-23 11:10:33 | `284468c903b766710b6ff650c72deb5bacab4553e568b36d35826d93bdf4d157` |
| `logs/m7-walk-forward-curated-validation-2026-02-23T08-10-32-002-03-00/walk-forward-report.json` | 1534 | 2026-02-23 11:10:33 | `824138a69ec5604f9d7a0d228c82cc4a443f6de03c2c757fa4431149a75a8d28` |
| `logs/m7-walk-forward-sol-reentry-moderate-2026-02-23T11-54-23-106Z/summary.md` | 478 | 2026-02-23 11:54:26 | `776d72d5e9b11462f310237547ec06dcab42f0d72644a2d3d6cbf2211a8725e2` |
| `logs/m7-walk-forward-sol-reentry-moderate-2026-02-23T11-54-23-106Z/walk-forward-report.json` | 1514 | 2026-02-23 11:54:26 | `9bbf809db46de692827bd1fd36c90fafc733ec4a22a01191333aa6f22819b47a` |
| `logs/m7-walk-forward-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/summary.md` | 481 | 2026-02-23 11:54:27 | `7f557156714a0e28ab067558bef260346a4a6cc1d14bfd992a887d20eb7cb34a` |
| `logs/m7-walk-forward-sol-reentry-reintroduce-2026-02-23T11-54-23-106Z/walk-forward-report.json` | 1511 | 2026-02-23 11:54:27 | `635e926cf7463c4cc53172f87c4110eed5e04c2085f4354fd08207dc964ff9e6` |
| `logs/m7-walk-forward-sol-reentry-strict-2026-02-23T11-54-23-106Z/summary.md` | 471 | 2026-02-23 11:54:24 | `2c45b20ebabc3451b9c8044405fac2721d7325fbab140773426474e3f7ae7e2e` |
| `logs/m7-walk-forward-sol-reentry-strict-2026-02-23T11-54-23-106Z/walk-forward-report.json` | 1509 | 2026-02-23 11:54:24 | `cb5e1b51a2df4d5f1d8f5076cd3d92e63ad2c17938bc22581200b222809394e2` |
| `logs/m7-walk-forward-sol-trial-2026-02-23T11-50-05-635Z/summary.md` | 462 | 2026-02-23 11:50:09 | `603b2d1caf87f9b3bf46683d4de3544857e71db5a78b4fc1c25cb4e41c9a0e37` |
| `logs/m7-walk-forward-sol-trial-2026-02-23T11-50-05-635Z/walk-forward-report.json` | 1509 | 2026-02-23 11:50:09 | `2ba54d4bd76cc2cc72f465bde883bf799b7794bf24ce8dc2a77ce94f7a0fcd01` |
| `logs/m7-walk-forward-validation-2026-02-23T08-07-31-532-03-00/summary.md` | 469 | 2026-02-23 11:07:36 | `7147d12e9458212ed4d7de943dcb0a6a8db0ca6bb5d38822b460c3134e2a15ac` |
| `logs/m7-walk-forward-validation-2026-02-23T08-07-31-532-03-00/walk-forward-report.json` | 1537 | 2026-02-23 11:07:36 | `c2424b81fc51660e4b8c5427ed6f422db4235bf7893712823a959d5f37ae8494` |
| `logs/mc-server.err.log` | 40 | 2026-02-20 12:10:45 | `21454502b8590e3481d031ac1176aa84bd425c84897855c33042a8c5d234b827` |
| `logs/mc-server.out.log` | 0 | 2026-02-20 12:10:37 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/mission-alerts.jsonl` | 33472 | 2026-02-23 12:08:34 | `1fd1a6d9abf3193173d2816b9980df50cdc7c20fa1f7264aa7fd7ae043c148a1` |
| `logs/mission-control-server.err.log` | 1018 | 2026-02-18 16:48:58 | `d8612be586905cbd5e63c8d3fb277b383bb1d95ded1ab09b1d0bc81d1d41426f` |
| `logs/mission-control-server.out.log` | 0 | 2026-02-18 16:48:12 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/mission-events.jsonl` | 208 | 2026-02-16 17:35:42 | `53aca00c56fcb146948c23e537e0c20c4c98ed17c5c575bdf37ce8ff226f081d` |
| `logs/mission-events.sqlite` | 6004736 | 2026-02-23 11:38:33 | `495f5de2b173552bb0e6e2d14d68a222fd58a467d79ece828feb59f50c25ac94` |
| `logs/mission-events.sqlite-shm` | 32768 | 2026-02-23 11:07:32 | `034ef7b24a6d443d5688c858a792a17934519c5f7d1bdbc0d20b642ae406dc4d` |
| `logs/mission-events.sqlite-wal` | 5619712 | 2026-02-23 12:08:34 | `ce9e91cabc5a59ae62ab80487ce328d2feb0b1e11c77532ff36a40fc72ff07ad` |
| `logs/mission-ops.sqlite` | 495616 | 2026-02-23 12:08:06 | `a41afb29580a2b4b57f437cc15607d7c8bcd5a486e5d777a6b2b5e88d886d17c` |
| `logs/mission-ops.sqlite-shm` | 32768 | 2026-02-23 11:07:32 | `cef49a31ae98a2e179821edb8385b1f2bb9e5b25c9c3acd663392b4fb2e43d07` |
| `logs/mission-ops.sqlite-wal` | 4190072 | 2026-02-23 12:08:36 | `606eb9730d738c1d1146cded31ad90111d45c891d7fb6dffabb49aaf41fd47c6` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 1054 | 2026-02-17 14:06:49 | `5affbbeccef6f6dbf1a30e205218d368085c5ec6a63f0d2874c7807add0f45ad` |
| `logs/proposal.e2e.json` | 223 | 2026-02-17 13:49:59 | `0ac6472f8abac22d422519d12c7d2bc01d0929317571d5b99e02d7ec3f058241` |
| `logs/proposal-audit.jsonl` | 2206 | 2026-02-17 14:05:57 | `a01a41c415f3e3b70dac46612d748be485bfc9499be003736becd3dfbc0fab18` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `logs/session/mission-control-server.err.log` | 173 | 2026-02-22 12:50:05 | `a5139eb019dbef21adde1e569aa3c919bb1c0d5000af155b64295421c0338c2c` |
| `logs/session/mission-control-server.out.log` | 131788 | 2026-02-22 09:51:00 | `fcbff757182fc9190fbf8edd10f27ec189b9995b2b58b237e9998d2dce611df0` |
| `logs/tmp-test.js` | 22 | 2026-02-21 20:04:15 | `3e1c0b5275702e456d8206c48f042935af0962e9812061d756fb92ff9a35d1d7` |
| `package.json` | 3178 | 2026-02-23 11:59:46 | `4ebc9b4d5d416c788b2cdb7a5e6d8c49aff6decfcf9a2acfde94c8302a476e1e` |
| `package-lock.json` | 277570 | 2026-02-20 08:09:15 | `7db3b60a5eac8e05c32923b7661aee1644e77b7a40d94210599cf56c02215bd4` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 12346 | 2026-02-19 14:09:10 | `5a929ea129261fc85bf61d0351149712fe34d13130f7122060213cc0f679fc35` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 6696 | 2026-02-17 07:14:56 | `4e573bb98a29c93489025eb5e4c84cf988ffb74bcf46a9dea4854f10e78f3bef` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 96 | 2026-02-16 17:31:00 | `ec4236dd133b7a1ead687ecf23f68c9303b9d4ccf8952eeafeeb6729b6867613` |
| `packages/shared/src/mission-control.ts` | 8026 | 2026-02-20 09:14:40 | `1e3fb9ff684f1389942b9c8e3ee03d8e8e20673b4d5fe588c9db9bb06ccba0d0` |
| `packages/shared/src/schemas.ts` | 2193 | 2026-02-17 07:55:34 | `8a19fa162e37fb64c8fc51253c51d6f3af91901e54aab90f8f48aac7a17a4464` |
| `packages/shared/src/types.ts` | 1781 | 2026-02-17 07:55:30 | `083f186e533824813b24e7b71380c8ff0f0ee5dc8e891e88b5e84e9622b28d51` |
| `README.md` | 12938 | 2026-02-20 09:55:27 | `59a0d2b10fea3adeccaab10a1f03a79ff391d74543ef83d45abb44d8b3de1ee1` |
| `scripts/install-index-hooks.ps1` | 239 | 2026-02-16 07:42:01 | `2420afd0c3aca0b6bbf968754a814003dab3ee40f81410ea97137236162633ae` |
| `scripts/m5-evidence-rollup.ts` | 4031 | 2026-02-18 17:04:29 | `5bc20e5f33f17f442c1f7750082b8e6414d53bb72945c9e22ef3e301db15fcc5` |
| `scripts/m5-soak.ts` | 17551 | 2026-02-22 08:56:15 | `69dc4c0c8239003a8bd1646650dc0463392447947d82188f4aecef6b11923720` |
| `scripts/m6-acceptance-walkthrough.ts` | 7271 | 2026-02-19 08:04:40 | `51c7459811fd2d20203866a506f1ce7da7bd3bfd2e42d56b61c5292ccf21b56c` |
| `scripts/m7-dataset-curate.ts` | 3390 | 2026-02-23 11:10:11 | `1ed4c15e4f40b2a0b41ef3b7fc35d7e7fe90420874dbd9ab34e2ac10344060b3` |
| `scripts/m7-dataset-snapshot.ts` | 3841 | 2026-02-20 09:20:59 | `7d6a432522b46c5e3cebafdd7a3c38170aedc2391ee57e3accefa1d2e25af000` |
| `scripts/m7-gate-promotion.ts` | 6594 | 2026-02-23 09:53:27 | `7d4eb7036551628438cbf6fde9ac6d230a72d52ced44deb94a29cfb2812cb4fd` |
| `scripts/m7-retrain-offline.ts` | 4152 | 2026-02-20 09:21:19 | `77dc9d481b5a102d52f63dc95aaea8d9b5f5743e457b30badf3f5a0e7924a4e4` |
| `scripts/m7-rollback-drill.ts` | 7991 | 2026-02-21 20:04:51 | `c59f0cce63d6cfc42963a3b7aa0a695387cd17d756d1ac488190fc95bea6e52d` |
| `scripts/m7-sol-reentry-stages.ts` | 11777 | 2026-02-23 12:02:08 | `5a32c728aa65a88683cfff2e082f3750d7510dba9239541955133e026a2636db` |
| `scripts/m7-walk-forward.ts` | 4888 | 2026-02-23 09:53:12 | `a482b241afb7ec6e764776adf1fe83406ec70a8226323695516830408feec962` |
| `scripts/update-project-index.ps1` | 4280 | 2026-02-16 07:43:03 | `cfad26a7179677daccc8e102a741b3baa933bc3031ff7b523d4598079552e7f7` |
| `skills/architecture.md` | 957 | 2026-02-15 08:25:39 | `4cf99efbe8c8773c23996f9c38763fb7a40c0b9e9414fe1b802d99d129ecaba6` |
| `skills/backend-ws-contracts.md` | 1570 | 2026-02-16 17:27:45 | `467435c016b7605138a3f2dab7d08dbfffae2c74a6998bd1a690783f983f94a5` |
| `skills/logging-audit-replay.md` | 1063 | 2026-02-15 08:25:39 | `b43827ddfa91b28ed2af3798e776c71501b00c8c10aad6f0d62189a260b8aacc` |
| `skills/mission-control-ui-patterns.md` | 1748 | 2026-02-16 17:27:45 | `cb3afae190fc43c31aa70e38f4d12017a8fc825076392b1dbade365fc2313bb8` |
| `skills/node-dashboard-patterns.md` | 1160 | 2026-02-15 08:25:39 | `224457b49f502d7b8add9b0f825910c9a1f2d51462386d7af6b0c4ed9996f25d` |
| `skills/okx/okx-auth-signing.md` | 1383 | 2026-02-15 08:39:17 | `4d881d94c373d2ff0128c4f204511359a78f941af2ab393ba75c3a8592519817` |
| `skills/okx/okx-demo-vs-live.md` | 1025 | 2026-02-15 08:39:17 | `3d7175597fb49e3c7e12a174ee8e5316e19e10ff8bd9e6fc1aa6719ab19e3a0e` |
| `skills/okx/okx-overview.md` | 1279 | 2026-02-15 08:39:17 | `c88b73a17f16a9d725fc6985e75bc2cdd03d19aacadd7364d626529fb83878ae` |
| `skills/okx/okx-rate-limits-errors.md` | 1589 | 2026-02-15 08:39:17 | `65c77852d8187c1dbff0f3d31ff9f54dfa3e04bee27e98a791f931c1b175872a` |
| `skills/phase-delivery-playbook.md` | 1568 | 2026-02-16 17:27:45 | `20b4daa66eeeac9177ff3391067715c66cf11c6b2b8b6aeb54a6bac84b060b4e` |
| `skills/python-research-pipeline.md` | 1107 | 2026-02-15 08:25:39 | `84d4b710a9be689148a79dcf362fe2a3e9683132676744174d8b11c16907d044` |
| `skills/README.md` | 1733 | 2026-02-16 17:28:17 | `9b1b83838362590e0986b74c880b86ad74d6615a921f45b0bcd53bd26b625e38` |
| `skills/release-hardening.md` | 1580 | 2026-02-16 17:28:13 | `863813148acf4f2a749a16e0badcc9798a8fc4787b2ff0064f5c710c41a94f0a` |
| `skills/risk-gatekeeper.md` | 1202 | 2026-02-15 08:33:09 | `6462052a76b16f85ab789fda220cf54aedc08ffb6c5a2fa88a20e228bbef7026` |
| `skills/security-api-keys.md` | 1391 | 2026-02-15 08:39:17 | `f8aeac08d67b6e2c1c20105f36a6bf53c116fe37f4931201d3d2767d8fbd1019` |
| `skills/skill-factory-governor.md` | 1931 | 2026-02-20 07:58:28 | `6b0fa634aee381b6a67182e5ae4388e4bf9be0ca373fd875b5085837850d4b7e` |
| `skills/trading-oracle.md` | 6802 | 2026-02-17 17:34:57 | `68c2255d9cbe1c0e80c029e67681c443f534d48d4afa1a17fd48f0250f7f5aa8` |
| `skills/trading-safety-guardrails.md` | 1791 | 2026-02-16 17:28:13 | `ed67b0f044a073217bb74bb29af8e95b6f0335b9133529a77243dead127b2602` |
| `tests/approval-store.spec.ts` | 3377 | 2026-02-17 14:30:35 | `ca3e4b843582a91223fa49d4d4444ee21f2334203c708118b96f3b9ee3cf8447` |
| `tests/cli-validation.spec.ts` | 2761 | 2026-02-16 08:22:57 | `f469e8e4909db02465e4936662d21d60666afd70b11d9090860b0073edc7070c` |
| `tests/execution-service.spec.ts` | 9936 | 2026-02-17 07:59:05 | `2bf6a01146cf870afbdb8e2fa0f3d3cd71c5f7c038f49562d7155263b6a0c048` |
| `tests/fixtures/context.auto.json` | 295 | 2026-02-16 09:09:53 | `cb8a7e955df9d846f6dceafcb24a2d9e814fd28d5834d393c8554a383707ac2c` |
| `tests/fixtures/context.valid.json` | 295 | 2026-02-16 08:18:18 | `a9ebc8ee93233576c66d541f820ac5cfff2738fa155ea678a0ba23d609707c94` |
| `tests/fixtures/proposal.auto.json` | 223 | 2026-02-17 14:04:15 | `7a3dae283b32829fef51ad65b4b43d7d4870062ef2875c5a0a779a3ae0335c55` |
| `tests/fixtures/proposal.demo-check.json` | 190 | 2026-02-16 08:59:00 | `665aafb9ff642ef370fd47c5e6dec8c967dbe365ce6b4f51814f6d1e03b5a9a0` |
| `tests/fixtures/proposal.invalid.json` | 90 | 2026-02-16 08:23:00 | `20d3fb277c8e22dacf26ff109c0ea4fcdf0a2b751d2b20d1f57db9908c9a7739` |
| `tests/fixtures/proposal.valid.json` | 190 | 2026-02-16 08:18:13 | `732ac716730242de204e9e643b81f475ffd12befce0f99e805c9c5b37d3ab1ef` |
| `tests/human-approval.spec.ts` | 3281 | 2026-02-17 07:18:28 | `d93369b43d786b129f86a60d613e449b6a4e3ec1625fc7275bfcde00f035c11f` |
| `tests/m6-attribution-contract.spec.ts` | 8283 | 2026-02-19 08:02:25 | `7a5a95835fb228f1f1ae03cafde4b4105c1e2a67a6795f3f22f6c3885e8c6e15` |
| `tests/m7-learning-contract.spec.ts` | 12789 | 2026-02-23 11:01:49 | `7291190a95287fa044a9afbcc2873568f3cdf9068cfe91939059561c1e353bbf` |
| `tests/m7-promotion-gate.spec.ts` | 4207 | 2026-02-23 09:54:37 | `04ad4bdc53335a3de646f3d4ac635750f719667f62f17e8d1720833491bad273` |
| `tests/m7-research-pipeline.spec.ts` | 3604 | 2026-02-20 09:21:45 | `fe5a4fe02c8eb833c890732c9b7160bfa66b126281e8d1774b5a524ee35fe11f` |
| `tests/m7-walk-forward.spec.ts` | 2852 | 2026-02-23 09:55:00 | `cbb2eea3a8348fe112c5ed048135231532c6c1057c82f9e5c97f7d73adc224ee` |
| `tests/milestone3-integration.spec.ts` | 4772 | 2026-02-17 07:59:12 | `d5700ebca30526054e04606fe40fc092c9e23a2381bad3f41bbdd829f45dd02e` |
| `tests/mission-control-contract.spec.ts` | 56557 | 2026-02-21 20:12:27 | `b25874169a1b9c5ed830f27416c81f76fecf5790e75b47428e5795b9c69f0a4d` |
| `tests/mission-control-event-normalization.spec.ts` | 1145 | 2026-02-17 16:25:11 | `aa42516419d9d46030fbd74a0536920361c9d105ea9a2858b21e29cc4607c3e5` |
| `tests/mission-control-policy.spec.ts` | 895 | 2026-02-17 14:30:49 | `24e2f4cd0044527c2fea8c2fec8bb16f2c83fa46d3cf2afecb906f6a3aba47cf` |
| `tests/mission-control-runtime.spec.ts` | 695 | 2026-02-16 17:33:52 | `aefbdd2825497fc8d9411989202274238d06235796b100a6c62bb682d9975219` |
| `tests/okx-demo-adapter.spec.ts` | 8264 | 2026-02-19 14:09:19 | `d48c3a732c7233d46a1564470ebd42949bcfe43bb63b5fbf820f9cc6709bb79d` |
| `tests/proposal-helper.spec.ts` | 2442 | 2026-02-16 09:02:04 | `4a3010d8af6acac630ff69c2f7bd75227d2f5ddb42b377ca49735cd9bf59a8c6` |
| `tests/reconciliation.spec.ts` | 3445 | 2026-02-16 09:10:16 | `94d83a0fb4c1bb0ffece49834295fa4cdc4b9ef027abd74fa5f1ad4c4ac06f99` |
| `tests/risk-gatekeeper.property.spec.ts` | 3603 | 2026-02-17 07:13:03 | `513d72fca85d8371bca0a4954b70b43848d787abca00f18bf15af993bb4c9bfd` |
| `tests/risk-gatekeeper.spec.ts` | 6690 | 2026-02-17 07:13:17 | `3c88b946823f43129f0a472b38972600afbec9cf67574bbd97cd00c75cf7d126` |
| `tests/TEST_PLAN.md` | 2553 | 2026-02-16 08:16:15 | `8cc0e2a87f4e729d9d83167f38dfac40fc08c469d21234055ea01c01f25d3834` |
| `tests/worker-manager.spec.ts` | 3839 | 2026-02-23 11:49:29 | `0d7c5a63938684b4f2c04f462383f4a391b435a985017a0d40426861224f5d6e` |
| `tests/worker-symbol-quality-gate.spec.ts` | 3284 | 2026-02-23 11:53:52 | `d2018d4df82e2de7363305dc3782e9e9bc4d0f2fe6f60d019c0007a92a00ad35` |
| `tsconfig.json` | 452 | 2026-02-16 17:07:09 | `d6331a640070d8c030998b7ac27dfd1348069048489d62376e14e587e0674822` |
| `tsc-trace.log` | 1563480 | 2026-02-16 08:27:36 | `5854404d1a9ff8ebe0daf5c754056ec0343820a4b5c60aa36b81c6f8706c1dac` |
| `vitest.config.ts` | 593 | 2026-02-20 08:11:10 | `ada31733d4abca90f4a3a8bd871814f4f84d84f7194b63c9b588e4226dd0f19e` |
