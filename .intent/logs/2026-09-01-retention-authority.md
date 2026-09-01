# Independent model catalog retention

Date: 2026-09-01

## Authority

During the Harness alpha.2 migration, the user explicitly required retaining `tool-model-catalog` as the independent provider of `list_models`. This desired effect must survive retirement of `super-injector` and must be installed through the ordinary profile composition rather than an injector registry.

## Boundary

The user confirmed the capability, not every current response field, description, source layout, or implementation choice. Those details remain realization evidence until separately confirmed.
