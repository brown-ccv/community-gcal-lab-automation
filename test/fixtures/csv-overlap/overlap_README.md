# CSV Overlap Test Sets

Import these files in order to validate idempotent preview/import behavior.

## Order
1. `overlap-set-1.csv`
2. `overlap-set-2.csv`
3. `overlap-set-3.csv`

## Expected behavior
- Set 1 should create only new events.
- Set 2 should show a mix of duplicates and new events:
  - Overlaps with Set 1 for participant `8801` and `8802` B1/B2/B3 values.
  - Adds new events for participant `8805` and new B3/B4 values.
- Set 3 should again show a mix:
  - Overlaps with Set 1/2 for participant `8801` and `8804`.
  - Adds new events for participant `8806` and new B4 values.

Use CSV preview before each import to verify `importableEvents` vs `duplicateEvents`.
