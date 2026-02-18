# Project Index

Generated: 2026-02-18 17:31:55 UTC

## Summary
- Root: `.`
- Directories indexed: 88
- Files indexed: 269
- Exclusions: .git, .idea, node_modules, dist, build, coverage, .venv, venv, __pycache__, .pytest_cache

## Tree
```text
- .
  - .githooks/
    - post-checkout
    - post-merge
    - pre-commit
  - apps/
    - dashboard/
      - src/
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
      - dist/
        - assets/
          - index-BBlSDNAE.css
          - index-DvaL7a5O.js
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
      - reconciliation-drift-circuit.md
    - decisions.md
    - deep-research-report.md
    - incident-taxonomy-and-slo.md
    - learning-report.md
    - m5-soak-plan.md
    - milestone-3-completion-report.md
    - milestone-3-invariants.md
    - roadmap.md
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
    - context.e2e.json
    - local-terminal.err.log
    - local-terminal.out.log
    - local-terminal.pid
    - m5-evidence-server.err.log
    - m5-evidence-server.out.log
    - m5-evidence-server.pid
    - m5-soak-server.err.log
    - m5-soak-server.out.log
    - m5-soak-server.pid
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
  - .env
  - .env.example
  - .gitattributes
  - .gitignore
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
| `.gitignore` | 385 | 2026-02-15 08:24:52 | `b0e963bbe4731fbadd53f9fb4519b2dadc110279778dcfaecc695d528a052122` |
| `apps/dashboard/package.json` | 388 | 2026-02-16 17:34:55 | `279db4746ec4b34e0b80a6a470f706141dca3b820764d6ce38d18e98e1ee24c1` |
| `apps/dashboard/src/cli.ts` | 2739 | 2026-02-16 08:22:42 | `65b65600773088fa34d56c25abb0ee54c99647f1afdc11f148b009391a385b15` |
| `apps/dashboard/src/cli-validation.ts` | 1532 | 2026-02-16 08:22:27 | `1d7bd77d440d0ac9d265c556515fe93879d76ac8b4e473074911b4e0da2dac27` |
| `apps/dashboard/src/env-loader.ts` | 1576 | 2026-02-18 13:10:32 | `06a98ddf889b8648e26cddc5098e58a88f457ab6280d205aeec3fecc01756d8d` |
| `apps/dashboard/src/execution-service.ts` | 10605 | 2026-02-17 08:11:53 | `e722a434d3470c41b11581df8658183f1e7c4fdcc8528653651179d919405275` |
| `apps/dashboard/src/human-approval.ts` | 2802 | 2026-02-17 07:18:23 | `33af47ee9cf61e08a7652541b8a55ae28ce485c4ec68182d797ef9ef8d1da6d5` |
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
| `apps/dashboard/src/mission-control/sqlite-ops-store.ts` | 19330 | 2026-02-18 16:51:18 | `3398179bb8ac94ec6f705aa3eaf0ce89957b2a3cfe6183bee41eb33e1f476435` |
| `apps/dashboard/src/mission-control/worker-manager.ts` | 7187 | 2026-02-17 14:43:08 | `11daaf642e071ead8a3c3c88dc99ca85a10fd218221007a054f5c09925b28bc4` |
| `apps/dashboard/src/mission-control-server.ts` | 106896 | 2026-02-18 17:10:58 | `7e3d3ec9616059b5413d4d4f3fed56087ad37ff286c9296b956c8769b0d3482c` |
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
| `apps/mission-control/dist/assets/index-BBlSDNAE.css` | 14374 | 2026-02-17 19:34:19 | `62e19ce6ef5220755ee0bd2ecebe77f35e606a973bc08f74e0db425a9ed99b7e` |
| `apps/mission-control/dist/assets/index-DvaL7a5O.js` | 268863 | 2026-02-17 19:34:19 | `a43a70f3b2e7dd7b401da1405f778c15df6c186ba092a97de7d2a23eb823e724` |
| `apps/mission-control/dist/index.html` | 408 | 2026-02-17 19:34:19 | `aa4a74175bd24dcd6af13572d062801d369ccaf293b3e45cd0f6bce265ed680e` |
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
| `apps/mission-control/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 469 | 2026-02-17 19:32:40 | `bb3c3558ef9b3c62175874327b47ae23b1cdfb65b1f91e8885fc7e20e268c143` |
| `apps/mission-control/package.json` | 669 | 2026-02-16 17:42:43 | `3024c620c459bc2e3913d4089b1595f968279f16f76d94c51d93ade2b841ce8e` |
| `apps/mission-control/README.md` | 5011 | 2026-02-17 13:32:41 | `8a2923353fdf2206681aa99dde2fdb85ab98505b108c85766f90d9f3c9a11c14` |
| `apps/mission-control/src/api/BotApiClient.ts` | 3138 | 2026-02-17 19:27:12 | `5a26984cedd2cd6caa390b84805fc0ff7437914e8ff9c183ad806614785eded7` |
| `apps/mission-control/src/api/LiveBotApiClient.ts` | 18198 | 2026-02-17 19:27:19 | `4d827589ee6283b1d04b8667ae482ef265a4d00f921d95a7a6cf8313edc5c9fb` |
| `apps/mission-control/src/api/MockBotApiClient.ts` | 17897 | 2026-02-17 19:27:28 | `6e6c00d05b4f38c80c4fa0d20a125ff697be2806953f842631496e481373f0e2` |
| `apps/mission-control/src/App.tsx` | 30199 | 2026-02-17 19:29:35 | `4e8f82525869c28ade0e6620cc29ae1e3fc180098413aafeb819bb85bef55e43` |
| `apps/mission-control/src/components/AlertsPanel.tsx` | 3632 | 2026-02-17 16:06:34 | `792a42567de09e706d2b5098a8612e178d6aa58bd9ad5beb1c9fb064d0e26a89` |
| `apps/mission-control/src/components/ApprovalsPanel.tsx` | 4599 | 2026-02-17 16:33:52 | `d2147ce924654de3c6c36aab79043f1088419978e1bfb0772984278856d775b6` |
| `apps/mission-control/src/components/AuditTimeline.tsx` | 1307 | 2026-02-16 17:05:08 | `4b7dce32b967dd32649ec3395eefc00800bda128404c5335da450528aaa3b6ea` |
| `apps/mission-control/src/components/AutonomyPanel.tsx` | 6226 | 2026-02-17 17:59:53 | `62071ac8edd1e5f6f1ebcdaffec30792017f49c53297770e985d313eea010de3` |
| `apps/mission-control/src/components/BotStatusCard.tsx` | 1480 | 2026-02-16 17:04:22 | `8e20b77c5543d8d4d8d2656fe82eae10c976b9a105ee5062d172db5c6099fadf` |
| `apps/mission-control/src/components/ControlDeck.tsx` | 1610 | 2026-02-16 17:04:22 | `eb3c9bc99165976a7ecaa3dcb7489e336df8a315d8dbf908b97ad32a17afa159` |
| `apps/mission-control/src/components/DemoReadinessCard.tsx` | 1532 | 2026-02-17 15:49:47 | `183b6da47182e40ab56c2cb19606758b719aec344c5645acc1bdcdaf1fd2ebef` |
| `apps/mission-control/src/components/EventStream.tsx` | 7034 | 2026-02-17 13:15:12 | `043b3b5fd5e1e0eb83f7cccf9f1471e21215a12f3d03d88e77c64c56c62a4766` |
| `apps/mission-control/src/components/IncidentsPanel.tsx` | 2396 | 2026-02-17 08:10:58 | `4e11c8d386260c57ce786608900d3b2a41a71f969a605ae3daae7523efb951b7` |
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
| `apps/mission-control/src/state/useDashboardData.ts` | 9522 | 2026-02-17 19:27:39 | `f4babebe3d8553923cb9a2dcfdddbfd8352a0a18c4e26e59f3797a47a746071b` |
| `apps/mission-control/src/styles.css` | 18198 | 2026-02-17 19:29:56 | `0260f7ce6572cf4e2a1900130e06daea0833cf2f7efc8f58ea3b4a86d22a6067` |
| `apps/mission-control/src/test/control-availability.spec.ts` | 628 | 2026-02-16 17:06:56 | `f19d2b619f4bf956bb0e9763be060fa3c11f02de6f6e292d881fa53ef0d39560` |
| `apps/mission-control/src/test/event-filters.spec.ts` | 1221 | 2026-02-16 17:06:56 | `e39b0758d48483a9fe3d35d7302cc60d33a48c46d1ed523f2d76534b88a3a8a5` |
| `apps/mission-control/src/test/event-stream-virtualization.spec.ts` | 3099 | 2026-02-17 13:19:27 | `27a4d0b136cc8cf9078a26ff9bea052581d17865f0038d66e23bb3d3afc46ed5` |
| `apps/mission-control/src/test/portfolio-orders-panel.spec.ts` | 3929 | 2026-02-17 17:14:02 | `7420d229b5742bfaf04196343bf1a06af145c35638804bbfd698aa35c995de80` |
| `apps/mission-control/src/test/role-gating.spec.ts` | 535 | 2026-02-16 17:06:56 | `ca39f817f2980ceac531cd3d4fffd1a2fff448b8e5ea742ea406fa205fe025e4` |
| `apps/mission-control/src/test/setup.ts` | 44 | 2026-02-16 17:06:56 | `60aa525f7ffa6bfd3045d22710d4eeef3a5ff2074ecc3dbcef99374badebad17` |
| `apps/mission-control/src/theme.ts` | 692 | 2026-02-16 17:02:33 | `dc8c55efbfffe4573575285c142021e013f38c985a02cba371af5b785917c7a3` |
| `apps/mission-control/src/types.ts` | 2035 | 2026-02-17 19:27:08 | `0da017b17a8491c92e267cb87e170f631afc82cb58e5169b3e3b9f128edfd094` |
| `apps/mission-control/tsconfig.json` | 393 | 2026-02-16 17:43:04 | `11b5b470f0b39ee4262c5e0eded1137103c0bdd16970fcd1c353c403c2eb1b28` |
| `apps/mission-control/vite.config.ts` | 136 | 2026-02-16 17:02:09 | `d2d053ba4043a83d1a93e2c22a7aeb72b67535791d5113e6bfe843335439e5ed` |
| `apps/mission-control/vitest.config.ts` | 283 | 2026-02-16 17:02:09 | `e4fe2d7c27ea8c681ebbabaf1f9a363bb1bd79c6f997a1bf565741bee6de4163` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/incident-taxonomy-and-slo.md` | 999 | 2026-02-17 08:14:36 | `62ed677505f66b742d92d9697a651d6cc5c986b76ba56435fa4a7092e4285a73` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/m5-soak-plan.md` | 2634 | 2026-02-17 19:41:37 | `31fe93e4063a501f85805ae545fcc034c9d26c36b82cc5e82c6890ade9533340` |
| `docs/milestone-3-completion-report.md` | 2402 | 2026-02-17 07:19:51 | `5ea39346e2dcf983ee4e36d81321851c9400b014910c8a395372108d0442225e` |
| `docs/milestone-3-invariants.md` | 2457 | 2026-02-17 07:18:59 | `30e964d5ca026aa78c43971b8c828f0f8a5549348b6e7139ce68cd6ac713d8ea` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 8165 | 2026-02-17 19:34:06 | `d2a76a8f3c92f738e2cd9d076eb619ccc18bca6b648f1a7f01d1313ec6b66000` |
| `docs/runbooks/approval-governance.md` | 511 | 2026-02-17 08:14:21 | `22173a75980107cd50ea20e20026edc797b638ddca01af77054dc59c4998e7a0` |
| `docs/runbooks/control-plane-incident.md` | 2732 | 2026-02-17 13:33:00 | `00a6a6aae859f6b82d31d5c44d6d823544d2aafdc5064d958f4aa99cc768f421` |
| `docs/runbooks/exchange-reliability.md` | 508 | 2026-02-17 08:14:36 | `05b52676536a6fe45d01f85e54778cfe30239fb313f6e8fff7146f813b22e40e` |
| `docs/runbooks/freshness-guard.md` | 612 | 2026-02-17 08:14:21 | `9b34580d9ee2080fe59c635ed4a4fe675401c29d8ed318d785957ca2efb0d8e4` |
| `docs/runbooks/reconciliation-drift-circuit.md` | 660 | 2026-02-17 08:14:21 | `e1c20250b36afbd059c08da1dc10747313821972de49feae9febdb22f0ae6217` |
| `docs/ui-prompts.md` | 16045 | 2026-02-16 17:00:33 | `de5e884a5d4fc1f5b340efe9bc28adfcb313ccee16d4e9136b1c73818e832c3c` |
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
| `logs/m5-soak-server.err.log` | 169 | 2026-02-17 18:42:44 | `fa64696fa0e0487cf2497c8ef8645d15f8f021577b9dcc75dc0b8943cd360497` |
| `logs/m5-soak-server.out.log` | 114987 | 2026-02-17 19:32:59 | `91fb8e50154c0f85163c0ba270172e8c9796b25692478ea9a775cce34e145d47` |
| `logs/m5-soak-server.pid` | 7 | 2026-02-17 18:42:43 | `9a0cf3e80acd3cc81bd7851fb0ca2533c0c6963c0f61013bd8786a31d8c5dd0a` |
| `logs/mission-alerts.jsonl` | 5027 | 2026-02-18 17:10:12 | `dce3b0561bd46fbccb2417af8db37c38596fe5e8a381f1a4c8082829b89295b2` |
| `logs/mission-control-server.err.log` | 1018 | 2026-02-18 16:48:58 | `d8612be586905cbd5e63c8d3fb277b383bb1d95ded1ab09b1d0bc81d1d41426f` |
| `logs/mission-control-server.out.log` | 0 | 2026-02-18 16:48:12 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `logs/mission-events.jsonl` | 208 | 2026-02-16 17:35:42 | `53aca00c56fcb146948c23e537e0c20c4c98ed17c5c575bdf37ce8ff226f081d` |
| `logs/mission-events.sqlite` | 5615616 | 2026-02-18 17:08:48 | `9f8c6e9cbbe913c380a11e7c6d34b02a7a63a0b8329bc916505fc329607a2f00` |
| `logs/mission-events.sqlite-shm` | 32768 | 2026-02-18 17:11:22 | `0cd1243135574a1bd49309fd5718498819bc7f1aa000fc38e35ec5228f435f90` |
| `logs/mission-events.sqlite-wal` | 4857512 | 2026-02-18 17:11:23 | `ff7dd658fbe0d45d78fccbbfce61820790ce8ef8c9c31a54411618d273d5e87d` |
| `logs/mission-ops.sqlite` | 282624 | 2026-02-18 17:11:23 | `d8f78d0cae9722daef8bab7cc0777416171ddee5e7a8227c961883b06258ff5e` |
| `logs/mission-ops.sqlite-shm` | 32768 | 2026-02-18 17:11:22 | `acf14711533a4e50a5c975dc553c7307462dd63c3ab2a05a33b923c0c6e833c6` |
| `logs/mission-ops.sqlite-wal` | 4152992 | 2026-02-18 17:11:23 | `8cf66792112d0930fe7cbb593c03ed72e37fdfe037b98deaaaf637f5721887fb` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 1054 | 2026-02-17 14:06:49 | `5affbbeccef6f6dbf1a30e205218d368085c5ec6a63f0d2874c7807add0f45ad` |
| `logs/proposal.e2e.json` | 223 | 2026-02-17 13:49:59 | `0ac6472f8abac22d422519d12c7d2bc01d0929317571d5b99e02d7ec3f058241` |
| `logs/proposal-audit.jsonl` | 2206 | 2026-02-17 14:05:57 | `a01a41c415f3e3b70dac46612d748be485bfc9499be003736becd3dfbc0fab18` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `package.json` | 1801 | 2026-02-18 12:55:18 | `53baab2a767506a3e76a882853da944fef55ebb86ce9fcfd979cbd44dd137897` |
| `package-lock.json` | 173178 | 2026-02-17 07:15:39 | `c916b3cea1936f49535bca744ec4bc55e6a7de247399f57d756595dbd1744b50` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 12156 | 2026-02-18 15:03:49 | `608e9716d1a9ac230aed0afe11f6b4b6319bca43c0c9c1ac1f7c360e473a990d` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 6696 | 2026-02-17 07:14:56 | `4e573bb98a29c93489025eb5e4c84cf988ffb74bcf46a9dea4854f10e78f3bef` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 96 | 2026-02-16 17:31:00 | `ec4236dd133b7a1ead687ecf23f68c9303b9d4ccf8952eeafeeb6729b6867613` |
| `packages/shared/src/mission-control.ts` | 7055 | 2026-02-17 16:55:23 | `c37f2e85d48d58f4c8d209a8b549e5adda2d3711ce4476e96f86c5bc8ec0293b` |
| `packages/shared/src/schemas.ts` | 2193 | 2026-02-17 07:55:34 | `8a19fa162e37fb64c8fc51253c51d6f3af91901e54aab90f8f48aac7a17a4464` |
| `packages/shared/src/types.ts` | 1781 | 2026-02-17 07:55:30 | `083f186e533824813b24e7b71380c8ff0f0ee5dc8e891e88b5e84e9622b28d51` |
| `README.md` | 12268 | 2026-02-17 19:34:11 | `452a22f28abfb930a47f22af8ee9dca483ec006512c9a6fbd4606a3a105a7b41` |
| `scripts/install-index-hooks.ps1` | 239 | 2026-02-16 07:42:01 | `2420afd0c3aca0b6bbf968754a814003dab3ee40f81410ea97137236162633ae` |
| `scripts/m5-evidence-rollup.ts` | 4031 | 2026-02-18 17:04:29 | `5bc20e5f33f17f442c1f7750082b8e6414d53bb72945c9e22ef3e301db15fcc5` |
| `scripts/m5-soak.ts` | 17345 | 2026-02-18 16:53:09 | `cc52b2a43292c04ff0fcfafa3b2b76762ef810d0fc3d24d90377d61feae07f74` |
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
| `skills/skill-factory-governor.md` | 1765 | 2026-02-16 17:28:13 | `1f722d01f48a8bc02ce8365a7d973769ee0479175e029a4edde41c9ad7708e2d` |
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
| `tests/milestone3-integration.spec.ts` | 4772 | 2026-02-17 07:59:12 | `d5700ebca30526054e04606fe40fc092c9e23a2381bad3f41bbdd829f45dd02e` |
| `tests/mission-control-contract.spec.ts` | 27555 | 2026-02-17 19:32:19 | `c80a703a2bcdb89f4f5eee89ddaef7a5486cb8641532fc0c3c315b02ab71a916` |
| `tests/mission-control-event-normalization.spec.ts` | 1145 | 2026-02-17 16:25:11 | `aa42516419d9d46030fbd74a0536920361c9d105ea9a2858b21e29cc4607c3e5` |
| `tests/mission-control-policy.spec.ts` | 895 | 2026-02-17 14:30:49 | `24e2f4cd0044527c2fea8c2fec8bb16f2c83fa46d3cf2afecb906f6a3aba47cf` |
| `tests/mission-control-runtime.spec.ts` | 695 | 2026-02-16 17:33:52 | `aefbdd2825497fc8d9411989202274238d06235796b100a6c62bb682d9975219` |
| `tests/okx-demo-adapter.spec.ts` | 7058 | 2026-02-18 12:45:42 | `6b8c8a971b8b13b8bd598145f83c3ab6816d4948fc7cb097477498ae05b21a0c` |
| `tests/proposal-helper.spec.ts` | 2442 | 2026-02-16 09:02:04 | `4a3010d8af6acac630ff69c2f7bd75227d2f5ddb42b377ca49735cd9bf59a8c6` |
| `tests/reconciliation.spec.ts` | 3445 | 2026-02-16 09:10:16 | `94d83a0fb4c1bb0ffece49834295fa4cdc4b9ef027abd74fa5f1ad4c4ac06f99` |
| `tests/risk-gatekeeper.property.spec.ts` | 3603 | 2026-02-17 07:13:03 | `513d72fca85d8371bca0a4954b70b43848d787abca00f18bf15af993bb4c9bfd` |
| `tests/risk-gatekeeper.spec.ts` | 6690 | 2026-02-17 07:13:17 | `3c88b946823f43129f0a472b38972600afbec9cf67574bbd97cd00c75cf7d126` |
| `tests/TEST_PLAN.md` | 2553 | 2026-02-16 08:16:15 | `8cc0e2a87f4e729d9d83167f38dfac40fc08c469d21234055ea01c01f25d3834` |
| `tsconfig.json` | 452 | 2026-02-16 17:07:09 | `d6331a640070d8c030998b7ac27dfd1348069048489d62376e14e587e0674822` |
| `tsc-trace.log` | 1563480 | 2026-02-16 08:27:36 | `5854404d1a9ff8ebe0daf5c754056ec0343820a4b5c60aa36b81c6f8706c1dac` |
| `vitest.config.ts` | 200 | 2026-02-16 08:14:21 | `55096e8f7b13a8289ea7dd5999df2345c120c12bea1cad31b82b567003446717` |
