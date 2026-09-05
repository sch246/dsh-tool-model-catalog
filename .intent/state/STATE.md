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

`src/index.ts` owns `list_models`, live refresh and snapshot fallback. The current snapshot path is `~/.dsh/storages/dsh-tool-model-catalog.json`, resolved from the OS home directory; `DSH_HOME` does not relocate it and no storage-path Config exists. A private profile therefore does not isolate this file. The package has no Host patch or browser contribution.

The [manifest](../../package.json), [Bundle patch](../../cordis.patch.yml) and [build script](../../scripts/build.sh) own the current executable paths. Read the selected Harness checkout’s `apps/cli/reference/README.md` for profile composition and `docs/development.md` for its build prerequisites. Build against the same checkout that will run the profile, with its dependencies and required peer artifacts ready. Build scripts create local dependency links and `lib/`; these are replaceable outputs, unlike runtime data.

### Build, compose and remove

Set absolute paths and the intended profile; run the build from this plugin checkout. The commands describe installation operations, not actions performed by this document update.

```bash
export DSH_CHECKOUT=/absolute/path/to/deepseek-harness
export DSH_HOME=/absolute/path/to/dsh-home
PROFILE=web
PLUGIN=/absolute/path/to/dsh-tool-model-catalog
cd "$PLUGIN"
DSH_CHECKOUT="$DSH_CHECKOUT" bash scripts/build.sh
cd "$DSH_CHECKOUT"
pnpm dsh plugin --profile "$PROFILE" add "$PLUGIN"
pnpm dsh plugin --profile "$PROFILE" why @dsh-external/dsh-tool-model-catalog
pnpm dsh --profile "$PROFILE" --dump-config
```

For a requested removal, use the same environment and run from the Harness checkout:

```bash
pnpm dsh plugin --profile "$PROFILE" remove @dsh-external/dsh-tool-model-catalog
```

`dsh plugin` maintains the profile dependency, pnpm lockfile, installed resolution and `dsh.profile.bundles` together. After add/update/remove, inspect all four under `$DSH_HOME/profiles/$PROFILE` and the composed config: exactly one `dsh-tool-model-catalog` row when installed, none when removed. Later profile/home patches replace a row’s complete config, so preserve existing overrides. A running profile retains its startup Bundle set; activation needs an authorized restart, then a fresh-session check for duplicate tool owners, including residual `super-injector` entries. For first install or changed composition, validate a candidate with the target package set in a private Home before changing a managed profile.

### Upgrade and verification

After a Harness upgrade, inspect the LLM provider/model listing APIs and adapter-update event, then adapt the live projection in `src/index.ts`. Preserve exact-provider filtering, capture time, live/cached distinction and advisory membership. Per-provider listing failure currently stays in that provider’s live result; whole-refresh or snapshot-write failure triggers cached fallback. If upstream supplies equivalent discovery, use one tool owner. A Host patch is conditional on a missing required native capability and must have attributable ownership and a removal path.

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
