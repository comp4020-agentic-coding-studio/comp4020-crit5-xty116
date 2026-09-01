# TURNLINE

A tiny live-routing game for COMP4020 Crit 5. Eight increasingly tangled rail
networks share one mechanic, staggered geometric signals, and terminal win/loss states.
The client is static and deploys directly to GitHub Pages.

## Verification

```sh
pnpm install
pnpm check
pnpm check:evidence
```

`pnpm check` type-checks and builds the production site, runs the model,
interface-contract and axe tests, then applies Lighthouse performance,
accessibility and Core Web Vitals budgets.

## Structure

- `game-model.ts` contains the pure, deterministic route state machine.
- `main.ts` renders the Canvas network, native junction controls and Web Audio.
- `spec/` holds the shared site invariants and Crit 5-specific sensors.
- `PROCESS.md` maps the implementation decisions to commits.
- `reflections/crit-5.md` contains the weekly reflection.
