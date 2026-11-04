# Feature Specification: Party Finder

**Feature Branch**: `feat/party-finder`

**Created**: 2026-11-04

**Status**: Draft

## User Scenarios

### User Story 1 - Register a character (Priority: P1)

A player signs in with Discord and registers a character with world, vocation and level.

### User Story 2 - Look for a party (Priority: P1)

A player publishes an ad saying when they want to hunt, and sees the people on the same world who can share experience with them.

### User Story 3 - Contact a player (Priority: P2)

A player sees the character name and Discord of the person they want to hunt with.

### User Story 4 - Keep the list clean (Priority: P2)

A player reports an abusive ad, and the maintainer can remove it.

**Acceptance Scenarios**:

1. **Given** a visitor without login, **When** they open the finder, **Then** they can read the ads but not publish.
2. **Given** a level 967 Paladin on Solarian in RubinOT, **When** the list appears, **Then** it shows only ads from that server and world, from levels 645 to 1450.
3. **Given** an ad past its time, **When** the list appears, **Then** the ad is gone.
4. **Given** a player deletes their account, **When** the deletion ends, **Then** their characters and ads are gone.

### User Story 5 - Find help for a boss (Priority: P2)

A player publishes an ad for a boss, and anyone on the same world sees it at any level.

## Requirements

- **FR-001**: Login MUST use Discord and MUST NOT be needed by any other tool.
- **FR-002**: Users MUST be able to add, edit and remove their characters.
- **FR-003**: Ads MUST expire on their own.
- **FR-004**: The list MUST show only real ads and MUST NOT imply activity that does not exist.
- **FR-005**: The list MUST filter by world, level and vocation.
- **FR-006**: Users MUST be able to report an ad, and each user MUST have an ad limit.
- **FR-007**: Users MUST be able to delete their account and data.
- **FR-009**: An ad MUST say if it looks for a hunt or a boss, and a boss ad MUST name the boss.
- **FR-008**: The site MUST publish a privacy page before login goes live.

## Success Criteria

- **SC-001**: A signed-in player publishes an ad in under a minute on a phone.
- **SC-002**: The page works at 375 px with no horizontal scrolling.

## Assumptions

- Boss names come from TibiaWiki, and players can type others, since RubinOT can differ.

- Every world of Tibia and RubinOT is open, and data from each stays apart. The maintainer plays on Vesperia, so that list is seeded first.
- Ads last 6 hours, a product choice that can change with real use.
- Characters are not verified in the first version, but they must exist: the server fetches them by name.
- Character data comes from TibiaData for Tibia and from the public character search of RubinOT, only when a signed-in player asks.
- The 2/3 level rule comes from Tibia Global and MUST be confirmed on RubinOT before launch.
- RubinOT has a free in-game Huntfinder with solo, duo and party filters, so hunt suggestions are not the core of this feature.
