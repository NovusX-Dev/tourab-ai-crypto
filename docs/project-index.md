# Project Index

Generated: 2026-02-17 07:47:17 UTC

## Summary
- Root: `.`
- Directories indexed: 37
- Files indexed: 137
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
          - jsonl-event-store.ts
          - policy.ts
          - rate-limit.ts
          - runtime-events.ts
          - runtime-lifecycle-manager.ts
        - cli.ts
        - cli-validation.ts
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
          - index-D7BvYx65.js
          - index-Q3rhUYKd.css
        - index.html
      - node_modules/
        - .vite/
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
          - ApprovalsPanel.tsx
          - AuditTimeline.tsx
          - BotStatusCard.tsx
          - ControlDeck.tsx
          - EventStream.tsx
          - LogsPanel.tsx
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
    - decisions.md
    - deep-research-report.md
    - demo-readiness-checklist.md
    - learning-report.md
    - milestone-3-completion-report.md
    - milestone-3-invariants.md
    - roadmap.md
    - ui-prompts.md
  - logs/
    - mission-events.jsonl
    - okx-snapshot.json
    - order-intents.jsonl
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
| `.env` | 1059 | 2026-02-16 08:54:24 | `ee243e89dd6eb1b343d2db02f46400c8d094c9fc075a156c0db8cb8c4a47cfa4` |
| `.env.example` | 1147 | 2026-02-16 09:14:04 | `333a1907e86732a7e68611297f62697c34acc0a38383536aa1a4f654dad59179` |
| `.gitattributes` | 24 | 2026-02-16 07:43:43 | `6fda4653ef71808abc2eb5e88b7cf1ec9912e800d3bad13d3b4f46abc8d6f7ea` |
| `.githooks/post-checkout` | 243 | 2026-02-16 07:41:58 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/post-merge` | 243 | 2026-02-16 07:41:54 | `81a66130ba52de51a55b1fcbb489cc44d186b51386d808a7774390d586e28680` |
| `.githooks/pre-commit` | 274 | 2026-02-16 07:41:51 | `9a68a1a9e1b68e7ea8f44c5e4368bae6eafc89ad6e928a2d68cc2113c6812339` |
| `.gitignore` | 385 | 2026-02-15 08:24:52 | `b0e963bbe4731fbadd53f9fb4519b2dadc110279778dcfaecc695d528a052122` |
| `apps/dashboard/package.json` | 388 | 2026-02-16 17:34:55 | `279db4746ec4b34e0b80a6a470f706141dca3b820764d6ce38d18e98e1ee24c1` |
| `apps/dashboard/src/cli.ts` | 2739 | 2026-02-16 08:22:42 | `65b65600773088fa34d56c25abb0ee54c99647f1afdc11f148b009391a385b15` |
| `apps/dashboard/src/cli-validation.ts` | 1532 | 2026-02-16 08:22:27 | `1d7bd77d440d0ac9d265c556515fe93879d76ac8b4e473074911b4e0da2dac27` |
| `apps/dashboard/src/execution-service.ts` | 7835 | 2026-02-17 07:11:34 | `2d5f31b2de13775eac90b93e62438aa6fe5250a5f0744fb5ad2f30d90cc51374` |
| `apps/dashboard/src/human-approval.ts` | 2802 | 2026-02-17 07:18:23 | `33af47ee9cf61e08a7652541b8a55ae28ce485c4ec68182d797ef9ef8d1da6d5` |
| `apps/dashboard/src/lifecycle-store.ts` | 1135 | 2026-02-16 09:06:05 | `d836bad7d35bb5ba19d65b4a9625bb40838261f599332bae7bcfc80d30dda38d` |
| `apps/dashboard/src/mission-control/approval-store.ts` | 4182 | 2026-02-17 06:53:24 | `a5bceb2239adc99ac5297435cfe53b40777fda9c3cbe85a7b5babb7031c8b9df` |
| `apps/dashboard/src/mission-control/auth.ts` | 814 | 2026-02-16 19:22:10 | `ae9b77cce3b5939875f44a17d5bdfd17b988e774c3325e433d74e557dcdef7c0` |
| `apps/dashboard/src/mission-control/event-bus.ts` | 437 | 2026-02-16 17:31:37 | `c3ecaad332d8fb3f15223daf611846d01487b2561d971072b9dc3593434b4354` |
| `apps/dashboard/src/mission-control/event-factory.ts` | 512 | 2026-02-16 17:31:37 | `9e03c058e7a01ba7c791df03d6d4aae88470903d0987565949557824c8524553` |
| `apps/dashboard/src/mission-control/jsonl-event-store.ts` | 2000 | 2026-02-16 17:38:27 | `19326a5855984e101e777c1daa80644cf4110b988310b6ade897177c2c13a23c` |
| `apps/dashboard/src/mission-control/policy.ts` | 1134 | 2026-02-16 17:31:36 | `6ed30931d2f183a43f4d4b018b45feeb725c9bbfe20e55a750b28fa8e7b65222` |
| `apps/dashboard/src/mission-control/rate-limit.ts` | 785 | 2026-02-16 17:31:55 | `0f947e591afbb854c2233d260a6734f7228125ff124baa5d24dc7cb336d6da06` |
| `apps/dashboard/src/mission-control/runtime-events.ts` | 1463 | 2026-02-16 17:32:25 | `e5a3f33b7f5ef9570fff92188ff47b76643468c02e5122f095460dfc5bb78c3f` |
| `apps/dashboard/src/mission-control/runtime-lifecycle-manager.ts` | 4641 | 2026-02-16 17:32:25 | `1e6b2262eb162686a93192100fbc82aead045e84a8faf7f7478c6cd416a8a6d3` |
| `apps/dashboard/src/mission-control-server.ts` | 17599 | 2026-02-17 07:14:15 | `7cf44bcafc37c10d09ccdba61dd74991f61af099c623d16b35c8dcdbf202f1b4` |
| `apps/dashboard/src/okx-demo-auto-loop-cli.ts` | 9177 | 2026-02-17 07:15:00 | `26b50cedf2010572d2f2198b621a1ff8d5ad9f5e87d99eb943c59988aaa43cb7` |
| `apps/dashboard/src/okx-demo-cancel-cli.ts` | 4186 | 2026-02-17 07:19:38 | `e4ea20943a89b7bc0c994e9e54dfcf5b4e93a4ab264523eb3947b292c6569893` |
| `apps/dashboard/src/okx-demo-execute-cli.ts` | 5116 | 2026-02-17 07:11:44 | `98ea2433bbed21b6e1dba68ad8f85fa5b621fa9d7c999236ebc7cf31f85cc711` |
| `apps/dashboard/src/okx-demo-health-cli.ts` | 1691 | 2026-02-16 08:57:16 | `12fd73e0564d89a4b16b1c23edcdd5ba7bb18e6827868a6589866a278275f0f2` |
| `apps/dashboard/src/okx-demo-orders-cli.ts` | 2158 | 2026-02-16 09:07:13 | `00fdbd2a2e99bf379e09b5dc80face478e21ef0dbb4e56235148bca6ce6bb701` |
| `apps/dashboard/src/okx-demo-reconcile-cli.ts` | 3436 | 2026-02-16 09:07:31 | `768e6d9cf5b97ef0c7f6e901f3c6eb4272080bf59f70cb7f0e4d4ab8f799f8a4` |
| `apps/dashboard/src/okx-proposal-helper-cli.ts` | 4686 | 2026-02-16 09:02:41 | `5eed40d512c301142b91deb77e25d164cc22244255bd489a6cb685da7c0dccf0` |
| `apps/dashboard/src/proposal-helper.ts` | 6727 | 2026-02-16 09:01:09 | `c7904f9d9d4031626eae07d84e2c13fde3aeee8e158eb86af36e45834033e306` |
| `apps/dashboard/src/reconciliation.ts` | 6040 | 2026-02-16 09:10:08 | `e5f55769e0e1138f12facf33e0575cf932b4237298f02e58439f36490e7e8ee4` |
| `apps/mission-control/dist/assets/index-D7BvYx65.js` | 223059 | 2026-02-17 07:20:02 | `da0606730dcf60e5840b25ee69d22971579f6e2c3fb0ce17ea7217847a0805e7` |
| `apps/mission-control/dist/assets/index-Q3rhUYKd.css` | 7846 | 2026-02-17 07:20:02 | `ec4d30d4880c9479da7ebcb3e8a9e3377c43b4f0687a69e5ad36dfff04e7b459` |
| `apps/mission-control/dist/index.html` | 408 | 2026-02-17 07:20:02 | `56ccfcf252eb92e27b5572899e18c3d409170981174adadad13fa5153150adad` |
| `apps/mission-control/index.html` | 310 | 2026-02-16 17:06:38 | `08590a3a9a172d25533738243d7ead030a850e32d52ab09543d150a4ddec4253` |
| `apps/mission-control/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 282 | 2026-02-16 17:48:25 | `0368e9ab0bf75516297eb5d54462ec8c8f0d2b382ee82cc70b416cf84ddb8675` |
| `apps/mission-control/package.json` | 669 | 2026-02-16 17:42:43 | `3024c620c459bc2e3913d4089b1595f968279f16f76d94c51d93ade2b841ce8e` |
| `apps/mission-control/README.md` | 2190 | 2026-02-17 06:55:51 | `3a8a3b3646aad10ca4fa8dc5a06ddba9dd50366b88afa534d62b12fc39a7b1a1` |
| `apps/mission-control/src/api/BotApiClient.ts` | 1076 | 2026-02-16 19:30:14 | `c96037aadd2b4cda0a221838dcfb9d26005d695be1fe35d7d33413efb07e6a89` |
| `apps/mission-control/src/api/LiveBotApiClient.ts` | 6665 | 2026-02-16 19:30:43 | `e259dcfbb3ec29af6848f21b4702632e803b06fa59f5789a964bd8f76d0ffdab` |
| `apps/mission-control/src/api/MockBotApiClient.ts` | 7610 | 2026-02-16 19:30:36 | `5cac58a387d202af85ca2e3a83794544e3c93ac346ff85a67b3349a74e3601bf` |
| `apps/mission-control/src/App.tsx` | 10341 | 2026-02-17 06:54:35 | `d5fbdcb8854a06ddee291445214514864ba9dd17fb6de6562f14b62dca09b618` |
| `apps/mission-control/src/components/ApprovalsPanel.tsx` | 3882 | 2026-02-17 06:54:08 | `b379f6655c7c926f1d98c40e9664567c011111b5a36482ee87d4560efd8b440c` |
| `apps/mission-control/src/components/AuditTimeline.tsx` | 1307 | 2026-02-16 17:05:08 | `4b7dce32b967dd32649ec3395eefc00800bda128404c5335da450528aaa3b6ea` |
| `apps/mission-control/src/components/BotStatusCard.tsx` | 1480 | 2026-02-16 17:04:22 | `8e20b77c5543d8d4d8d2656fe82eae10c976b9a105ee5062d172db5c6099fadf` |
| `apps/mission-control/src/components/ControlDeck.tsx` | 1610 | 2026-02-16 17:04:22 | `eb3c9bc99165976a7ecaa3dcb7489e336df8a315d8dbf908b97ad32a17afa159` |
| `apps/mission-control/src/components/EventStream.tsx` | 5089 | 2026-02-16 17:04:44 | `601ac24f4126858d07cfbf64133935238cd0dad03e3f0ed428dd91e8f44d3e82` |
| `apps/mission-control/src/components/LogsPanel.tsx` | 1974 | 2026-02-16 17:05:08 | `9df2e981bbd35c2450ce1f6a24d73e021bf98fec983cd2b38f3c0845109649f5` |
| `apps/mission-control/src/components/ReconciliationCard.tsx` | 1085 | 2026-02-16 17:05:15 | `f97529a50ae3d0cf57fcd227aa0378449749280b7776abedafc0f5df3794a6f4` |
| `apps/mission-control/src/components/RiskPanel.tsx` | 1451 | 2026-02-16 17:05:08 | `f45614d33170f004137945ec69bf1748942425a5f7067662652afe55423256ad` |
| `apps/mission-control/src/components/ThemeSwitcher.tsx` | 565 | 2026-02-16 17:04:22 | `861e77d8dd27e259d3347d23616f888b0e14f558086650b2eb5f667f3ca79a05` |
| `apps/mission-control/src/format.ts` | 498 | 2026-02-16 17:04:01 | `a776785a0341424289368c72b8755e778a0865d3a0c4b601cd0d1ed415d19ed9` |
| `apps/mission-control/src/logic/controlAvailability.ts` | 1160 | 2026-02-16 17:02:49 | `00d9c90c4c594e2ac16b793faae37832d97bd2315bbd382da9d2dedee2a65e58` |
| `apps/mission-control/src/logic/eventFilters.ts` | 1743 | 2026-02-16 17:34:21 | `82adc811a7d2838f41805609311bc10b8c5699f37658e9db5e923aca183a1776` |
| `apps/mission-control/src/main.tsx` | 232 | 2026-02-16 17:06:38 | `adbc6a19142a0e6bfd6289063814cda1d9748df74d8f6dfc04d0d810f218a6ee` |
| `apps/mission-control/src/mock/mockData.ts` | 6054 | 2026-02-16 17:43:47 | `0de386d7f19a8d5db8ad9e34d8c8c700f8fabbbb82e64e9cd177db2ef36a550a` |
| `apps/mission-control/src/state/useDashboardData.ts` | 4655 | 2026-02-17 06:55:06 | `808d655fde0c39d33d15e8ec8b1e7c665173ee1f98390e06075a707d235aaf85` |
| `apps/mission-control/src/styles.css` | 9866 | 2026-02-16 17:54:18 | `873847898e33c3b67836b699f8c4955d1ab90ab8cb51841969595f9d6f8d2a42` |
| `apps/mission-control/src/test/control-availability.spec.ts` | 628 | 2026-02-16 17:06:56 | `f19d2b619f4bf956bb0e9763be060fa3c11f02de6f6e292d881fa53ef0d39560` |
| `apps/mission-control/src/test/event-filters.spec.ts` | 1221 | 2026-02-16 17:06:56 | `e39b0758d48483a9fe3d35d7302cc60d33a48c46d1ed523f2d76534b88a3a8a5` |
| `apps/mission-control/src/test/role-gating.spec.ts` | 535 | 2026-02-16 17:06:56 | `ca39f817f2980ceac531cd3d4fffd1a2fff448b8e5ea742ea406fa205fe025e4` |
| `apps/mission-control/src/test/setup.ts` | 44 | 2026-02-16 17:06:56 | `60aa525f7ffa6bfd3045d22710d4eeef3a5ff2074ecc3dbcef99374badebad17` |
| `apps/mission-control/src/theme.ts` | 692 | 2026-02-16 17:02:33 | `dc8c55efbfffe4573575285c142021e013f38c985a02cba371af5b785917c7a3` |
| `apps/mission-control/src/types.ts` | 290 | 2026-02-16 17:52:26 | `56bcf86506965aad17becd8bae456cea8bb0b71aa6007539f316549679894948` |
| `apps/mission-control/tsconfig.json` | 393 | 2026-02-16 17:43:04 | `11b5b470f0b39ee4262c5e0eded1137103c0bdd16970fcd1c353c403c2eb1b28` |
| `apps/mission-control/vite.config.ts` | 136 | 2026-02-16 17:02:09 | `d2d053ba4043a83d1a93e2c22a7aeb72b67535791d5113e6bfe843335439e5ed` |
| `apps/mission-control/vitest.config.ts` | 283 | 2026-02-16 17:02:09 | `e4fe2d7c27ea8c681ebbabaf1f9a363bb1bd79c6f997a1bf565741bee6de4163` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/demo-readiness-checklist.md` | 4228 | 2026-02-17 07:00:41 | `e6b5d347b38fdd931c8bba1adf7e1d785975b62dc3b346a3c3fa96b47a682aa1` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/milestone-3-completion-report.md` | 2402 | 2026-02-17 07:19:51 | `5ea39346e2dcf983ee4e36d81321851c9400b014910c8a395372108d0442225e` |
| `docs/milestone-3-invariants.md` | 2457 | 2026-02-17 07:18:59 | `30e964d5ca026aa78c43971b8c828f0f8a5549348b6e7139ce68cd6ac713d8ea` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 2783 | 2026-02-17 07:46:03 | `8db3c374d174262d881ce4acf8f2186798c8a9c8a08c302d08b1fabac402041f` |
| `docs/ui-prompts.md` | 16045 | 2026-02-16 17:00:33 | `de5e884a5d4fc1f5b340efe9bc28adfcb313ccee16d4e9136b1c73818e832c3c` |
| `logs/mission-events.jsonl` | 208 | 2026-02-16 17:35:42 | `53aca00c56fcb146948c23e537e0c20c4c98ed17c5c575bdf37ce8ff226f081d` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 527 | 2026-02-16 09:10:35 | `0b55dab427203c4225bf7c7da0457b53134e0e32288fc829019aeba37a25b942` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `package.json` | 1630 | 2026-02-17 07:15:39 | `e536a1e0e6386df83ed6f8d327d4596cfba189e7d32225e8031af18a5b0f1bb9` |
| `package-lock.json` | 173178 | 2026-02-17 07:15:39 | `c916b3cea1936f49535bca744ec4bc55e6a7de247399f57d756595dbd1744b50` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 7234 | 2026-02-16 09:06:30 | `95003ab16ba286c0141ca6c08655c5b4d0ac7342161cb4b0694dbdeee77f9019` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 6696 | 2026-02-17 07:14:56 | `4e573bb98a29c93489025eb5e4c84cf988ffb74bcf46a9dea4854f10e78f3bef` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 96 | 2026-02-16 17:31:00 | `ec4236dd133b7a1ead687ecf23f68c9303b9d4ccf8952eeafeeb6729b6867613` |
| `packages/shared/src/mission-control.ts` | 3215 | 2026-02-16 19:26:28 | `6c5b463adb9f5cd6cc0bef958369096f1b8a419c8714bfb0b05267edced53b20` |
| `packages/shared/src/schemas.ts` | 2057 | 2026-02-17 07:10:38 | `7d972bac08c02b7567bb55867e6f54ebce98e29556c20068fd0d88452cfb3e4a` |
| `packages/shared/src/types.ts` | 1724 | 2026-02-17 07:10:31 | `390ab04fda85b74ff9503c7fd74f61135e321e8c49815705bb98190cae9cfb99` |
| `README.md` | 6729 | 2026-02-17 07:45:59 | `a66e3de925f7aa76eb4fdd93170d17eede6da68d0fd1cfdc1bd3617db3bf6d9c` |
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
| `tests/approval-store.spec.ts` | 3206 | 2026-02-17 07:16:24 | `c85a20345400ad761f6b2fd9f37bee48f8993714d696a4d655bf42b5abd629a8` |
| `tests/cli-validation.spec.ts` | 2761 | 2026-02-16 08:22:57 | `f469e8e4909db02465e4936662d21d60666afd70b11d9090860b0073edc7070c` |
| `tests/execution-service.spec.ts` | 8807 | 2026-02-17 07:18:34 | `35847ee09c3188189fb313a62a1f9d6da2e585913fab7818379f08e97daf8929` |
| `tests/fixtures/context.auto.json` | 295 | 2026-02-16 09:09:53 | `cb8a7e955df9d846f6dceafcb24a2d9e814fd28d5834d393c8554a383707ac2c` |
| `tests/fixtures/context.valid.json` | 295 | 2026-02-16 08:18:18 | `a9ebc8ee93233576c66d541f820ac5cfff2738fa155ea678a0ba23d609707c94` |
| `tests/fixtures/proposal.auto.json` | 222 | 2026-02-16 09:09:53 | `5f4ed0d687d86c6508749198d191f2bc862142a39bdb3aa83132f4b0353711db` |
| `tests/fixtures/proposal.demo-check.json` | 190 | 2026-02-16 08:59:00 | `665aafb9ff642ef370fd47c5e6dec8c967dbe365ce6b4f51814f6d1e03b5a9a0` |
| `tests/fixtures/proposal.invalid.json` | 90 | 2026-02-16 08:23:00 | `20d3fb277c8e22dacf26ff109c0ea4fcdf0a2b751d2b20d1f57db9908c9a7739` |
| `tests/fixtures/proposal.valid.json` | 190 | 2026-02-16 08:18:13 | `732ac716730242de204e9e643b81f475ffd12befce0f99e805c9c5b37d3ab1ef` |
| `tests/human-approval.spec.ts` | 3281 | 2026-02-17 07:18:28 | `d93369b43d786b129f86a60d613e449b6a4e3ec1625fc7275bfcde00f035c11f` |
| `tests/milestone3-integration.spec.ts` | 4677 | 2026-02-17 07:14:04 | `4cc5f2ef40a6060e2c6018844a954f2d6c9ef7e9434398fe3564f53f0684a2c1` |
| `tests/mission-control-contract.spec.ts` | 12664 | 2026-02-17 07:14:24 | `76abaaa968ea7eaac3914c2958af725cdcfe854036d01c5cf942bd36062b0b7e` |
| `tests/mission-control-policy.spec.ts` | 751 | 2026-02-16 17:33:52 | `13a2675953da633895710666d0c4beb8aeff2e1448b4979c30639beb3d52b66b` |
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
