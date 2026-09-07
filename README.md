# dsh-tool-model-catalog workspace

This repository keeps its independent Git history and intent map. The installable plugin is [packages/dsh-tool-model-catalog](packages/dsh-tool-model-catalog/README.md); the root is a private development workspace. Begin with [STATE](.intent/state/STATE.md) for effects, target prerequisites, data preservation and Host patch ownership.

Set `DSH_CHECKOUT`, `DSH_HOME` and `DSH_PROFILE` explicitly for profile operations. Build uses the selected checkout's prepared declarations and local development tools; prepare dependencies explicitly with `pnpm install --ignore-scripts`. Commands do not install build dependencies automatically.

| Entry from this root | Effect |
| --- | --- |
| `npm run build` | Build the child package; requires `DSH_CHECKOUT`. |
| `npm run typecheck` | Check the owning compiler programs. |
| `npm run setup` | Check the selected profile and, where owned, Host patch. |
| `npm run setup -- --install` | Install `packages/dsh-tool-model-catalog/` through the selected Host CLI and verify profile resolution. |
| `npm run inspect` | Read dependency, lockfile, resolved path and Bundle state without changing the profile. |
| `npm run remove` | Check removal state and, where owned, patch applicability. |
| `npm run remove -- --remove` | Remove the profile package; Host removal rules remain in STATE. |

The root is not a plugin coordinate. Migrate existing root links with the setup transaction after preparing the child package; update external source/build aliases in their owning repositories. Package versions, npm identities, exports and feature data remain independent. No script restarts a service. Self-owned code is MIT; any `patches/LICENSE` retains the Host excerpts' original MIT notice.
