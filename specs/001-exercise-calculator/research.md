# Research: Exercise Weapon Calculator

Reviewed on 2026-11-04.

## Skill formula

- **Decision**: points for one level are `A × b^(skill − c)`. `c` is 0 for magic and 10 for the
  other skills. `A` is 1600 for magic, 50 for melee and fist, 30 for distance and 100 for
  shielding.
- **Rationale**: this is the TibiaWiki formula, and it reproduces the TibiaWatch Tibia Global table.
- **Alternatives considered**: Bred World, rejected because it uses RubinOT rates.

| Vocation | Pair | b |
| --- | --- | --- |
| Knight | Melee | 1.1 |
| Knight | Shielding | 1.1 |
| Knight | Magic | 3.0 |
| Paladin | Distance | 1.1 |
| Paladin | Magic | 1.4 |
| Sorcerer, Druid | Magic | 1.1 |
| Monk | Fist | 1.1 |
| Monk | Magic | 1.25 |

## Points per charge

- **Decision**: melee and fist 7.2, distance 4.32, shielding 14.4, magic 600.
- **Rationale**: TibiaWiki and TibiaPlan agree, and the results match the table below.
- **Alternatives considered**: 2.16 distance hits per charge, which applies to blood hits only and
  does not match the published table.

## Reference results

The TibiaWatch table for Tibia Global has no bonuses and starts with 100% left.

| Case | Published weapons | Published charges | Formula charges |
| --- | --- | --- | --- |
| Knight melee 110 to 120 | 105 L, 7 D, 2 E | 1,525,600 | 1,525,191 |
| Druid magic 110 to 120 | 105 L, 3 D, 4 E | 1,519,400 | 1,519,088 |
| Paladin distance 100 to 110 | 40 L, 6 D, 3 E | 588,300 | 588,028 |
| Monk fist 100 to 110 | 40 L, 6 D, 3 E | 588,300 | 588,028 |

TibiaPal is the second reference. It gives the amount of Exercise weapons alone, with no bonuses.

| Case | TibiaPal | Formula | Difference |
| --- | --- | --- | --- |
| Knight melee 110 to 120 | 3,039 | 3,051 | 0.4% |
| Druid magic 110 to 120 | 3,039 | 3,039 | 0% |
| Paladin distance 100 to 110 | 1,172 | 1,177 | 0.4% |
| Monk fist 100 to 110 | 1,172 | 1,177 | 0.4% |
| Knight shielding 100 to 110 | 1,172 | 1,177 | 0.4% |
| Knight magic 10 to 12 | 1,260 | 1,260 | 0% |
| Paladin magic 50 to 60 | 7,539,473 | 7,539,473 | 0% (rounded check) |
| Monk magic 50 to 60 | 12,426 | 12,426 | 0% |

TibiaPal gives non-magic skills the same result as magic. TibiaWatch stays closer to the TibiaWiki
values of 7.2, 4.32 and 14.4, so these stay in use. The 0.4% difference is inside the 1% criterion.

## Prices

- **Decision**: gold 434,028, 1,562,500 and 12,500,000. Tibia Coins 25, 90 and 720.
- **Rationale**: TibiaDaily reports CipSoft's 25% increase on October 6, 2026. TibiaPal's results
  use the same three prices.
- **Alternatives considered**: TibiaWiki and TibiaWatch still list the older prices.

## Bonuses

- **Decision**: private dummy ×1.1, double skill event ×2 and loyalty × (1 + bonus), all multiplied.
  Levels are entered as shown in the game.
- **Rationale**: TibiaPal gives these results: 3,039 base, 2,762 with dummy, 1,520 with event, 1,381
  with both, 2,762 with 10% loyalty and 2,026 with 50%. TibiaPal asks for the skill with loyalty.
  TibiaWiki says the displayed bonus is less than the percentage in levels, which fits a bonus on
  total points.
- **Alternatives considered**: leaving loyalty out, rejected because the wiki rule covers base skill
  while calculators work with the displayed skill. The loyalty rule is inferred, not official.

## Other servers, for later

Tibia Global ships first. The server choice comes later.

For RubinOT, TibiaWatch lists 10x up to skill 80, 7x up to 100, 4x up to 120 and 2x after that, with its own
table for magic level, plus 10% for VIP and 10% for the dummy. This explains the Bred World result.

## Sources

- https://tibia.fandom.com/wiki/Formulae
- https://tibia.fandom.com/wiki/Exercise_Weapons
- https://tibia.fandom.com/wiki/Loyalty_System
- https://tibiawatch.com/calculators/exercise-weapons
- https://tibiadaily.com/exercise-weapons-are-getting-more-expensive-again/
- https://tibiaplan.com/guides/tibia-exercise-weapons/
- https://tibiapal.com/exercise
