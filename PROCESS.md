# Process overview

## What I built

TURNLINE is a five-line game about changing rail junctions before a moving signal reaches them. Its pulsing opening switch, bright destination, and red broken default route expose one verb without a start screen or explanatory copy.

![TURNLINE at the sharing-card viewport](public/card.png)

## The moments that mattered

1. **I made restraint enforceable before designing.** The harness limits the game to junction switching, bans tutorial language and second mechanics, requires terminal states, native controls, and both marking viewports. I also allowed exactly one deliberately red contract commit, with the next commit required to restore green. That turned “keep it small” into backpressure rather than taste ([`03c1a08`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/commit/03c1a08)).

2. **I separated rules from presentation.** Focused tests first described wrong routes, successful routes, live switching, and immutable endings. The pure graph model then made all six new rule tests pass before Canvas, audio, or animation existed. This let the visual implementation become expressive without hiding game-state bugs ([`03c1a08...fe5d9f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/compare/03c1a08...fe5d9f7)).

3. **I verified in layers.** At 1920×1080 and 390×844 there was no overflow, switches stayed at least 54px, a correct route won, and a wrong route produced `MISROUTED` ([`ee53217`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/commit/ee53217)). Axe and interface contracts brought the suite to 27 tests ([`dc5a731`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/commit/dc5a731)). CI then rejected the continuous idle animation: 0.86 performance and 544ms TBT. I added an on-demand rendering rule, stopped idle animation frames, and batched the initial grid. The next run scored performance 100, accessibility 100, LCP 1401ms, CLS 0, and TBT 0 ([`ce4207e...dc21867`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/compare/ce4207e...dc21867)).

4. **Playing changed the timing.** The automatic hand-off after `CONNECTED` felt too abrupt even though the state machine was correct. I extended the result hold from 1.25s to 1.6s so the consequence reads before the next network appears ([`b2e1770`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-xty116/commit/b2e1770)).
