# DSH tool-model-catalog

Status: draft independent capability selected for retention while `super-injector` retires. No realization lock is accepted.

## Intent

Provide the model-callable `list_models` capability as an independently installed DeepSeek Harness plugin. It reports the provider and model choices available in the current deployment so another capability, including `spawn_agent`, can select a valid model without depending on `super-injector`.

## Acceptance

- The plugin can be installed and removed through ordinary profile composition without `super-injector`.
- A model in a profile containing the plugin can call `list_models` and receive the models available from that running deployment.
- Retiring `super-injector` does not remove or duplicate the capability.

## Constraints and decisions

- The running LLM registry remains the source of deployed model availability; this plugin must not create a second configuration authority.
- Exact response fields, labels, descriptions, and ordering are not yet user-locked presentation.
- Builds and structural checks are implementation evidence. User observation on the real profile decides semantic acceptance.

## Non-goals

- Choosing a default model or changing provider configuration.
- Managing model credentials.
- Preserving the injector-based loading mechanism.
