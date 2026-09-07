# DSH tool-model-catalog

Status: draft product map for the independent model catalog retained while `super-injector` retires. Earlier records report an installed alpha.2 candidate; its current deployment and semantic acceptance are not established here.

## Product direction

Give an Agent a truthful, current discovery view of the models advertised by the running deployment. `list_models` helps a caller choose provider and model identifiers, including for `spawn_agent`, without depending on `super-injector` or turning discovery into execution policy.

## Required capabilities and verification

- The plugin can be installed and removed through ordinary profile composition without `super-injector`.
- A model in a profile containing the plugin can call `list_models` with no provider and receive every provider currently advertised by the LLM runtime with that provider's advertised models.
- A caller can request one exact provider id and receive only that provider. A provider id absent from the current runtime fails clearly instead of returning an empty successful result.
- Each invocation first attempts a live refresh. A successful refresh becomes the persisted snapshot used for later recovery.
- When live refresh fails and a prior readable snapshot exists, the call succeeds from that snapshot and identifies the result as cached with its capture time. Without a usable snapshot, the live failure remains visible.
- The response distinguishes live from cached information and marks catalog membership as advisory. A model absent from this catalog is not thereby forbidden from provider routing.
- Retiring `super-injector` does not remove or duplicate the capability.

Relevant verification calls the real tool in the composed profile, observes an all-provider response, an exact-provider response, and a contained live-refresh failure with and without an existing snapshot. Build success or reading source does not establish those effects.

## Installation and maintenance map

The recorded target is Harness alpha.2 at the revision in `STATE.json.resources`; it is compatibility evidence, not a permanent runtime requirement or proof of the present deployment. No realization lock is selected. Start here for current effects and operations; selected LOGs explain consequential choices, and any historical LOCK is optional recovery evidence.

### Sources, ownership and data

`packages/dsh-tool-model-catalog/src/index.ts` owns `list_models`, live refresh and snapshot fallback. The current snapshot path is `~/.dsh/storages/dsh-tool-model-catalog.json`, resolved from the OS home directory; `DSH_HOME` does not relocate it and no storage-path Config exists. A private profile therefore does not isolate this file. The package has no Host patch or browser contribution.

The [manifest](../../packages/dsh-tool-model-catalog/package.json), [Bundle patch](../../packages/dsh-tool-model-catalog/cordis.patch.yml) and [build script](../../scripts/build.mjs) own the current executable paths. Read the selected Harness checkout’s `apps/cli/reference/README.md` for profile composition and `docs/development.md` for its build prerequisites. Build against the same checkout that will run the profile, with its dependencies and required peer artifacts ready. Build scripts create local dependency links and `lib/`; these are replaceable outputs, unlike runtime data.

### Build, compose and remove

The repository root is a private development workspace; `packages/dsh-tool-model-catalog/` is the sole installable package. The npm name, package version, Bundle identity and public exports remain independent of other repositories. Source, build configs, tests, resources and output belong to that package; `.intent/`, Agent guidance and operation scripts stay at the repository root. There is no runtime forwarding package at the root. Self-owned code uses MIT; Host patch excerpts retain their upstream license where present.

Run the following from this repository root, with absolute paths for the selected Harness checkout and Home and one explicit profile name:

```sh
export DSH_CHECKOUT=/absolute/harness
export DSH_HOME=/absolute/home
export DSH_PROFILE=web
npm run build
npm run setup
npm run setup -- --install
npm run inspect
npm run remove
npm run remove -- --remove
```

`setup` and `remove` default to checks; only `--install` and `--remove` write. `inspect` reads the profile manifest, lockfile and resolved package without initializing the profile or reconciling its Bundle list. Build requires prepared Host declarations and this workspace's installed development tools; prepare dependencies explicitly with `pnpm install --ignore-scripts`. Local TypeScript is pinned to 5.9.3 and tsdown, where used, to 0.22.14; commands invoke Node tools directly and do not install dependencies.

Installation uses the built CLI at `$DSH_CHECKOUT/apps/cli/lib/bin.js` and the selected `DSH_HOME`/`DSH_PROFILE`, never an unrelated PATH CLI. It adds the absolute `packages/dsh-tool-model-catalog/` path through `dsh plugin`; removal uses the same transaction. The transaction owns dependency, pnpm lockfile, resolution and Bundle changes. After installation, `inspect` must name the selected package directory, one Bundle and a matching lock entry. After removal, dependency, resolution and Bundle must be absent; retained transitive consumers require investigation. No operation restarts a service.

For an existing root-package installation, inspect the current profile and retain its overrides, runtime data and existing Host receipt. Build the candidate, then use `setup --install` to replace the old root `link:`/`file:` coordinate with the child package through the selected CLI. Do not hand-edit only the Bundle or manifest. Update consumer-owned build aliases, scripts and paths that read the old root `src/`, `lib/` or patch locations; stable npm imports remain unchanged. A prior build or historical receipt does not establish acceptance of the changed profile. Probe changed composition in a private Home with the target package set before an authorized managed activation.

### Upgrade and verification

After a Harness upgrade, inspect the LLM provider/model listing APIs and adapter-update event, then adapt the live projection in `packages/dsh-tool-model-catalog/src/index.ts`. Preserve exact-provider filtering, capture time, live/cached distinction and advisory membership. Per-provider listing failure currently stays in that provider’s live result; whole-refresh or snapshot-write failure triggers cached fallback. If upstream supplies equivalent discovery, use one tool owner. A Host patch is conditional on a missing required native capability and must have attributable ownership and a removal path.

There is no package test script. Build checks API compatibility; use the real tool for all/exact/unknown-provider calls and controlled refresh failure with readable, missing and unreadable cache. Isolate or back up the actual home-based cache before failure probes, and verify one provider’s failure leaves successful providers visible. Do not infer fallback coverage from a provider-local failure.

Keep the snapshot by default. Removing the Bundle does not delete it; deliberate cache deletion is a separate data operation. Provider credentials and configuration remain Host-owned.

## Conditional avoidance

- When adapters or configuration change, the next successful live call reflects the running LLM registry rather than treating the snapshot as current authority.
- When cached data is returned, it must not be presented as live or used as an allowlist.
- Provider failure must not discard successful providers from an all-provider response; the affected provider remains identifiable with its failure.
- Credentials, provider configuration and mutable model policy never enter the persisted catalog payload.

## Target-dependent commitments

- When the target LLM runtime exposes provider model catalogs, `list_models` includes them and retains their advisory meaning.
- When the target cannot enumerate model membership, `list_models` exposes the narrowest provider discovery the runtime actually supplies and identifies the missing model catalog. It does not invent membership or recreate another framework's catalog concept.

Exact field names, labels and ordering are not yet locked behavior and may follow the target presentation until the user says one must remain.

## Non-goals

- Choosing a default model or changing provider configuration.
- Managing model credentials.
- Preserving the injector-based loading mechanism.
