# Project Index

Generated: 2026-02-17 15:51:15 UTC

## Summary
- Root: `.`
- Directories indexed: 39
- Files indexed: 177
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
          - index-Ci88kzgj.css
          - index-DNALGwVC.js
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
          - BotStatusCard.tsx
          - ControlDeck.tsx
          - DemoReadinessCard.tsx
          - EventStream.tsx
          - IncidentsPanel.tsx
          - LogsPanel.tsx
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
    - milestone-3-completion-report.md
    - milestone-3-invariants.md
    - roadmap.md
    - ui-prompts.md
  - logs/
    - context.e2e.json
    - mission-alerts.jsonl
    - mission-events.jsonl
    - mission-events.sqlite
    - mission-ops.sqlite
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
| `.env` | 1199 | 2026-02-17 13:49:31 | `6fd5a377672287fe2da194c1b726f744cd8a7adea6d9bfac555f210c66f992ec` |
| `.env.example` | 1147 | 2026-02-16 09:14:04 | `333a1907e86732a7e68611297f62697c34acc0a38383536aa1a4f654dad59179` |
| `.gitattributes` | 24 | 2026-02-16 07:43:43 | `6fda4653ef71808abc2eb5e88b7cf1ec9912e800d3bad13d3b4f46abc8d6f7ea` |
| `.githooks/post-checkout` | 243 | 2026-02-16 07:41:58 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/post-merge` | 243 | 2026-02-16 07:41:54 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/pre-commit` | 274 | 2026-02-16 07:41:51 | `9a68a1a9e1b68e7ea8f44c5e4368bae6eafc89ad6e928a2d68cc2113c6812339` |
| `.gitignore` | 385 | 2026-02-15 08:24:52 | `b0e963bbe4731fbadd53f9fb4519b2dadc110279778dcfaecc695d528a052122` |
| `apps/dashboard/package.json` | 388 | 2026-02-16 17:34:55 | `279db4746ec4b34e0b80a6a470f706141dca3b820764d6ce38d18e98e1ee24c1` |
| `apps/dashboard/src/cli.ts` | 2739 | 2026-02-16 08:22:42 | `65b65600773088fa34d56c25abb0ee54c99647f1afdc11f148b009391a385b15` |
| `apps/dashboard/src/cli-validation.ts` | 1532 | 2026-02-16 08:22:27 | `1d7bd77d440d0ac9d265c556515fe93879d76ac8b4e473074911b4e0da2dac27` |
| `apps/dashboard/src/env-loader.ts` | 1176 | 2026-02-17 14:03:18 | `5285c37f9dbd4f294f6f38cff759d03c06356353338bb0f4f4475910f428029a` |
| `apps/dashboard/src/execution-service.ts` | 10605 | 2026-02-17 08:11:53 | `e722a434d3470c41b11581df8658183f1e7c4fdcc8528653651179d919405275` |
| `apps/dashboard/src/human-approval.ts` | 2802 | 2026-02-17 07:18:23 | `33af47ee9cf61e08a7652541b8a55ae28ce485c4ec68182d797ef9ef8d1da6d5` |
| `apps/dashboard/src/lifecycle-store.ts` | 1135 | 2026-02-16 09:06:05 | `d836bad7d35bb5ba19d65b4a9625bb40838261f599332bae7bcfc80d30dda38d` |
| `apps/dashboard/src/mission-control/approval-store.ts` | 4203 | 2026-02-17 14:26:17 | `75f20d521508f8339f975de05709817666af7148bcf228fde08c4195c42e5bee` |
| `apps/dashboard/src/mission-control/auth.ts` | 3410 | 2026-02-17 08:23:16 | `67ed07c06224b04b7e6ff2fde2cff66e0da5f221f2d96cc7f4e8e80bed6d0229` |
| `apps/dashboard/src/mission-control/event-bus.ts` | 437 | 2026-02-16 17:31:37 | `c3ecaad332d8fb3f15223daf611846d01487b2561d971072b9dc3593434b4354` |
| `apps/dashboard/src/mission-control/event-factory.ts` | 512 | 2026-02-16 17:31:37 | `9e03c058e7a01ba7c791df03d6d4aae88470903d0987565949557824c8524553` |
| `apps/dashboard/src/mission-control/jsonl-alert-store.ts` | 2663 | 2026-02-17 07:50:14 | `c68ed8b2084e7f915f6c9473ccb8dd766d08503ffe4b33b2bd0fe303b6127bce` |
| `apps/dashboard/src/mission-control/jsonl-event-store.ts` | 2000 | 2026-02-16 17:38:27 | `19326a5855984e101e777c1daa80644cf4110b988310b6ade897177c2c13a23c` |
| `apps/dashboard/src/mission-control/policy.ts` | 1232 | 2026-02-17 14:26:07 | `1b6a895a3a32f06647b8576d38fb91b680d69674b0e03564b2a5bb1601f544cb` |
| `apps/dashboard/src/mission-control/rate-limit.ts` | 785 | 2026-02-16 17:31:55 | `0f947e591afbb854c2233d260a6734f7228125ff124baa5d24dc7cb336d6da06` |
| `apps/dashboard/src/mission-control/runtime-events.ts` | 1463 | 2026-02-16 17:32:25 | `e5a3f33b7f5ef9570fff92188ff47b76643468c02e5122f095460dfc5bb78c3f` |
| `apps/dashboard/src/mission-control/runtime-lifecycle-manager.ts` | 5209 | 2026-02-17 14:26:35 | `e8b4b0336af1856789874dce668ef4abae4bc79127c703500915efb11e1be9ba` |
| `apps/dashboard/src/mission-control/sqlite-event-store.ts` | 4482 | 2026-02-17 08:30:33 | `143e5704381e95a57c3a955490cb96b7828f205366a59b6dd2e5f4cc27744d9f` |
| `apps/dashboard/src/mission-control/sqlite-ops-store.ts` | 11651 | 2026-02-17 08:31:45 | `4de6d197acd7a319e8279541f78a8b06a7e23cdf465629eb8d510b6ca0047b95` |
| `apps/dashboard/src/mission-control/worker-manager.ts` | 7187 | 2026-02-17 14:43:08 | `11daaf642e071ead8a3c3c88dc99ca85a10fd218221007a054f5c09925b28bc4` |
| `apps/dashboard/src/mission-control-server.ts` | 54279 | 2026-02-17 14:51:50 | `81afb91561bddfdecba8139d2bbb7ab7caf4d57db0f8d991711bf51dd0574116` |
| `apps/dashboard/src/okx-demo-auto-loop-cli.ts` | 10196 | 2026-02-17 14:03:52 | `1a99e46e1bfceb646ce6a5c56bbe5ecde6bf9e8ee6a1c55f1a9c610b0d683c01` |
| `apps/dashboard/src/okx-demo-cancel-cli.ts` | 4304 | 2026-02-17 14:03:47 | `abf004a0c761c5feec4c7916124fb349256ff5a616acbc0dd708653107d72edf` |
| `apps/dashboard/src/okx-demo-execute-cli.ts` | 6377 | 2026-02-17 14:03:32 | `ee706275e1797a2b0df5ec08cb5f761dd4cafd44918e42c881d9269d18d70298` |
| `apps/dashboard/src/okx-demo-health-cli.ts` | 1809 | 2026-02-17 14:03:28 | `a26cde2b6b3f212c28cec4f8eeabda3206cc2bf0930717beec8705bed0949094` |
| `apps/dashboard/src/okx-demo-orders-cli.ts` | 2276 | 2026-02-17 14:03:36 | `876b580a6b41b3f631281c5a0e69c6caf8b66efc5e9b5602227735e1258e213b` |
| `apps/dashboard/src/okx-demo-reconcile-cli.ts` | 3554 | 2026-02-17 14:03:43 | `11a6aa74138ebf7deca28b4aa6ae1ede344bd6941829893fde646e4a66628bfa` |
| `apps/dashboard/src/okx-proposal-helper-cli.ts` | 4804 | 2026-02-17 14:03:58 | `bb70a8b220e2055b4173685c597ca06d4c76b66a360cf57d86ebe6461b8021c6` |
| `apps/dashboard/src/proposal-helper.ts` | 6727 | 2026-02-16 09:01:09 | `c7904f9d9d4031626eae07d84e2c13fde3aeee8e158eb86af36e45834033e306` |
| `apps/dashboard/src/reconciliation.ts` | 6040 | 2026-02-16 09:10:08 | `e5f55769e0e1138f12facf33e0575cf932b4237298f02e58439f36490e7e8ee4` |
| `apps/mission-control/dist/assets/index-Ci88kzgj.css` | 10050 | 2026-02-17 13:19:49 | `6679a66d327fe846ae955aa0b37b2f8537a5cca7beb08f1c7950dbcedea657f2` |
| `apps/mission-control/dist/assets/index-DNALGwVC.js` | 249306 | 2026-02-17 13:19:49 | `e56b7fb0d2d25c6600d7848ad1c7d7f35371f6f5fb1d006de5b1db27c7c1ae90` |
| `apps/mission-control/dist/index.html` | 408 | 2026-02-17 13:19:49 | `d8f0a5f59a55ecee8ffa0365d94c9485023430e97e848072171db924ed7ffef2` |
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
| `apps/mission-control/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 471 | 2026-02-17 15:50:10 | `1629b8055466676e1d5f83e436633ff9a9bbf48ae83d9b8fc69a72d6ed3b0cbd` |
| `apps/mission-control/package.json` | 669 | 2026-02-16 17:42:43 | `3024c620c459bc2e3913d4089b1595f968279f16f76d94c51d93ade2b841ce8e` |
| `apps/mission-control/README.md` | 5011 | 2026-02-17 13:32:41 | `8a2923353fdf2206681aa99dde2fdb85ab98505b108c85766f90d9f3c9a11c14` |
| `apps/mission-control/src/api/BotApiClient.ts` | 2320 | 2026-02-17 14:35:42 | `20a71df79bdd2a74be3dc6d3e60a53d21a9239b17cd6fb40eed03d1a5156cac6` |
| `apps/mission-control/src/api/LiveBotApiClient.ts` | 13945 | 2026-02-17 14:29:15 | `f6f14652faa64b019ba5006f9245ebb0026de7f8c249c8bb43c2b3c1cc1d3b69` |
| `apps/mission-control/src/api/MockBotApiClient.ts` | 15049 | 2026-02-17 14:35:54 | `a8369c52774654b0bac1b068207f789319461b686dd72169fd5a1f3f2fa29358` |
| `apps/mission-control/src/App.tsx` | 23562 | 2026-02-17 15:49:51 | `fd6ea46ff38e4cc461164580efb771f59f11aa4496ea8378adafcb1cf9fcedc6` |
| `apps/mission-control/src/components/AlertsPanel.tsx` | 2379 | 2026-02-17 07:49:36 | `39a7eb4533e2b7e508902b15188ce2c577d03d20c3f1bb28273ff21fdd7b2b3e` |
| `apps/mission-control/src/components/ApprovalsPanel.tsx` | 4751 | 2026-02-17 14:36:04 | `54d3610794420e5bc27798cab50c9832eafa354c7e0379736266c5030d6a5974` |
| `apps/mission-control/src/components/AuditTimeline.tsx` | 1307 | 2026-02-16 17:05:08 | `4b7dce32b967dd32649ec3395eefc00800bda128404c5335da450528aaa3b6ea` |
| `apps/mission-control/src/components/BotStatusCard.tsx` | 1480 | 2026-02-16 17:04:22 | `8e20b77c5543d8d4d8d2656fe82eae10c976b9a105ee5062d172db5c6099fadf` |
| `apps/mission-control/src/components/ControlDeck.tsx` | 1610 | 2026-02-16 17:04:22 | `eb3c9bc99165976a7ecaa3dcb7489e336df8a315d8dbf908b97ad32a17afa159` |
| `apps/mission-control/src/components/DemoReadinessCard.tsx` | 1532 | 2026-02-17 15:49:47 | `183b6da47182e40ab56c2cb19606758b719aec344c5645acc1bdcdaf1fd2ebef` |
| `apps/mission-control/src/components/EventStream.tsx` | 7034 | 2026-02-17 13:15:12 | `043b3b5fd5e1e0eb83f7cccf9f1471e21215a12f3d03d88e77c64c56c62a4766` |
| `apps/mission-control/src/components/IncidentsPanel.tsx` | 2396 | 2026-02-17 08:10:58 | `4e11c8d386260c57ce786608900d3b2a41a71f969a605ae3daae7523efb951b7` |
| `apps/mission-control/src/components/LogsPanel.tsx` | 1998 | 2026-02-17 12:48:31 | `e9e27e8c06860e915f7a041cb54b3360a2742cddf0b710273bde3ea50e2b6fc6` |
| `apps/mission-control/src/components/OpsMetricsPanel.tsx` | 2381 | 2026-02-17 14:54:17 | `059fb7100261676e15041908fdb21269b88f494a39dabd73503331c4504b74b0` |
| `apps/mission-control/src/components/OrdersPanel.tsx` | 1854 | 2026-02-17 13:11:29 | `c068a905309ad03371156a89c9533d1cb67ce95d94e07af8f40c6c8c6902d9c1` |
| `apps/mission-control/src/components/PortfolioPanel.tsx` | 1444 | 2026-02-17 13:11:17 | `0547e8caf1189b785f9f8a79272938b7c2f9bcfe9cb219872a64610ef2fab396` |
| `apps/mission-control/src/components/ReconciliationCard.tsx` | 1794 | 2026-02-17 07:58:23 | `3fe557ca91b9748b10b3804d932247b6badeaac6ca2c05efe61a2be4291f4a5a` |
| `apps/mission-control/src/components/RiskPanel.tsx` | 1451 | 2026-02-16 17:05:08 | `f45614d33170f004137945ec69bf1748942425a5f7067662652afe55423256ad` |
| `apps/mission-control/src/components/ThemeSwitcher.tsx` | 565 | 2026-02-16 17:04:22 | `861e77d8dd27e259d3347d23616f888b0e14f558086650b2eb5f667f3ca79a05` |
| `apps/mission-control/src/format.ts` | 498 | 2026-02-16 17:04:01 | `a776785a0341424289368c72b8755e778a0865d3a0c4b601cd0d1ed415d19ed9` |
| `apps/mission-control/src/logic/controlAvailability.ts` | 1258 | 2026-02-17 14:26:12 | `59cb9bbf799732d838a0591f4d284f3497d82b40cbefd996d1c213aee9e99d85` |
| `apps/mission-control/src/logic/eventFilters.ts` | 1743 | 2026-02-16 17:34:21 | `82adc811a7d2838f41805609311bc10b8c5699f37658e9db5e923aca183a1776` |
| `apps/mission-control/src/main.tsx` | 232 | 2026-02-16 17:06:38 | `adbc6a19142a0e6bfd6289063814cda1d9748df74d8f6dfc04d0d810f218a6ee` |
| `apps/mission-control/src/mock/mockData.ts` | 6054 | 2026-02-16 17:43:47 | `0de386d7f19a8d5db8ad9e34d8c8c700f8fabbbb82e64e9cd177db2ef36a550a` |
| `apps/mission-control/src/state/useDashboardData.ts` | 7491 | 2026-02-17 14:35:48 | `b707802367e45146e2a6015b7b6822480bd3974f8b7d03499fca69b0922f5df1` |
| `apps/mission-control/src/styles.css` | 15039 | 2026-02-17 15:50:02 | `d64fa932f71abd6187c45e77e7d977faef55a1e146fd3ad38d41c209e7cb0af6` |
| `apps/mission-control/src/test/control-availability.spec.ts` | 628 | 2026-02-16 17:06:56 | `f19d2b619f4bf956bb0e9763be060fa3c11f02de6f6e292d881fa53ef0d39560` |
| `apps/mission-control/src/test/event-filters.spec.ts` | 1221 | 2026-02-16 17:06:56 | `e39b0758d48483a9fe3d35d7302cc60d33a48c46d1ed523f2d76534b88a3a8a5` |
| `apps/mission-control/src/test/event-stream-virtualization.spec.ts` | 3099 | 2026-02-17 13:19:27 | `27a4d0b136cc8cf9078a26ff9bea052581d17865f0038d66e23bb3d3afc46ed5` |
| `apps/mission-control/src/test/portfolio-orders-panel.spec.ts` | 3259 | 2026-02-17 13:19:11 | `0a1a432ae6b368e7b7ce78d7c1c6ee9fe3ad1224d20c48ddc40a5509598f0f5a` |
| `apps/mission-control/src/test/role-gating.spec.ts` | 535 | 2026-02-16 17:06:56 | `ca39f817f2980ceac531cd3d4fffd1a2fff448b8e5ea742ea406fa205fe025e4` |
| `apps/mission-control/src/test/setup.ts` | 44 | 2026-02-16 17:06:56 | `60aa525f7ffa6bfd3045d22710d4eeef3a5ff2074ecc3dbcef99374badebad17` |
| `apps/mission-control/src/theme.ts` | 692 | 2026-02-16 17:02:33 | `dc8c55efbfffe4573575285c142021e013f38c985a02cba371af5b785917c7a3` |
| `apps/mission-control/src/types.ts` | 410 | 2026-02-17 14:36:53 | `a7401a3a438024e538d1b16e50e33dbd8b9c54d120742bfadad5698008268828` |
| `apps/mission-control/tsconfig.json` | 393 | 2026-02-16 17:43:04 | `11b5b470f0b39ee4262c5e0eded1137103c0bdd16970fcd1c353c403c2eb1b28` |
| `apps/mission-control/vite.config.ts` | 136 | 2026-02-16 17:02:09 | `d2d053ba4043a83d1a93e2c22a7aeb72b67535791d5113e6bfe843335439e5ed` |
| `apps/mission-control/vitest.config.ts` | 283 | 2026-02-16 17:02:09 | `e4fe2d7c27ea8c681ebbabaf1f9a363bb1bd79c6f997a1bf565741bee6de4163` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/incident-taxonomy-and-slo.md` | 999 | 2026-02-17 08:14:36 | `62ed677505f66b742d92d9697a651d6cc5c986b76ba56435fa4a7092e4285a73` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/milestone-3-completion-report.md` | 2402 | 2026-02-17 07:19:51 | `5ea39346e2dcf983ee4e36d81321851c9400b014910c8a395372108d0442225e` |
| `docs/milestone-3-invariants.md` | 2457 | 2026-02-17 07:18:59 | `30e964d5ca026aa78c43971b8c828f0f8a5549348b6e7139ce68cd6ac713d8ea` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 3201 | 2026-02-17 08:37:39 | `5df715943a3a84a5573f5c984faebeeed86d9a6902fdbe4dcc692f89ac30a982` |
| `docs/runbooks/approval-governance.md` | 511 | 2026-02-17 08:14:21 | `22173a75980107cd50ea20e20026edc797b638ddca01af77054dc59c4998e7a0` |
| `docs/runbooks/control-plane-incident.md` | 2732 | 2026-02-17 13:33:00 | `00a6a6aae859f6b82d31d5c44d6d823544d2aafdc5064d958f4aa99cc768f421` |
| `docs/runbooks/exchange-reliability.md` | 508 | 2026-02-17 08:14:36 | `05b52676536a6fe45d01f85e54778cfe30239fb313f6e8fff7146f813b22e40e` |
| `docs/runbooks/freshness-guard.md` | 612 | 2026-02-17 08:14:21 | `9b34580d9ee2080fe59c635ed4a4fe675401c29d8ed318d785957ca2efb0d8e4` |
| `docs/runbooks/reconciliation-drift-circuit.md` | 660 | 2026-02-17 08:14:21 | `e1c20250b36afbd059c08da1dc10747313821972de49feae9febdb22f0ae6217` |
| `docs/ui-prompts.md` | 16045 | 2026-02-16 17:00:33 | `de5e884a5d4fc1f5b340efe9bc28adfcb313ccee16d4e9136b1c73818e832c3c` |
| `logs/context.e2e.json` | 295 | 2026-02-17 13:49:59 | `30cbda451beabc5dd7ac3a11ba4e4c148bf6785692c71239c36148fb9b16205e` |
| `logs/mission-alerts.jsonl` | 2228 | 2026-02-17 14:48:43 | `0379d57771c6fc4e3fb5f2aed2f2afe9efd13cb23c306b12c254f7cc96cad01b` |
| `logs/mission-events.jsonl` | 208 | 2026-02-16 17:35:42 | `53aca00c56fcb146948c23e537e0c20c4c98ed17c5c575bdf37ce8ff226f081d` |
| `logs/mission-events.sqlite` | 864256 | 2026-02-17 15:51:05 | `4e6267d1678b3612d98e50bec344bd1ca8a3de33971eeeb69a91891e078c7996` |
| `logs/mission-ops.sqlite` | 61440 | 2026-02-17 15:51:07 | `a52a343d0ca16ade03c09a27337004939784586969111b23e5fc37490ef232e5` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 1054 | 2026-02-17 14:06:49 | `5affbbeccef6f6dbf1a30e205218d368085c5ec6a63f0d2874c7807add0f45ad` |
| `logs/proposal.e2e.json` | 223 | 2026-02-17 13:49:59 | `0ac6472f8abac22d422519d12c7d2bc01d0929317571d5b99e02d7ec3f058241` |
| `logs/proposal-audit.jsonl` | 2206 | 2026-02-17 14:05:57 | `a01a41c415f3e3b70dac46612d748be485bfc9499be003736becd3dfbc0fab18` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `package.json` | 1630 | 2026-02-17 07:15:39 | `e536a1e0e6386df83ed6f8d327d4596cfba189e7d32225e8031af18a5b0f1bb9` |
| `package-lock.json` | 173178 | 2026-02-17 07:15:39 | `c916b3cea1936f49535bca744ec4bc55e6a7de247399f57d756595dbd1744b50` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 7234 | 2026-02-16 09:06:30 | `95003ab16ba286c0141ca6c08655c5b4d0ac7342161cb4b0694dbdeee77f9019` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 6696 | 2026-02-17 07:14:56 | `4e573bb98a29c93489025eb5e4c84cf988ffb74bcf46a9dea4854f10e78f3bef` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 96 | 2026-02-16 17:31:00 | `ec4236dd133b7a1ead687ecf23f68c9303b9d4ccf8952eeafeeb6729b6867613` |
| `packages/shared/src/mission-control.ts` | 6065 | 2026-02-17 14:35:26 | `6289ba2abc0b4848b34d21a42ff3a55019ea0f0780b7926fe9e3e67ed56565d8` |
| `packages/shared/src/schemas.ts` | 2193 | 2026-02-17 07:55:34 | `8a19fa162e37fb64c8fc51253c51d6f3af91901e54aab90f8f48aac7a17a4464` |
| `packages/shared/src/types.ts` | 1781 | 2026-02-17 07:55:30 | `083f186e533824813b24e7b71380c8ff0f0ee5dc8e891e88b5e84e9622b28d51` |
| `README.md` | 10379 | 2026-02-17 13:32:29 | `738191d5253249bf6420952a9ad813ba7f5e06fd0891fd67c3821f82468c745d` |
| `scripts/install-index-hooks.ps1` | 239 | 2026-02-16 07:42:01 | `2420afd0c3aca0b6bbf968754a814003dab3ee40f81410ea97137236162633ae` |
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
| `skills/trading-oracle.md` | 32746 | 2026-02-16 07:44:03 | `b248d923616037b2e5164bcbdb1ece1d8eed7dd38edf82869d667347f9ee0d21` |
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
| `tests/mission-control-contract.spec.ts` | 19504 | 2026-02-17 13:08:14 | `6c835adf52524db92541a97a3d92dc1b1b74a074330501acb67d019672e9d3db` |
| `tests/mission-control-policy.spec.ts` | 895 | 2026-02-17 14:30:49 | `24e2f4cd0044527c2fea8c2fec8bb16f2c83fa46d3cf2afecb906f6a3aba47cf` |
| `tests/mission-control-runtime.spec.ts` | 695 | 2026-02-16 17:33:52 | `aefbdd2825497fc8d9411989202274238d06235796b100a6c62bb682d9975219` |
| `tests/okx-demo-adapter.spec.ts` | 4895 | 2026-02-16 09:08:55 | `9c248f263b42e3e84095b50ed5bc7fb3daed87a2613c1af4bf29a85fb6c91302` |
| `tests/proposal-helper.spec.ts` | 2442 | 2026-02-16 09:02:04 | `4a3010d8af6acac630ff69c2f7bd75227d2f5ddb42b377ca49735cd9bf59a8c6` |
| `tests/reconciliation.spec.ts` | 3445 | 2026-02-16 09:10:16 | `94d83a0fb4c1bb0ffece49834295fa4cdc4b9ef027abd74fa5f1ad4c4ac06f99` |
| `tests/risk-gatekeeper.property.spec.ts` | 3603 | 2026-02-17 07:13:03 | `513d72fca85d8371bca0a4954b70b43848d787abca00f18bf15af993bb4c9bfd` |
| `tests/risk-gatekeeper.spec.ts` | 6690 | 2026-02-17 07:13:17 | `3c88b946823f43129f0a472b38972600afbec9cf67574bbd97cd00c75cf7d126` |
| `tests/TEST_PLAN.md` | 2553 | 2026-02-16 08:16:15 | `8cc0e2a87f4e729d9d83167f38dfac40fc08c469d21234055ea01c01f25d3834` |
| `tsconfig.json` | 452 | 2026-02-16 17:07:09 | `d6331a640070d8c030998b7ac27dfd1348069048489d62376e14e587e0674822` |
| `tsc-trace.log` | 1563480 | 2026-02-16 08:27:36 | `5854404d1a9ff8ebe0daf5c754056ec0343820a4b5c60aa36b81c6f8706c1dac` |
| `vitest.config.ts` | 200 | 2026-02-16 08:14:21 | `55096e8f7b13a8289ea7dd5999df2345c120c12bea1cad31b82b567003446717` |
