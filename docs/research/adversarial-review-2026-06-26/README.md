# BoothBop Adversarial User Review - 2026-06-26

Twenty read-only subagents reviewed BoothBop from distinct first-time user
personas. The brief was intentionally negative: identify product confusion,
dealbreakers, missing features, and reasons not to pay.

The target market correction is encoded directly in the data. Consumer launch
personas drive prioritization. Business, trade-show, and professional operator
feedback is retained for future reference but marked `future_market_out_of_scope`
so it does not pull the near-term roadmap away from ordinary consumers.

## Files

- `personas.json`: one record per reviewer persona and verdict.
- `findings.jsonl`: one issue per line, normalized for tagging, clustering, and
  prioritization.
- `summary.md`: synthesized themes, severity counts, and recommended product
  pivots after all reviews complete.
- `schema.json`: field contract for the datastore.

## Severity

- `P0`: positioning or workflow failure that blocks trust or target-market fit.
- `P1`: major conversion, reliability, or comprehension problem.
- `P2`: meaningful friction or missing capability.
- `P3`: polish issue or lower-risk enhancement.

## Market Scope

- `consumer_launch`: ordinary consumer users we can target now.
- `consumer_adjacent_event`: consumer events with heavier host needs, useful but
  not the center of the first launch.
- `future_market_out_of_scope`: professional, business, or operator feedback
  that should not drive the current consumer launch plan.
