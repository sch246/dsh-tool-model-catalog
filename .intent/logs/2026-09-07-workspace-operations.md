# Workspace package and operation entry migration

The user authorized a uniform layout and operational entry map for independently maintained plugins, retaining their versions and optional cooperation. Self-owned BSD declarations may become MIT; third-party terms remain. This candidate moves the former root package to `packages/dsh-tool-model-catalog/` and makes the root a private pnpm workspace. Package name, version, exported paths relative to the package, Bundle ids and feature code remain unchanged. Root runtime forwarding is absent.

Root scripts use explicit Host selection and direct Node tools. Profile entry points require `DSH_CHECKOUT`, `DSH_HOME` and `DSH_PROFILE`, check by default, and transact only on explicit install/remove flags through the selected Host CLI. Existing Host patch routines retain their ownership checks and generated-output responsibilities. Their patch bytes are unchanged; upstream MIT notices are retained alongside patch excerpts.

No live checkout, profile, user data, service or remote ref was changed. Validation completed in the isolated candidate:

- `DSH_CHECKOUT=/root/deepseek-harness node scripts/build.mjs` passed (compiled package artifacts). Local tools were linked from an existing prepared workspace without installing dependencies.
- `node --check scripts/build.mjs` and `node --check scripts/profile.mjs` passed; modified shell installers also passed `bash -n`.
- A temporary absent Home probe ran `node scripts/profile.mjs inspect` with explicit target variables and confirmed no profile/Home creation. `inspect --install` failed without writing.
- A Python byte comparison against Git HEAD confirmed every moved source, test, game and Host patch file is unchanged. Changed README/STATE links resolved; `git diff --check` passed.

 Actual profile migration and user-visible acceptance remain separate integration work. Existing root path consumers must change to the child coordinate; STATE records the executable migration and data-preservation route.
