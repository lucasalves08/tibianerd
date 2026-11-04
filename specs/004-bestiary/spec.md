# Feature Specification: Bestiary Tracker

**Feature Branch**: `feat/bestiary`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - Track progress (Priority: P1)

A player searches a creature, enters their kills and sees the stage, the kills left and the Charm Points of that entry.

### User Story 2 - See what is left (Priority: P2)

A player filters by class, hides finished entries and sees total Charm Points earned and still available.

**Acceptance Scenarios**:

1. **Given** Dragon, a Medium creature, **When** the player enters 600 kills, **Then** the tool shows stage 2 and 400 kills left.
2. **Given** a Very Rare Hard creature, **When** the player enters 5 kills, **Then** the entry is complete with 100 Charm Points.
3. **Given** saved kills, **When** the page reloads, **Then** the progress returns.

## Requirements

- **FR-001**: The tool MUST list Bestiary creatures with class, difficulty and rarity.
- **FR-002**: Users MUST be able to search by name, filter by class and hide finished entries.
- **FR-003**: Users MUST be able to enter kills for a creature.
- **FR-004**: The tool MUST show stage, kills left and Charm Points for each entry.
- **FR-005**: The tool MUST show total Charm Points earned and available.
- **FR-006**: Progress MUST stay on the same browser when storage is available.
- **FR-007**: The tool MUST state that data covers Tibia Global, with source and review date.

## Success Criteria

- **SC-001**: A player updates an entry in under 15 seconds on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Kill stages and points follow the TibiaWiki table.
- Progress stays in the browser, so it does not follow the player to another device.
- Only Very Rare creatures use the short table of 2, 3 and 5 kills.
