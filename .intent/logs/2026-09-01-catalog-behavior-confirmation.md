# Model catalog behavior confirmation

Date: 2026-09-01

## Authority

After the independent plugin was restored to the alpha.2 candidate, the user explicitly confirmed retaining all three presented behaviors: live catalog refresh, persistent cached fallback, and exact-provider filtering.

## Consequence

These are product commitments rather than incidental implementation. The owning STATE must describe when live data is attempted, when cached data may be returned, how the response reveals its source, and how provider filtering behaves. The catalog remains discovery information and must not become an allowlist that rejects a provider-interpreted model identifier.
