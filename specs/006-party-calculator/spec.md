# Feature Specification: Party Calculator

**Feature Branch**: `feat/party-calculator`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - Check a party (Priority: P1)

A player enters the vocation and level of each member, and sees whether the party shares experience, the bonus and what each member receives.

### User Story 2 - Find who can join (Priority: P2)

A player sees the level range that can join the party and still share experience.

**Acceptance Scenarios**:

1. **Given** a level 967 member alone, **When** the result appears, **Then** it shows levels 645 to 1450.
2. **Given** a Knight, a Paladin and a Druid in range, **When** the result appears, **Then** it shows a 70% bonus and 56.7% of the creature's experience for each member.
3. **Given** levels 100 and 200, **When** the result appears, **Then** it says the party does not share and that the lowest level must be at least 134.

## Requirements

- **FR-001**: Users MUST be able to add and remove members with a vocation and level.
- **FR-002**: The tool MUST apply the rule that the lowest level is at least 2/3 of the highest.
- **FR-003**: The tool MUST show the bonus from the number of different vocations.
- **FR-004**: The tool MUST remember the party in the browser and work without storage.
- **FR-005**: The tool MUST state that rules cover Tibia Global, with source and review date.
- **FR-006**: The tool MUST state the distance and activity conditions that it cannot check.

## Success Criteria

- **SC-001**: A player checks a party of four in under 30 seconds on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Rules come from the TibiaWiki Party page, reviewed on 2026-11-04. Its bonus list changed in June 2026, while its worked examples still show the older values.
- Bonuses are 20%, 35%, 70% and 100% for 1, 2, 3 and 4 different vocations.
- TibiaWiki lists no bonus for 5 different vocations, so the tool keeps 100% and says so.
- Sorcerers and Druids count as different vocations.
