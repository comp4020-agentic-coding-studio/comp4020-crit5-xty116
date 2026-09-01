# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

## Turnline game constraints

- The response is one game mechanic: toggle rail junctions while a live signal moves. Do not add inventory, dialogue, upgrades, a level menu, or a second input verb.
- The opening board must invite the first move visually. Visible copy must never explain controls or contain a tutorial, instructions, “click”, “tap”, or “how to play”.
- Every attempt has a terminal state. At least one available route must end in a hazard, while a deliberate sequence reaches the goal.
- Keep game rules in a pure TypeScript model. Write the focused route test before implementation; the canvas and DOM only render model state.
- Pointer, touch and keyboard players use the same junction buttons. Targets stay at least 44px, focus is visible, and route state is never conveyed by colour alone.
- The five-line campaign must finish inside five minutes while increasing planning or timing pressure. Do not make the first line a disguised tutorial screen.
- Run axe against the built page and enforce Lighthouse budgets for performance, accessibility, best practices, LCP, CLS and blocking time.
- Verify the deployed game at exactly 1920x1080 and 390x844 with no document overflow, console errors or layout shifts.
- A week-specific contract may be committed red once as a deliberate TDD baseline. The implementation commit immediately after it must return the full suite to green.
