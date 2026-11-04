# Data Model: Exercise Weapon Calculator

## ExerciseWeapon

- `id`: `exercise`, `durable` or `lasting`
- `name`
- `charges`: 500, 1,800 or 14,400
- `goldPrice`: 434,028, 1,562,500 or 12,500,000
- `coinPrice`: 25, 90 or 720

## TrainingPair

- `vocation`, `skill`
- `pointsConstant` (A), `vocationConstant` (b), `offset` (c)
- `pointsPerCharge`

## TrainingGoal

- `pairId`
- `currentLevel`: whole number, at least the starting level
- `percentLeft`: from 0.01 to 100
- `targetLevel`: whole number above `currentLevel`, up to the supported limit

## TrainingBonuses

- `privateDummy`: multiplies points per charge by 1.1
- `doubleEvent`: multiplies points per charge by 2
- `loyaltyPercent`: 0 to 50 in steps of 5, multiplies points per charge by `1 + loyaltyPercent / 100`

## TrainingResult

- `charges`: points needed divided by effective points per charge, rounded up
- `seconds`: charges × 2
- `options`: quantity, gold and coins for each weapon alone, rounded up
- `mix`: Lasting, then Durable, then Exercise, and its gold and coins

## Validation

Invalid input returns a list of problems and no result.
