# Crit 5 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was deciding that the game did not need more mechanics; it
needed a stronger relationship between one action and its consequences. A rail
junction gave me a visual language for that. The bright destination, broken red
branches, moving signal and rotating switch all communicate the rule before any
words could. Once I moved the route logic into a pure graph model, I could prove
that wrong routes lose and correct routes win, then use the browser for the
different question of whether those outcomes felt readable. That separation
made the work much easier to direct: tests guarded fairness, while playtesting
guarded pace and clarity.

## What did this change about who I want to be as a software developer?

I want to become a developer who treats restraint as an engineering decision,
not as a lack of ambition. My first instinct is often to add content, screens or
features when an experience feels thin. TURNLINE showed me that depth can come
from timing, changing configurations and pressure inside one clear rule. It
also changed how I think about verification. A green unit test could confirm
the terminal state but could not tell me that the success transition moved too
quickly to read. I want my future workflow to keep both forms of evidence:
small deterministic tests for the system's rules, and deliberate human use for
the qualities that only become visible in motion.
