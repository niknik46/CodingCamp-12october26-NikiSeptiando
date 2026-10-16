# Implementation Plan: To-Do List Life Dashboard

## Overview

The implementation follows the layered architecture from the design: a pure-logic layer (greeting, validation, time/date formatting, timer state machine, serialization), a storage layer (Storage_Manager over Local Storage), and a UI layer (Clock, Greeting_Widget, Focus_Timer, Task_List, Quick_Links, Theme_Manager, Bootstrap). All application JavaScript lives in a single file `js/script.js`; styling in `css/style.css`; structure in `index.html`.

The pure-logic functions are exported from `js/script.js` using native ES module `export` so Vitest can import them for property-based tests with fast-check, while the browser loads the same file via `<script type="module">`. This keeps the single-file requirement (11.2) and the no-framework/no-bundler constraint (10.2) intact while making the logic layer testable. The UI and storage layers are verified with example-based and integration tests under jsdom with a mockable Local Storage.

Each component is implemented incrementally: pure functions first (with property-based tests close behind), then the UI component and its HTML markup, then example-based unit tests. Integration, smoke, and performance/visual tests run after the Bootstrap wires everything together.

## Tasks

- [x] 1. Set up project structure and test infrastructure
  - [x] 1.1 Create base project files
    - Create `index.html` entry point linking `css/style.css` and `js/script.js` (as a module), `css/style.css` (empty scaffold), and `js/script.js` (empty scaffold with module structure)
    - _Requirements: 11.1, 11.2, 11.3, 10.2_
  - [x] 1.2 Set up test infrastructure
    - Create `package.json`, Vitest config with jsdom environment, install fast-check, and create the test directory
    - Enables property-based testing (Requirement 9.3) and component/integration tests

- [x] 2. Implement Storage layer
  - [x] 2.1 Implement serialize and deserialize pure functions
    - `serialize(data)` returns a JSON string; `deserialize(json)` returns `{ data, error }` and catches parse errors
    - _Requirements: 9.1, 9.2_
  - [x]* 2.2 Write property test for serialization round-trip
    - **Property 16: Serialization round-trip preserves all valid data**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [x] 2.3 Implement Storage_Manager
    - `init()` availability probe, `save(key, data)` with try/catch, `load(key)` with try/catch, `isAvailable()`
    - _Requirements: 9.4, 9.5, 10.3, 10.4_
  - [x]* 2.4 Write unit tests for storage defaults
    - Test defaults on missing, empty, unparseable, and structurally-wrong JSON
    - _Requirements: 9.4_

- [x] 3. Implement Clock logic and component
  - [x] 3.1 Implement formatTime and formatDate pure functions
    - `formatTime(date)` returns "HH:MM:SS" 24-hour; `formatDate(date)` returns "Weekday, D Month YYYY"
    - _Requirements: 1.1, 1.2_
  - [x]* 3.2 Write property test for time formatting
    - **Property 2: Time formatting produces correct 24-hour string**
    - **Validates: Requirements 1.1**
  - [x]* 3.3 Write property test for date formatting
    - **Property 3: Date formatting produces full weekday, day, month, and year**
    - **Validates: Requirements 1.2**
  - [x] 3.4 Implement Clock component and HTML markup
    - `Clock.init/start/update` with a 1-second interval; add clock DOM elements to `index.html`
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Implement Greeting logic and component
  - [x] 4.1 Implement getGreeting and validateCustomName pure functions
    - `getGreeting(hour)` maps 0–23 to the greeting phrase; `validateCustomName(name)` accepts 1–50 chars
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.5_
  - [x]* 4.2 Write property test for greeting mapping
    - **Property 1: Greeting maps hour to correct time-of-day phrase**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - [x]* 4.3 Write property test for custom name validation
    - **Property 4: Custom name validation accepts only 1–50 non-whitespace characters**
    - **Validates: Requirements 3.1, 3.4, 3.5**
  - [ ] 4.4 Implement Greeting_Widget component and HTML markup
    - `init/update/setCustomName`; loads/saves the name via Storage_Manager; add greeting DOM elements to `index.html`
    - _Requirements: 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x]* 4.5 Write unit test for greeting display by hour
    - Test greeting display for a mocked current hour using local time
    - _Requirements: 2.5, 2.6_

- [ ] 5. Implement Focus Timer logic and component
  - [~] 5.1 Implement validateFocusDuration, getTimerState, formatCountdown pure functions
    - `validateFocusDuration(minutes)` accepts 1–120; `getTimerState(action, state)` models the state machine; `formatCountdown(seconds)` returns "MM:SS" or "HH:MM:SS"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.5_
  - [x]* 5.2 Write property test for focus duration validation
    - **Property 5: Focus duration validation accepts only integers 1–120**
    - **Validates: Requirements 5.1, 5.5**
  - [x]* 5.3 Write property test for timer state machine
    - **Property 6: Focus timer state machine transitions correctly for all state-action pairs**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.7**
  - [x]* 5.4 Write property test for countdown formatting
    - **Property 7: Countdown formatting represents durations up to 999 minutes**
    - **Validates: Requirements 4.6**
  - [~] 5.5 Implement Focus_Timer component and HTML markup
    - `init/start/stop/reset/setDuration` with a 1-second tick; loads/saves duration via Storage_Manager; add timer DOM elements to `index.html`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.3, 5.4_
  - [x]* 5.6 Write unit test for focus duration default
    - Test default to 25 minutes when the saved value is missing or out of range
    - _Requirements: 5.4_

- [ ] 6. Implement Task List logic and component
  - [~] 6.1 Implement validateTaskText and createTask pure functions
    - `validateTaskText(text)` accepts 1–255 chars; `createTask(text)` builds a Task with a generated ID and `completed: false`
    - _Requirements: 6.1, 6.2, 6.7_
  - [x]* 6.2 Write property test for task text validation
    - **Property 8: Task text validation accepts only 1–255 non-whitespace characters**
    - **Validates: Requirements 6.1, 6.2, 6.7**
  - [x]* 6.3 Write property test for task toggle involution
    - **Property 9: Task completion toggle is an involutive flip**
    - **Validates: Requirements 6.3**
  - [x]* 6.4 Write property test for task removal by ID
    - **Property 10: Task removal by ID removes exactly one matching element**
    - **Validates: Requirements 6.4**
  - [~] 6.5 Implement Task_List component and HTML markup
    - `init/add/edit/toggle/remove/getAll`; loads/saves tasks via Storage_Manager; add task DOM elements to `index.html`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x]* 6.6 Write unit test for task list default
    - Test default to an empty list when saved tasks are invalid or unavailable
    - _Requirements: 6.8_

- [ ] 7. Implement Quick Links logic and component
  - [~] 7.1 Implement validateLink, isValidUrl, createLink pure functions
    - `isValidUrl(url)` checks http/https protocol and ≤2048 chars; `validateLink(label, url)` validates label 1–50 and URL; `createLink(label, url)` builds a Link with an ID
    - _Requirements: 7.1, 7.6_
  - [x]* 7.2 Write property test for link validation
    - **Property 11: Link validation accepts only valid labels and http/https URLs**
    - **Validates: Requirements 7.1, 7.6**
  - [x]* 7.3 Write property test for link removal by ID
    - **Property 12: Link removal by ID removes exactly one matching element**
    - **Validates: Requirements 7.3**
  - [x]* 7.4 Write property test for link count cap
    - **Property 13: Link count cap rejects additions at 20 links**
    - **Validates: Requirements 7.7**
  - [~] 7.5 Implement Quick_Links component and HTML markup
    - `init/add/remove/open/getAll` with a 20-link cap; loads/saves links via Storage_Manager; add link DOM elements to `index.html`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

- [ ] 8. Implement Theme Manager logic and component
  - [~] 8.1 Implement validateTheme pure function
    - `validateTheme(theme)` accepts "light"/"dark" case-insensitive and rejects all other values
    - _Requirements: 8.1, 8.4_
  - [x]* 8.2 Write property test for theme toggle
    - **Property 14: Theme toggle returns the opposite theme**
    - **Validates: Requirements 8.1**
  - [x]* 8.3 Write property test for theme validation
    - **Property 15: Theme validation accepts only light or dark and defaults to light**
    - **Validates: Requirements 8.4**
  - [~] 8.4 Implement Theme_Manager component and HTML markup
    - `init/toggle/apply` setting a `data-theme` attribute; loads/saves theme via Storage_Manager; add toggle DOM elements to `index.html`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x]* 8.5 Write unit test for theme default
    - Test default to light when the saved theme is missing or invalid
    - _Requirements: 8.4_

- [x] 9. Checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Bootstrap and integration tests
  - [~] 10.1 Implement Bootstrap/init entry point
    - `init()` on DOMContentLoaded: detect storage availability, initialize all components in order, and bind global event listeners
    - _Requirements: 10.1, 2.5_
  - [x]* 10.2 Write integration test for clock interval update
    - Verify the clock updates the DOM every second without a page reload
    - _Requirements: 1.3_
  - [x]* 10.3 Write integration tests for persistence round-trips
    - Save and load custom name, focus duration, tasks, links, and theme through Local Storage
    - _Requirements: 3.2, 3.3, 5.2, 5.3, 6.5, 6.6, 7.4, 7.5, 8.2, 8.3_
  - [x]* 10.4 Write integration tests for storage failure paths
    - Mock `setItem` to throw `QuotaExceededError`; verify in-memory data is retained and an error is shown for tasks, links, theme, and general storage
    - _Requirements: 6.9, 7.8, 8.5, 9.5, 10.4_
  - [x]* 10.5 Write integration test for link open
    - Verify `window.open` is called with the URL and `_blank` target using a spy
    - _Requirements: 7.2_
  - [x]* 10.6 Write smoke tests
    - App loads/renders without a backend, no framework runtime dependencies, data persists via Local Storage, project structure files exist, functions and conditional/loop blocks have comments, local time used for greeting
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 11.4, 2.5_

- [ ] 11. Implement CSS, visual design, and performance tests
  - [~] 11.1 Implement css/style.css
    - Layout with non-overlapping components, light/dark themes via `data-theme`, and a text/background contrast ratio of at least 4.5:1 in both modes
    - _Requirements: 12.3, 12.4, 8.1_
  - [x]* 11.2 Write performance and visual tests
    - Components render within 2 seconds, data changes reflect within 100ms, component bounding boxes do not intersect, and contrast meets ≥ 4.5:1 in both light and dark modes
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 12. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation.
- Property tests validate universal correctness properties from the design; unit tests validate specific examples and edge cases; integration tests verify component wiring and storage behavior; smoke tests verify configuration and structure.
- The pure-logic functions are exported from `js/script.js` using native ES module `export` so Vitest can import them for property-based tests; the browser loads the same file via `<script type="module">`. This keeps the single-file requirement (11.2) and the no-framework/no-bundler constraint (10.2) intact while making the logic layer testable.
- Run tests with `npx vitest --run` for single execution; never use watch mode.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.4"] },
    { "id": 5, "tasks": ["3.3", "4.1"] },
    { "id": 6, "tasks": ["4.2", "4.4"] },
    { "id": 7, "tasks": ["4.3", "5.1"] },
    { "id": 8, "tasks": ["4.5", "5.2", "5.5"] },
    { "id": 9, "tasks": ["5.3", "6.1"] },
    { "id": 10, "tasks": ["5.4", "6.2", "6.5"] },
    { "id": 11, "tasks": ["5.6", "6.3", "7.1"] },
    { "id": 12, "tasks": ["6.4", "7.2", "7.5"] },
    { "id": 13, "tasks": ["6.6", "7.3", "8.1"] },
    { "id": 14, "tasks": ["7.4", "8.2", "8.4"] },
    { "id": 15, "tasks": ["8.3", "10.1"] },
    { "id": 16, "tasks": ["8.5", "10.2", "10.3", "10.4", "10.5", "10.6", "11.1"] },
    { "id": 17, "tasks": ["11.2"] }
  ]
}
```
