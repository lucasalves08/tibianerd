# Feature Specification: Exercise Weapon Calculator

**Feature Branch**: `feat/exercise-calculator`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Exercise weapon calculator for Tibia Global players. A player enters vocation, skill type, current skill level, percent left to the next level, target skill level and options that change training speed, and sees how many exercise weapons of each type they need, the total gold or Tibia Coin cost, and how long it takes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what it takes to reach a skill (Priority: P1)

A player wants to raise a skill. They choose their vocation and skill, enter the current level, the percent left and the target level, and see how many charges, weapons, gold, Tibia Coins and how much time it takes.

**Why this priority**: this is the question that brings players to the tool. It is useful on its own.

**Independent Test**: enter a known scenario and compare charges, cost and time with the reference result.

**Acceptance Scenarios**:

1. **Given** a Knight with melee 110 and 100% left, **When** the target is 120, **Then** the tool shows the charges, weapons, gold, Tibia Coins and time for that training.
2. **Given** a complete form, **When** the player changes any value, **Then** the result updates without a submit step.
3. **Given** a skill in progress, **When** the percent left changes, **Then** the result changes to count only the remaining part of the current level.

---

### User Story 2 - Choose how to buy the weapons (Priority: P2)

A player wants to know what to buy. The tool shows the amount needed if they use only Exercise, only Durable or only Lasting weapons, plus a suggested mix that starts with the largest weapons.

**Why this priority**: the total charges alone do not tell the player what to purchase.

**Independent Test**: confirm that each option covers the charges needed and that the mix uses the largest weapons that fit.

**Acceptance Scenarios**:

1. **Given** 2,000 charges are needed, **When** the result appears, **Then** the suggested mix is 1 Durable and 1 Exercise weapon.
2. **Given** any result, **When** the player reads a weapon option, **Then** it shows the quantity, gold and Tibia Coins for that option.

---

### User Story 3 - Include training bonuses (Priority: P3)

A player has loyalty points, trains on a private dummy or trains during a double skill event. They turn on these options and see the reduced amount.

**Why this priority**: bonuses change the purchase, but the tool already answers the main question without them.

**Independent Test**: compare one scenario with and without each option.

**Acceptance Scenarios**:

1. **Given** a calculated result, **When** the private dummy is on, **Then** the charges drop as if each charge were worth 10% more.
2. **Given** a calculated result, **When** the double skill event is on, **Then** the charges drop as if each charge were worth twice as much.
3. **Given** levels entered as shown in the game, **When** a loyalty bonus is chosen, **Then** the charges drop by that bonus.

---

### Edge Cases

- The target level is equal to or below the current level: the tool explains the problem and shows no result.
- The percent left is outside 0.01 to 100: the tool explains the valid range.
- A field is empty: the tool shows what is missing instead of a result of zero.
- The target level is above the supported range: the tool explains the limit.
- A skill does not apply to a vocation's formula: every vocation and skill pair uses its own rate.
- Very high results: numbers stay readable with thousands separators, and long durations appear in days and hours.
- The amount of charges is fractional: charges and weapons round up, because a player cannot buy part of a charge.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to choose a vocation: Knight, Paladin, Sorcerer, Druid or Monk.
- **FR-002**: Users MUST be able to choose a skill available to that vocation: Knight melee, shielding or magic; Paladin distance or magic; Sorcerer and Druid magic; Monk fist or magic.
- **FR-003**: Users MUST be able to enter the current level as shown in the game, the percent left to the next level and the target level.
- **FR-004**: The tool MUST show the total charges needed, rounded up.
- **FR-005**: The tool MUST show the quantity, gold and Tibia Coins needed using only Exercise, only Durable and only Lasting weapons.
- **FR-006**: The tool MUST suggest a mix that covers the charges, using as many Lasting as fit, then as many Durable as fit, then enough Exercise weapons for the rest.
- **FR-007**: The tool MUST show the total training time, using one charge every 2 seconds.
- **FR-008**: Users MUST be able to turn on a private dummy bonus of 10%.
- **FR-009**: Users MUST be able to turn on a double skill event and choose a loyalty bonus from 0% to 50%, in steps of 5%.
- **FR-010**: The result MUST update as values change, with no submit step.
- **FR-011**: The tool MUST validate input and explain each problem in Brazilian Portuguese.
- **FR-012**: The tool MUST work without login and remember the last values on the same browser when storage is available.
- **FR-013**: The tool MUST state that its data covers Tibia Global, and show the source and review date.
- **FR-014**: The tool MUST state the assumptions used in the result.
- **FR-015**: The home page MUST link to the tool and stop labeling it as unavailable.

### Key Entities

- **Training goal**: vocation, skill, current level, percent left and target level.
- **Training bonuses**: private dummy, double skill event and loyalty bonus.
- **Exercise weapon type**: name, charges, gold price and Tibia Coin price.
- **Training result**: charges, time, quantity and cost per weapon option, and the suggested mix.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can get a result in under 30 seconds on a phone.
- **SC-002**: Charges match TibiaPal and the TibiaWatch Tibia Global table within 1% in the reference scenarios.
- **SC-003**: The result updates with no perceptible delay after each change.
- **SC-004**: The tool works at 375 px wide with no horizontal scrolling.
- **SC-005**: Every invalid input from the edge cases shows a clear message and never a misleading result.

## Assumptions

- Training weapons from the Daily Reward System are out of scope.
- This version covers Tibia Global only. A server choice for RubinOT and other OTs comes later and needs its own data.
- Each charge lasts 2 seconds, and Exercise, Durable and Lasting weapons have 500, 1,800 and 14,400 charges, according to TibiaWiki.
- Gold prices are 434,028, 1,562,500 and 12,500,000, in force since October 6, 2026. Tibia Coin prices are 25, 90 and 720.
- Bred World follows RubinOT rates, so its 380,000 charges for Knight melee 110 to 120 are not a Tibia Global reference.
- The loyalty bonus divides the charges when levels are entered as shown in the game, as TibiaPal does. This is inferred from calculators and TibiaWiki and is not an official statement.
