# Feature Specification: Monster Lookup

**Feature Branch**: `feat/monster-lookup`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - Look up a creature (Priority: P1)

A player searches for a creature and sees its hit points, resistances and the best elemental charm.

**Acceptance Scenarios**:

1. **Given** the page is open, **When** the player searches for "dragon lord", **Then** the creature appears in the results.
2. **Given** a selected creature, **When** the details appear, **Then** the tool shows hit points, 7 resistances and the elemental charm with the highest damage.
3. **Given** a selected creature, **When** the player copies the page link, **Then** the link opens the same creature.

### Edge Cases

- No creature matches: the tool says so.
- Several elements tie: the tool shows every charm that ties.
- A creature is immune to every element: the tool says no elemental charm works.

## Requirements

- **FR-001**: Users MUST be able to search creatures by name, ignoring accents and case.
- **FR-002**: The tool MUST show hit points and the 7 damage modifiers.
- **FR-003**: The tool MUST show the best elemental charms and link to the charm optimizer.
- **FR-004**: The selected creature MUST be in the page link.
- **FR-005**: The tool MUST state that data covers Tibia Global, with source and review date.

## Success Criteria

- **SC-001**: A player finds a creature in under 15 seconds on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Only creatures with a Bestiary entry appear, because charms need one.
- Bosses stay out of this version.
- Overpower and Overflux depend on the character, so they appear only as a note.
