# Project Index

Generated: 2026-02-16 09:11:52 UTC

## Summary
- Root: `.`
- Directories indexed: 21
- Files indexed: 71
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
        - okx-demo-cancel-cli.ts
        - okx-demo-execute-cli.ts
        - okx-demo-health-cli.ts
        - okx-demo-orders-cli.ts
        - okx-demo-reconcile-cli.ts
        - okx-proposal-helper-cli.ts
        - proposal-helper.ts
        - reconciliation.ts
      - package.json
    - research/
  - docs/
    - okx/
      - okx-docs-v5-en.html
      - source-verification.md
    - decisions.md
    - deep-research-report.md
    - learning-report.md
    - roadmap.md
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
    - logging-audit-replay.md
    - node-dashboard-patterns.md
    - python-research-pipeline.md
    - README.md
    - risk-gatekeeper.md
    - security-api-keys.md
    - trading-oracle.md
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
| `.env.example` | 1109 | 2026-02-16 09:09:21 | `a52a093532bf69dd5ebb30cf950c65b7f09d21f7a6f688cd84a36623ffd11ecd` |
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
| `apps/dashboard/src/okx-demo-cancel-cli.ts` | 4122 | 2026-02-16 09:07:52 | `3ea968a0d4fd17495f87bcdfc8d2fd07da0067bfe182a6460a6c14a6f1308577` |
| `apps/dashboard/src/okx-demo-execute-cli.ts` | 4218 | 2026-02-16 09:06:14 | `fd227bcccfbafe734eed97f8178faee4cd96296f3cf4fe2a06c7908a10027665` |
| `apps/dashboard/src/okx-demo-health-cli.ts` | 1691 | 2026-02-16 08:57:16 | `12fd73e0564d89a4b16b1c23edcdd5ba7bb18e6827868a6589866a278275f0f2` |
| `apps/dashboard/src/okx-demo-orders-cli.ts` | 2158 | 2026-02-16 09:07:13 | `00fdbd2a2e99bf379e09b5dc80face478e21ef0dbb4e56235148bca6ce6bb701` |
| `apps/dashboard/src/okx-demo-reconcile-cli.ts` | 3436 | 2026-02-16 09:07:31 | `768e6d9cf5b97ef0c7f6e901f3c6eb4272080bf59f70cb7f0e4d4ab8f799f8a4` |
| `apps/dashboard/src/okx-proposal-helper-cli.ts` | 4686 | 2026-02-16 09:02:41 | `5eed40d512c301142b91deb77e25d164cc22244255bd489a6cb685da7c0dccf0` |
| `apps/dashboard/src/proposal-helper.ts` | 6727 | 2026-02-16 09:01:09 | `c7904f9d9d4031626eae07d84e2c13fde3aeee8e158eb86af36e45834033e306` |
| `apps/dashboard/src/reconciliation.ts` | 6040 | 2026-02-16 09:10:08 | `e5f55769e0e1138f12facf33e0575cf932b4237298f02e58439f36490e7e8ee4` |
| `docs/decisions.md` | 2088 | 2026-02-15 08:26:13 | `63d8d3c8c3c79b27d331690ed9bd27f4829e5a8a0614002e0614dae42ab17aa8` |
| `docs/deep-research-report.md` | 33989 | 2026-02-13 07:01:58 | `c9fbd1c30c7797d84470c754e60895505aa69ae912d3539d4e36955ed1cd2540` |
| `docs/learning-report.md` | 5173 | 2026-02-15 08:44:50 | `5382135f52b032164ea444c4a4f30ba2640ce59c991223577482d76612f62c10` |
| `docs/okx/okx-docs-v5-en.html` | 4731242 | 2026-02-15 08:37:49 | `f46686a9f46827dc51b633b0dcb80331ada0a0a18e1dc44efe1ce3f6449c0459` |
| `docs/okx/source-verification.md` | 2779 | 2026-02-15 08:44:50 | `2ecd8ccbe303873fa80b753fd914f75c30a2cda753ad1ca7090d0aecc6c4facb` |
| `docs/roadmap.md` | 1512 | 2026-02-15 08:26:13 | `d0512bbf58fdea4b9d3751eaeaddf82807337dfb147a998cf616ccdad314a2ab` |
| `logs/okx-snapshot.json` | 2771 | 2026-02-16 09:09:36 | `398fbb03afe9ee8d650bcffac9819fe5e00c00813dbbcd5345a7c5cf8086b16d` |
| `logs/order-intents.jsonl` | 527 | 2026-02-16 09:10:35 | `0b55dab427203c4225bf7c7da0457b53134e0e32288fc829019aeba37a25b942` |
| `logs/reconcile-report.json` | 901 | 2026-02-16 09:09:42 | `f986871f719c9b77a42714dc634af4bb8a17baf0f95d0be58d08f9505c0a53df` |
| `package.json` | 916 | 2026-02-16 09:08:07 | `9d31a85a9650ac785c4ca8c7cf65fc6652d54394e65ed9683f0bd810c56cd001` |
| `package-lock.json` | 55327 | 2026-02-16 08:27:14 | `58428502cde6865e36a088f08fa24a5a4e27232a0cfee240240027cfb6dec7d3` |
| `packages/okx-demo-adapter/package.json` | 183 | 2026-02-16 08:25:46 | `e52f527393c9a8a8bfda9431c02394f745fc500f298979ee4b7e00f5564fd2df` |
| `packages/okx-demo-adapter/src/index.ts` | 7234 | 2026-02-16 09:06:30 | `95003ab16ba286c0141ca6c08655c5b4d0ac7342161cb4b0694dbdeee77f9019` |
| `packages/risk-gatekeeper/package.json` | 182 | 2026-02-16 08:17:52 | `2b47fc52824541ff54e151d3bea9a0c2798ca5e47bcd1ab3f280b0b053610936` |
| `packages/risk-gatekeeper/src/index.ts` | 5192 | 2026-02-16 08:15:17 | `231c7ee0c11a6005baccb148d74e26c4a77e0b8fd3e24925b63ecd373b2ab4d1` |
| `packages/shared/package.json` | 163 | 2026-02-16 08:22:05 | `2f30f4e4845845ba9f2a7a29ee88fdacf2380b2bf02cbf47c7bc8e4499a85ab3` |
| `packages/shared/src/index.ts` | 58 | 2026-02-16 08:22:19 | `3bcb2309866449a8c6fe6bb243bef2d006e0c3ee15dac3a9892d3f892678e453` |
| `packages/shared/src/schemas.ts` | 1833 | 2026-02-16 08:22:16 | `6c92756e8f8fadaaa397f12295d9cad8e834e91e3c866bda5c94e02e2ce06e75` |
| `packages/shared/src/types.ts` | 1541 | 2026-02-16 08:14:35 | `05029340e6c853bea2e894d9735d8f1a1e2a05a2c0d19bf7d50e93cfb2435e78` |
| `README.md` | 4313 | 2026-02-16 09:09:06 | `354dc7c3a23bfe9ea06f375baad6ce29a821df5371fe61293fcd8daf55aabc74` |
| `scripts/install-index-hooks.ps1` | 239 | 2026-02-16 07:42:01 | `2420afd0c3aca0b6bbf968754a814003dab3ee40f81410ea97137236162633ae` |
| `scripts/update-project-index.ps1` | 4280 | 2026-02-16 07:43:03 | `cfad26a7179677daccc8e102a741b3baa933bc3031ff7b523d4598079552e7f7` |
| `skills/architecture.md` | 957 | 2026-02-15 08:25:39 | `4cf99efbe8c8773c23996f9c38763fb7a40c0b9e9414fe1b802d99d129ecaba6` |
| `skills/logging-audit-replay.md` | 1063 | 2026-02-15 08:25:39 | `b43827ddfa91b28ed2af3798e776c71501b00c8c10aad6f0d62189a260b8aacc` |
| `skills/node-dashboard-patterns.md` | 1160 | 2026-02-15 08:25:39 | `224457b49f502d7b8add9b0f825910c9a1f2d51462386d7af6b0c4ed9996f25d` |
| `skills/okx/okx-auth-signing.md` | 1383 | 2026-02-15 08:39:17 | `4d881d94c373d2ff0128c4f204511359a78f941af2ab393ba75c3a8592519817` |
| `skills/okx/okx-demo-vs-live.md` | 1025 | 2026-02-15 08:39:17 | `3d7175597fb49e3c7e12a174ee8e5316e19e10ff8bd9e6fc1aa6719ab19e3a0e` |
| `skills/okx/okx-overview.md` | 1279 | 2026-02-15 08:39:17 | `c88b73a17f16a9d725fc6985e75bc2cdd03d19aacadd7364d626529fb83878ae` |
| `skills/okx/okx-rate-limits-errors.md` | 1589 | 2026-02-15 08:39:17 | `65c77852d8187c1dbff0f3d31ff9f54dfa3e04bee27e98a791f931c1b175872a` |
| `skills/python-research-pipeline.md` | 1107 | 2026-02-15 08:25:39 | `84d4b710a9be689148a79dcf362fe2a3e9683132676744174d8b11c16907d044` |
| `skills/README.md` | 1552 | 2026-02-16 08:05:59 | `8641480a5817cf56492ea21ad0545859aad9d45b88ac8dffb26ade68c1e26830` |
| `skills/risk-gatekeeper.md` | 1202 | 2026-02-15 08:33:09 | `6462052a76b16f85ab789fda220cf54aedc08ffb6c5a2fa88a20e228bbef7026` |
| `skills/security-api-keys.md` | 1391 | 2026-02-15 08:39:17 | `f8aeac08d67b6e2c1c20105f36a6bf53c116fe37f4931201d3d2767d8fbd1019` |
| `skills/trading-oracle.md` | 32746 | 2026-02-16 07:44:03 | `b248d923616037b2e5164bcbdb1ece1d8eed7dd38edf82869d667347f9ee0d21` |
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
| `tsconfig.json` | 405 | 2026-02-16 08:16:45 | `de4e9dd1c21de11f1aa563c84722586082daba0316a42879a09bfe9b9b16ba9d` |
| `tsc-trace.log` | 1563480 | 2026-02-16 08:27:36 | `5854404d1a9ff8ebe0daf5c754056ec0343820a4b5c60aa36b81c6f8706c1dac` |
| `vitest.config.ts` | 200 | 2026-02-16 08:14:21 | `55096e8f7b13a8289ea7dd5999df2345c120c12bea1cad31b82b567003446717` |
