# Quickstart: Validate the Exercise Calculator

## Local

```bash
npm test
```

## Reference scenarios

Use no bonuses and 100% left.

| Scenario | Expected mix |
| --- | --- |
| Knight melee 110 to 120 | 105 Lasting, 7 Durable, 2 Exercise |
| Druid magic 110 to 120 | 105 Lasting, 3 Durable, 4 Exercise |
| Paladin distance 100 to 110 | 40 Lasting, 6 Durable, 3 Exercise |
| Monk fist 100 to 110 | 40 Lasting, 6 Durable, 3 Exercise |

Knight melee 110 to 120 takes about 35 days and 7 hours.

## Bonuses

- The private dummy divides the charges by 1.1.
- The double skill event divides the charges by 2.
- Both together divide the charges by 2.2.
- A 50% loyalty bonus divides the charges by 1.5.

## In the browser

1. Open `/tools/exercise` at 375 px.
2. Confirm there is no horizontal scrolling.
3. Enter a target below the current level and confirm the message.
4. Reload and confirm the values return.
5. Confirm the source, date and Tibia Global notice are visible.

CI runs the type checks, build and UI tests.
