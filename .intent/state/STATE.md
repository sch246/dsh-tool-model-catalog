# DSH tool-model-catalog

Status: draft product map for the independent model catalog retained while `super-injector` retires. The current alpha.2 candidate is installed but not yet accepted through a realization lock.

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

## Current alpha.2 realization map

- Build the package against the selected Harness source checkout so its declarations and runtime imports resolve the same alpha.2 APIs as the profile.
- Install the package checkout through `dsh plugin --profile <name> add <checkout>`. Its package manifest must contribute its own Bundle patch, and the profile must contain both the dependency and the Bundle membership.
- Restart the profile after Bundle membership changes. Confirm the composed config contains exactly one `dsh-tool-model-catalog` row and no `super-injector` owner for `list_models`.
- Perform the real tool observations above before accepting a realization. Package build, profile resolution and successful Host load are intermediate evidence only.

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
