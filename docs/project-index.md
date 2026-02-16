# Project Index

Generated: 2026-02-16 17:29:27 UTC

## Summary
- Root: `.`
- Directories indexed: 35
- Files indexed: 113
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
        - cli.ts
        - cli-validation.ts
        - execution-service.ts
        - human-approval.ts
        - lifecycle-store.ts
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
          - index-BrxPteKR.js
          - index-C3hPGAtD.css
        - index.html
      - node_modules/
        - .vite/
          - vitest/
            - da39a3ee5e6b4b0d3255bfef95601890afd80709/
              - results.json
      - src/
        - api/
          - BotApiClient.ts
          - MockBotApiClient.ts
        - components/
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
    - learning-report.md
    - roadmap.md
    - ui-prompts.md
  - logs/
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
    - cli-validation.spec.ts
    - execution-service.spec.ts
    - okx-demo-adapter.spec.ts
    - proposal-helper.spec.ts
    - reconciliation.spec.ts
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
| `apps/dashboard/package.json` | 255 | 2026-02-16 08:26:19 | `bc9402bf26447c716ce9d7d058979223a7fa9beb1f58197a439eda1e0b0f2d6e` |
| `apps/dashboard/src/cli.ts` | 2739 | 2026-02-16 08:22:42 | `65b65600773088fa34d56c25abb0ee54c99647f1afdc11f148b009391a385b15` |
| `apps/dashboard/src/cli-validation.ts` | 1532 | 2026-02-16 08:22:27 | `1d7bd77d440d0ac9d265c556515fe93879d76ac8b4e473074911b4e0da2dac27` |
| `apps/dashboard/src/execution-service.ts` | 1218 | 2026-02-16 09:05:50 | `d5bd4670bc3df63d1ccb486a6faf6bc5bfad27dcc7fc74e2378499ef61d826cc` |
| `apps/dashboard/src/human-approval.ts` | 1510 | 2026-02-16 09:05:29 | `1bfa540e680e7b3ee14f93c0e0e84cfc60afdca358cc34f83d964a25df69e52b` |
| `apps/dashboard/src/lifecycle-store.ts` | 1135 | 2026-02-16 09:06:05 | `d836bad7d35bb5ba19d65b4a9625bb40838261f599332bae7bcfc80d30dda38d` |
| `apps/dashboard/src/okx-demo-auto-loop-cli.ts` | 8364 | 2026-02-16 09:13:49 | `ac0bc2288fafb95dc5563966263950717588d0b6befcbb8ae8429262ea28f2b5` |
| `apps/dashboard/src/okx-demo-cancel-cli.ts` | 4122 | 2026-02-16 09:07:52 | `3ea968a0d4fd17495f87bcdfc8d2fd07da0067bfe182a6460a6c14a6f1308577` |
| `apps/dashboard/src/okx-demo-execute-cli.ts` | 4218 | 2026-02-16 09:06:14 | `fd227bcccfbafe734eed97f8178faee4cd96296f3cf4fe2a06c7908a10027665` |
| `apps/dashboard/src/okx-demo-health-cli.ts` | 1691 | 2026-02-16 08:57:16 | `12fd73e0564d89a4b16b1c23edcdd5ba7bb18e6827868a6589866a278275f0f2` |
| `apps/dashboard/src/okx-demo-orders-cli.ts` | 2158 | 2026-02-16 09:07:13 | `00fdbd2a2e99bf379e09b5dc80face478e21ef0dbb4e56235148bca6ce6bb701` |
| `apps/dashboard/src/okx-demo-reconcile-cli.ts` | 3436 | 2026-02-16 09:07:31 | `768e6d9cf5b97ef0c7f6e901f3c6eb4272080bf59f70cb7f0e4d4ab8f799f8a4` |
| `apps/dashboard/src/okx-proposal-helper-cli.ts` | 4686 | 2026-02-16 09:02:41 | `5eed40d512c301142b91deb77e25d164cc22244255bd489a6cb685da7c0dccf0` |
| `apps/dashboard/src/proposal-helper.ts` | 6727 | 2026-02-16 09:01:09 | `c7904f9d9d4031626eae07d84e2c13fde3aeee8e158eb86af36e45834033e306` |
| `apps/dashboard/src/reconciliation.ts` | 6040 | 2026-02-16 09:10:08 | `e5f55769e0e1138f12facf33e0575cf932b4237298f02e58439f36490e7e8ee4` |
| `apps/mission-control/dist/assets/index-BrxPteKR.js` | 213006 | 2026-02-16 17:07:46 | `cd0b9aa71dee7ebb71238661a456ce2c96aefd24ce6ffac9137b8d1c97988d13` |
| `apps/mission-control/dist/assets/index-C3hPGAtD.css` | 6941 | 2026-02-16 17:07:46 | `13f2f0bb3209cbaefdd3fd8b9992646adedfb277846016c6b6c0446b5760d112` |
| `apps/mission-control/dist/index.html` | 408 | 2026-02-16 17:07:46 | `160a574b69171be22e248d24e790021d2be1d4e1cdfb3ca2a43c0c2a783f806b` |
| `apps/mission-control/index.html` | 310 | 2026-02-16 17:06:38 | `08590a3a9a172d25533738243d7ead030a850e32d52ab09543d150a4ddec4253` |
| `apps/mission-control/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 283 | 2026-02-16 17:07:47 | `ac41bcf702aeec60a1e7d4431397e3599ce4e372205336d9f0a95422722d26d3` |
| `apps/mission-control/package.json` | 588 | 2026-02-16 17:02:01 | `9e1caf623ee741263eb071574b0b5d972355d179ee6adac54b997cabf13b5192` |
| `apps/mission-control/README.md` | 1453 | 2026-02-16 17:07:23 | `96649c7bb9b4441f1651e5c8aa8a52171b30eb69352d4fc8590e8ca6d0ced148` |
| `apps/mission-control/src/api/BotApiClient.ts` | 613 | 2026-02-16 17:02:33 | `f979414c0539b86487c01c200eee344d126aa4565b0303100c91b3b84cb3b0e3` |
| `apps/mission-control/src/api/MockBotApiClient.ts` | 3195 | 2026-02-16 17:03:35 | `d8e0a176a1a211b2a5c80cb881b793b3ba8752457ea629efd0069a89c1699c11` |
| `apps/mission-control/src/App.tsx` | 5972 | 2026-02-16 17:05:42 | `893aa7aecce429a72c0bfcceea937eedd96059db6e5a153e44aa10996898a688` |
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
| `apps/mission-control/src/logic/eventFilters.ts` | 1656 | 2026-02-16 17:02:49 | `6240bb581ebd8b8aa00ce02c96658d6bddb8260f2d1a02f92fea994ab42ecb59` |
| `apps/mission-control/src/main.tsx` | 232 | 2026-02-16 17:06:38 | `adbc6a19142a0e6bfd6289063814cda1d9748df74d8f6dfc04d0d810f218a6ee` |
| `apps/mission-control/src/mock/mockData.ts` | 5900 | 2026-02-16 17:03:18 | `c642e067cd3c8de6d797ca9c5ba71d64461b3447b7329523a25546fb9a3cc13f` |
| `apps/mission-control/src/state/useDashboardData.ts` | 3469 | 2026-02-16 17:03:54 | `29fc63316744798b9071fec18ef9d030ae7b8853969f8f4b8cfa26c9eb94725b` |
| `apps/mission-control/src/styles.css` | 8735 | 2026-02-16 17:06:38 | `08b8f912ba4f6ba08c68cc1ee390c3dcdd03c5f1d50f7f574fca391f528e5d0d` |
| `apps/mission-control/src/test/control-availability.spec.ts` | 628 | 2026-02-16 17:06:56 | `f19d2b619f4bf956bb0e9763be060fa3c11f02de6f6e292d881fa53ef0d39560` |
| `apps/mission-control/src/test/event-filters.spec.ts` | 1221 | 2026-02-16 17:06:56 | `e39b0758d48483a9fe3d35d7302cc60d33a48c46d1ed523f2d76534b88a3a8a5` |
| `apps/mission-control/src/test/role-gating.spec.ts` | 535 | 2026-02-16 17:06:56 | `ca39f817f2980ceac531cd3d4fffd1a2fff448b8e5ea742ea406fa205fe025e4` |
| `apps/mission-control/src/test/setup.ts` | 44 | 2026-02-16 17:06:56 | `60aa525f7ffa6bfd3045d22710d4eeef3a5ff2074ecc3dbcef99374badebad17` |
| `apps/mission-control/src/theme.ts` | 692 | 2026-02-16 17:02:33 | `dc8c55efbfffe4573575285c142021e013f38c985a02cba371af5b785917c7a3` |
| `apps/mission-control/src/types.ts` | 2044 | 2026-02-16 17:02:23 | `c1472def2532cb9e9005c6dea89af586ed965978e1c431ea8a8c368caa0242e0` |
| `apps/mission-control/tsconfig.json` | 377 | 2026-02-16 17:02:09 | `bea7854a7985a68a41400c4306675ad53a6d5f2e3a5392f12396cf1952ecdbaa` |
| `apps/mission-control/vite.config.ts` | 136 | 2026-02-16 17:02:09 | `d2d053ba4043a83d1a93e2c22a7aeb72b67535791d5113e6bfe843335439e5ed` |
| `apps/mission-control/vitest.config.ts` | 283 | 2026-02-16 17:02:09 | `e4fe2d7c27ea8c681ebbabaf1f9a363bb1bd79c6f997a1bf565741bee6de4163` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 1512 | 2026-02-15 08:26:13 | `d0512bbf58fdea4b9d3751eaeaddf82807337dfb147a998cf616ccdad314a2ab` |
| `docs/ui-prompts.md` | 16045 | 2026-02-16 17:00:33 | `de5e884a5d4fc1f5b340efe9bc28adfcb313ccee16d4e9136b1c73818e832c3c` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 527 | 2026-02-16 09:10:35 | `0b55dab427203c4225bf7c7da0457b53134e0e32288fc829019aeba37a25b942` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `package.json` | 1234 | 2026-02-16 17:07:06 | `196e9da50b938a828f7e08479fc4dfe5e80c0afad9e8213041978c63ec8f932d` |
| `package-lock.json` | 106823 | 2026-02-16 17:07:36 | `98a89fd73c07b475f0760fe2af40551e1df95e3e92f089f6a605e10767e40034` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 7234 | 2026-02-16 09:06:30 | `95003ab16ba286c0141ca6c08655c5b4d0ac7342161cb4b0694dbdeee77f9019` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 5192 | 2026-02-16 08:15:17 | `231c7ee0c11a6005baccb148d74e26c4a77e0b8fd3e24925b63ecd373b2ab4d1` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 58 | 2026-02-16 08:22:19 | `3bcb2309866449a8c6fe6bb243bef2d006e0c3ee15dac3a9892d3f892678e453` |
| `packages/shared/src/schemas.ts` | 1833 | 2026-02-16 08:22:16 | `6c92756e8f8fadaaa397f12295d9cad8e834e91e3c866bda5c94e02e2ce06e75` |
| `packages/shared/src/types.ts` | 1541 | 2026-02-16 08:14:35 | `05029340e6c853bea2e894d9735d8f1a1e2a05a2c0d19bf7d50e93cfb2435e78` |
| `README.md` | 5239 | 2026-02-16 17:07:13 | `09353cd51110a0dc1fcf3cf9d461a8fbbd9159dc962738ee6d890ebe047c9f85` |
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
| `tests/cli-validation.spec.ts` | 2761 | 2026-02-16 08:22:57 | `f469e8e4909db02465e4936662d21d60666afd70b11d9090860b0073edc7070c` |
| `tests/execution-service.spec.ts` | 3885 | 2026-02-16 08:34:30 | `779dbdc7c3f5347d3fe33525780c048b0d9a0b2913932a1a765230b3d023a104` |
| `tests/fixtures/context.auto.json` | 295 | 2026-02-16 09:09:53 | `cb8a7e955df9d846f6dceafcb24a2d9e814fd28d5834d393c8554a383707ac2c` |
| `tests/fixtures/context.valid.json` | 295 | 2026-02-16 08:18:18 | `a9ebc8ee93233576c66d541f820ac5cfff2738fa155ea678a0ba23d609707c94` |
| `tests/fixtures/proposal.auto.json` | 222 | 2026-02-16 09:09:53 | `5f4ed0d687d86c6508749198d191f2bc862142a39bdb3aa83132f4b0353711db` |
| `tests/fixtures/proposal.demo-check.json` | 190 | 2026-02-16 08:59:00 | `665aafb9ff642ef370fd47c5e6dec8c967dbe365ce6b4f51814f6d1e03b5a9a0` |
| `tests/fixtures/proposal.invalid.json` | 90 | 2026-02-16 08:23:00 | `20d3fb277c8e22dacf26ff109c0ea4fcdf0a2b751d2b20d1f57db9908c9a7739` |
| `tests/fixtures/proposal.valid.json` | 190 | 2026-02-16 08:18:13 | `732ac716730242de204e9e643b81f475ffd12befce0f99e805c9c5b37d3ab1ef` |
| `tests/okx-demo-adapter.spec.ts` | 4895 | 2026-02-16 09:08:55 | `9c248f263b42e3e84095b50ed5bc7fb3daed87a2613c1af4bf29a85fb6c91302` |
| `tests/proposal-helper.spec.ts` | 2442 | 2026-02-16 09:02:04 | `4a3010d8af6acac630ff69c2f7bd75227d2f5ddb42b377ca49735cd9bf59a8c6` |
| `tests/reconciliation.spec.ts` | 3445 | 2026-02-16 09:10:16 | `94d83a0fb4c1bb0ffece49834295fa4cdc4b9ef027abd74fa5f1ad4c4ac06f99` |
| `tests/risk-gatekeeper.spec.ts` | 5156 | 2026-02-16 08:16:00 | `5d708889f2ad59de32b5152116ff4ead7302487045963bf75a607d2d922dd143` |
| `tests/TEST_PLAN.md` | 2553 | 2026-02-16 08:16:15 | `8cc0e2a87f4e729d9d83167f38dfac40fc08c469d21234055ea01c01f25d3834` |
| `tsconfig.json` | 452 | 2026-02-16 17:07:09 | `d6331a640070d8c030998b7ac27dfd1348069048489d62376e14e587e0674822` |
| `tsc-trace.log` | 1563480 | 2026-02-16 08:27:36 | `5854404d1a9ff8ebe0daf5c754056ec0343820a4b5c60aa36b81c6f8706c1dac` |
| `vitest.config.ts` | 200 | 2026-02-16 08:14:21 | `55096e8f7b13a8289ea7dd5999df2345c120c12bea1cad31b82b567003446717` |
