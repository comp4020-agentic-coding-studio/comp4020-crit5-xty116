# Crit 5 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was learning the difference between one mechanic and one
decision. The first TURNLINE build had one input, but most lines only asked the
player to set a switch once and wait. Keeping the same junction control while
sending delayed square, circle, and diamond signals through shared tracks made
the decision evolve over time. Extending that rule to eight lines let the final
three build from four to six signals without adding a second system or tutorial
text. Moving the route logic into a pure graph model let me
test that signals launch on schedule, matching terminals win, mismatches lose,
and the final two-junction relay is solvable. Browser playtesting then answered
the separate question of whether those rules were visible. That is what exposed
the unlabelled signal queue as ambiguous and led to the `DISPATCH` treatment.

## What did this change about who I want to be as a software developer?

I want to become a developer who responds to "too simple" with better
relationships, not automatic feature accumulation. Restraint is useful only if
the remaining interaction still creates meaningful choices. TURNLINE also
changed how I think about evidence. Unit tests protected timing and fairness,
while a full desktop run and an intentional mobile failure exposed clarity,
touch size, and pacing. I want future work to keep both: deterministic tests for
the rules, and deliberate human use for qualities that only become visible in
motion.
