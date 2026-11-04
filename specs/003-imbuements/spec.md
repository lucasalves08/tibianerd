# Feature Specification: Imbuement Costs

**Feature Branch**: `feat/imbuements`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - See what an imbuement needs (Priority: P1)

A player chooses an imbuement and a tier, and sees the items, the shrine fee and where it can be used.

### User Story 2 - Compare the cost (Priority: P2)

A player enters market prices and sees the total cost per use and per hour. For Strike, Vampirism and Void, they also compare buying items with Gold Tokens.

**Acceptance Scenarios**:

1. **Given** Powerful Scorch, **When** the page shows the items, **Then** it lists 25 Fiery Heart, 5 Green Dragon Scale and 5 Demon Horn, and a 250,000 gold fee.
2. **Given** every price is filled, **When** the total appears, **Then** it adds the items and the fee, and shows the cost per hour over 20 hours.
3. **Given** a price is missing, **When** the total would appear, **Then** the tool says which price is missing.
4. **Given** Powerful Void with prices, **When** the player enters the Gold Token price, **Then** the tool shows the cheaper option.

## Requirements

- **FR-001**: Users MUST be able to choose any of the 24 imbuements and its 3 tiers.
- **FR-002**: The tool MUST show effect, items, amounts, shrine fee and valid equipment.
- **FR-003**: The tool MUST add market prices and the fee, and show the cost per hour.
- **FR-004**: The tool MUST compare with Gold Tokens only for Strike, Vampirism and Void.
- **FR-005**: The tool MUST remember prices on the same browser when storage is available.
- **FR-006**: The tool MUST state that data covers Tibia Global, with source and review date.

## Success Criteria

- **SC-001**: A player gets the cost of an imbuement in under 1 minute on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Market prices change by world, so the player enters them.
- Shrine fees are 7,500, 60,000 and 250,000 gold, from TibiaWiki.
- Yana trades items for 2, 4 or 6 Gold Tokens per tier. This comes from community answers and is stated on screen as something to confirm.
- Each imbuement lasts 20 hours of use.
- Imbuement Scrolls stay out of this version.
