# Page Contract: `/ferramentas/exercise`

## Inputs

| Label | Control | Default |
| --- | --- | --- |
| Vocação | Choice of 5 vocations | Knight |
| Skill | Choice limited by vocation | First available |
| Skill atual | Number, as shown in the game | Empty |
| % restante | Number from 0.01 to 100 | 100 |
| Skill desejada | Number, as shown in the game | Empty |
| Loyalty | Choice from 0% to 50% | 0% |
| Dummy privado | Checkbox | Off |
| Evento de skill em dobro | Checkbox | Off |

## Outputs

- Charges, training time, and the suggested mix with gold and Tibia Coins.
- The same values for each weapon used alone.
- A note that levels are the ones shown in the game, with loyalty.
- Data scope, source and review date.

## Behavior

- Results update on every change, without a submit button.
- Missing input shows guidance, not zero.
- Invalid input shows a message linked to its field.
- Changing vocation keeps the skill when it is available, or picks the first one.
