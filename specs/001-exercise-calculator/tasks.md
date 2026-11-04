# Tasks: Exercise Weapon Calculator

**Input**: Design documents from `specs/001-exercise-calculator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page.md, quickstart.md

**Tests**: included, because the constitution requires unit tests for domain logic and reference checks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel, because it touches different files and has no pending dependency
- **[Story]**: the user story the task belongs to

## Phase 1: Setup

**Purpose**: add the tool to the site structure.

- [X] T001 Add `href: '/ferramentas/exercise'` to the `exercise` tool in `src/data/tools.ts`

---

## Phase 2: Foundational

**Purpose**: data and types that every story needs.

**CRITICAL**: no user story can start before this phase is complete.

- [X] T002 Create `src/data/exerciseWeapons.ts` with `ExerciseWeapon` entries: Exercise 500 charges, 434,028 gold, 25 coins; Durable 1,800 charges, 1,562,500 gold, 90 coins; Lasting 14,400 charges, 12,500,000 gold, 720 coins
- [X] T003 Add `TrainingPair` entries to `src/data/exerciseWeapons.ts` for the 8 pairs in `research.md`, with A, b, c and points per charge: magic A 1600, c 0, 600 points; melee and fist A 50, c 10, 7.2 points; distance A 30, c 10, 4.32 points; shielding A 100, c 10, 14.4 points
- [X] T004 Export a `tibiaGlobal` server data object from `src/data/exerciseWeapons.ts` with weapons, pairs, sources and the review date `2026-11-04`

**Checkpoint**: data is ready, and rules can receive it as a parameter.

---

## Phase 3: User Story 1 - See what it takes to reach a skill (Priority: P1) MVP

**Goal**: show charges, weapons, cost and time for a skill goal.

**Independent Test**: Knight melee 110 to 120 with 100% left shows 1,525,191 charges and about 35 days and 7 hours.

### Tests for User Story 1

- [X] T005 [P] [US1] Write failing unit tests in `src/domain/exerciseCalculator.test.ts` for the `research.md` scenarios within 1% of TibiaPal and TibiaWatch, the percent left, charges rounded up and `seconds = charges × 2`
- [X] T006 [P] [US1] Write failing validation tests in `src/domain/exerciseCalculator.test.ts`: target at or below current, percent outside 0.01 to 100, and an empty field

### Implementation for User Story 1

- [X] T007 [US1] Implement `getPointsForLevel` and `getPointsNeeded` in `src/domain/exerciseCalculator.ts`, using `A × b^(skill − c)` and only `percentLeft` of the current level
- [X] T008 [US1] Implement `calculateTraining(goal, bonuses, server)` in `src/domain/exerciseCalculator.ts`, returning `charges`, `seconds` and problems, without importing server data
- [X] T009 [US1] Create `src/components/ExerciseCalculator.tsx` with the inputs from `contracts/page.md`, and limit skills by vocation
- [X] T010 [US1] Show charges, time, Global notice, source, review date and the note about levels shown in the game in `src/components/ExerciseCalculator.tsx`
- [X] T011 [US1] Show guidance for missing input and messages linked to invalid fields in `src/components/ExerciseCalculator.tsx`
- [X] T012 [P] [US1] Style the tool in `src/components/ExerciseCalculator.module.css`, with tap targets of at least `var(--tap-target)` and no horizontal scrolling at 375 px
- [X] T013 [US1] Create `src/pages/ferramentas/exercise.astro` with `client:load`, Portuguese title and description
- [X] T014 [US1] Save and restore the last values in `src/components/ExerciseCalculator.tsx` under `tibianerd:exercise`, keeping the tool working when storage fails
- [X] T015 [P] [US1] Write UI tests in `e2e/exercise.spec.ts`: opening from the home page, the Knight reference, invalid target, reload and no horizontal scrolling

**Checkpoint**: User Story 1 works on its own.

---

## Phase 4: User Story 2 - Choose how to buy the weapons (Priority: P2)

**Goal**: show what to buy, for each weapon alone and as a mix.

**Independent Test**: Knight melee 110 to 120 suggests 105 Lasting, 7 Durable and 2 Exercise weapons.

### Tests for User Story 2

- [X] T016 [P] [US2] Write failing unit tests in `src/domain/exerciseCalculator.test.ts` for each weapon alone, 2,000 charges giving 1 Durable and 1 Exercise, and the four mixes in `quickstart.md`

### Implementation for User Story 2

- [X] T017 [US2] Implement `getWeaponOptions` in `src/domain/exerciseCalculator.ts`, rounding quantities up and returning gold and coins
- [X] T018 [US2] Implement `getSuggestedMix` in `src/domain/exerciseCalculator.ts`: as many Lasting as fit, as many Durable as fit, then enough Exercise weapons for the rest
- [X] T019 [US2] Show the mix and each option in `src/components/ExerciseCalculator.tsx`
- [X] T020 [P] [US2] Add a UI test for the Knight mix in `e2e/exercise.spec.ts`

**Checkpoint**: Stories 1 and 2 work together.

---

## Phase 5: User Story 3 - Include training bonuses (Priority: P3)

**Goal**: reduce the result with loyalty, private dummy and double skill event.

**Independent Test**: the private dummy divides the charges by 1.1, the event by 2 and 50% loyalty by 1.5.

### Tests for User Story 3

- [X] T021 [P] [US3] Write failing unit tests in `src/domain/exerciseCalculator.test.ts` for each bonus alone and all of them combined

### Implementation for User Story 3

- [X] T022 [US3] Apply `privateDummy` ×1.1, `doubleEvent` ×2 and `loyaltyPercent` × `(1 + loyaltyPercent / 100)` to points per charge in `src/domain/exerciseCalculator.ts`, with `loyaltyPercent` from 0 to 50 in steps of 5
- [X] T023 [US3] Add the Loyalty, Dummy privado and Evento de skill em dobro controls to `src/components/ExerciseCalculator.tsx`
- [X] T024 [US3] State that the loyalty rule is an estimate in `src/components/ExerciseCalculator.tsx`
- [X] T025 [P] [US3] Add a UI test for a bonus in `e2e/exercise.spec.ts`

**Checkpoint**: all user stories work.

---

## Phase 6: Polish

**Purpose**: final checks.

- [X] T026 Run `npm test` and fix any failure
- [X] T027 Check keyboard use and accessible names in `src/components/ExerciseCalculator.tsx`
- [X] T028 Check the manual steps in `specs/001-exercise-calculator/quickstart.md` in the browser
- [ ] T029 Open a pull request and let CI run the type checks, build and UI tests

---

## Dependencies & Execution Order

- Setup and Foundational come first.
- User Story 1 depends on Foundational.
- User Story 2 and User Story 3 depend on the rules and page from User Story 1.
- User Story 2 and User Story 3 can happen in either order, but both edit the same component.
- Polish comes last.

Within each story, tests come before the code that makes them pass.

## Parallel Example: User Story 1

```text
T005 and T006 share a file, so write them together.
T012 and T015 can run alongside the component tasks, because they touch other files.
```

## Implementation Strategy

1. Finish Phases 1 and 2.
2. Finish User Story 1, which is the MVP.
3. Add User Story 2, then User Story 3.
4. Use a draft pull request if the result needs review before it merges.

Rules take server data as a parameter, so a server choice can be added later.
