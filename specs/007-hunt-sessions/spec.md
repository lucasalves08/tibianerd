# Feature Specification: Hunt Sessions

**Feature Branch**: `feat/hunt-sessions`

**Created**: 2026-11-06

**Status**: Draft

## User Scenarios

### User Story 1 - Read a session (Priority: P1)

A player pastes a session from the Hunt Analyser and sees what they did per hour, without losing the real values of the session.

### User Story 2 - Keep a history (Priority: P2)

A signed-in player saves sessions with a character, a hunt name and a formation, and compares the average of each hunt.

**Acceptance Scenarios**:

1. **Given** a session of 1 hour or more, **When** it is pasted, **Then** the rates appear as a real average.
2. **Given** a session from 10 to 59 minutes, **When** it is pasted, **Then** the rates appear as a projection, next to the real values.
3. **Given** a session under 10 minutes, **When** it is pasted, **Then** only the real values appear.
4. **Given** the same session twice, **When** it is saved again, **Then** the player is told it is already there.

## Requirements

- **FR-001**: Reading a session MUST NOT need a login.
- **FR-002**: Rates MUST use the values given by the game when they exist.
- **FR-003**: Durations MUST come from the start and end of the session, because the session length is cut to the minute.
- **FR-004**: Players MUST be able to switch between Raw XP and XP, starting on Raw. Time per level MUST always use XP.
- **FR-004a**: A session MUST belong to a character: the only one the player has, or the one they choose. Estimates MUST use the level of that character.
- **FR-004b**: Once a session is read, the paste box MUST give way to the result, with a way to paste another. Saving MUST confirm that it worked and open the saved session.
- **FR-004c**: Saved sessions MUST start closed in a row with their rates, and open and close on a click. The Raw and XP choice MUST apply to the whole page.
- **FR-004d**: Rare drops MUST come from the loot rarity of TibiaWiki, counting an item only when no creature killed in the session drops it more often.
- **FR-005**: Saved sessions MUST be private, and the pasted text MUST NOT be kept.
- **FR-006**: The average of a hunt MUST divide totals by total time, and appear only for a hunt with more than one session.
- **FR-007**: Public sessions come in a later delivery, by the player's choice for each session.
