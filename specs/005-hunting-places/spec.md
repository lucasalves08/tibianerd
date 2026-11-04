# Feature Specification: Hunting Places

**Feature Branch**: `feat/hunting-places`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - Find a spot (Priority: P1)

A player enters vocation and level, and sees the hunting places open to them, strongest first.

### User Story 2 - Narrow the list (Priority: P2)

A player filters by city, name or the damage type that works best on the creatures of the spot.

**Acceptance Scenarios**:

1. **Given** a level 967 Paladin, **When** the list appears, **Then** it shows spots with a minimum level up to 967, with the highest first.
2. **Given** a spot, **When** it appears, **Then** it shows city, minimum level, experience and loot ratings, creatures and the best damage type.
3. **Given** the player picks fire, **When** the list updates, **Then** every spot has fire as a best damage type.

## Requirements

- **FR-001**: Users MUST be able to choose a vocation and enter a level.
- **FR-002**: Users MUST be able to filter by city, name and best damage type.
- **FR-003**: The tool MUST calculate the best damage type from the average resistances of the spot's creatures.
- **FR-004**: Each spot MUST link to its TibiaWiki page.
- **FR-005**: The tool MUST state that data covers Tibia Global, with source and review date.

## Success Criteria

- **SC-001**: A player finds spots for their level in under 30 seconds on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Data comes from TibiaWiki under CC-BY-SA, not from other fan sites.
- Knight levels also serve Monks, because TibiaWiki has no separate Monk field.
- Sorcerers and Druids share the mage level.
- The wiki level is a minimum recommendation, not a rule of the game.
- A hand-picked list from the maintainer can be added later as a highlight.
