# Requirements Document

## Introduction

The To-Do List Life Dashboard is a lightweight, browser-based web application that helps users organize their day. It combines a live clock with a time-based greeting, a Pomodoro-style focus timer, a task list, and quick links to favorite websites. The application runs entirely client-side using HTML, CSS, and Vanilla JavaScript with data persisted through the browser Local Storage API. No backend server or external frameworks are required.

## Glossary

- **Dashboard**: The To-Do List Life Dashboard web application running in a modern browser.
- **Clock**: The component that displays the current time and date.
- **Greeting_Widget**: The component that displays a time-of-day greeting and a user-defined custom name.
- **Focus_Timer**: The Pomodoro-style countdown timer component.
- **Task_List**: The component that manages to-do tasks.
- **Quick_Links**: The component that manages favorite website link buttons.
- **Theme_Manager**: The component that switches and persists the light or dark display mode.
- **Storage_Manager**: The component that serializes, deserializes, and persists data through the browser Local Storage API.
- **Task**: A single to-do item consisting of text and a completion status.
- **Link**: A favorite website entry consisting of a display name and a URL.
- **Focus_Duration**: The countdown length, in minutes, used by the Focus_Timer.
- **Settings**: The collection of persisted user preferences including custom name, theme, and Focus_Duration.
- **Modern_Browser**: A current version of Chrome, Firefox, Edge, or Safari.

## Requirements

### Requirement 1: Time and Date Display

**User Story:** As a user, I want to see the current time and date, so that I can keep track of the day at a glance.

#### Acceptance Criteria

1. THE Clock SHALL display the current time in 24-hour format showing hours, minutes, and seconds, updated every second.
2. THE Clock SHALL display the current date showing the full weekday name, day, month, and year.
3. WHEN the system clock advances one second, THE Clock SHALL update the displayed time without reloading the page.

### Requirement 2: Time-Based Greeting

**User Story:** As a user, I want a greeting that reflects the time of day, so that the Dashboard feels personal and relevant.

#### Acceptance Criteria

1. WHILE the current hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display "Good Morning".
2. WHILE the current hour is between 12:00 and 16:59, THE Greeting_Widget SHALL display "Good Afternoon".
3. WHILE the current hour is between 17:00 and 20:59, THE Greeting_Widget SHALL display "Good Evening".
4. WHILE the current hour is between 21:00 and 04:59, THE Greeting_Widget SHALL display "Good Night".
5. THE Greeting_Widget SHALL determine the current hour using the user's local time zone.
6. WHEN the Dashboard is displayed, THE Greeting_Widget SHALL evaluate the current hour and display the greeting corresponding to the active time period.

### Requirement 3: Custom Name in Greeting

**User Story:** As a user, I want to set a custom name shown in the greeting, so that the Dashboard is personalized to me.

#### Acceptance Criteria

1. WHEN a user enters a custom name of 1 to 50 characters, THE Greeting_Widget SHALL display the name alongside the greeting.
2. WHEN a custom name of 1 to 50 characters is entered, THE Storage_Manager SHALL save the name to Local Storage.
3. WHEN the Dashboard loads, THE Greeting_Widget SHALL load the saved custom name from Local Storage and display it.
4. IF the saved custom name is empty or whitespace-only, THEN THE Greeting_Widget SHALL display the greeting without a name.
5. IF a user enters a custom name exceeding 50 characters, THEN THE Greeting_Widget SHALL reject the input and display an error message indicating the maximum length.

### Requirement 4: Focus Timer

**User Story:** As a user, I want a countdown focus timer, so that I can use the Pomodoro technique to stay focused.

#### Acceptance Criteria

1. WHILE the countdown has not been started, THE Focus_Timer SHALL display the configured Focus_Duration as the current countdown value.
2. WHEN the Start button is pressed and the countdown is not running, THE Focus_Timer SHALL begin counting down by decrementing the remaining time at 1-second intervals.
3. WHEN the Stop button is pressed, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
4. WHEN the Reset button is pressed, THE Focus_Timer SHALL reset the countdown to the configured Focus_Duration.
5. WHEN the countdown reaches zero, THE Focus_Timer SHALL stop and display a completion message.
6. WHERE a Focus_Duration is configured, THE Focus_Timer SHALL accept Focus_Duration values from 1 to 999 minutes.
7. IF the Start button is pressed while the countdown is already running, THEN THE Focus_Timer SHALL continue the countdown without restarting it.

### Requirement 5: Custom Focus Duration

**User Story:** As a user, I want to set a custom focus duration, so that I can adapt the timer to my workflow.

#### Acceptance Criteria

1. WHEN a user sets a custom Focus_Duration within the range of 1 minute to 120 minutes, THE Focus_Timer SHALL use the new duration for the countdown.
2. WHEN a custom Focus_Duration is set, THE Storage_Manager SHALL save the duration to Local Storage.
3. WHEN the Dashboard loads, THE Focus_Timer SHALL load the saved Focus_Duration from Local Storage and apply it as the countdown length.
4. IF the saved Focus_Duration is missing or outside the range of 1 minute to 120 minutes, THEN THE Focus_Timer SHALL default to 25 minutes.
5. IF a user sets a custom Focus_Duration outside the range of 1 minute to 120 minutes, THEN THE Focus_Timer SHALL reject the input, display an error message indicating the valid range, and retain the previously active Focus_Duration.

### Requirement 6: To-Do List Management

**User Story:** As a user, I want to manage my tasks, so that I can organize my day.

#### Acceptance Criteria

1. WHEN a user submits a new task with non-empty text of 1 to 255 characters, THE Task_List SHALL add the task to the displayed list.
2. WHEN a user edits a task to non-empty text of 1 to 255 characters, THE Task_List SHALL update the task text.
3. WHEN a user marks a task as done, THE Task_List SHALL toggle the task completion status.
4. WHEN a user deletes a task, THE Task_List SHALL remove the task from the list.
5. WHEN the Task_List changes, THE Storage_Manager SHALL save the tasks to Local Storage.
6. WHEN the Dashboard loads, THE Task_List SHALL load saved tasks from Local Storage and display them.
7. IF a user submits or edits a task with empty text or text exceeding 255 characters, THEN THE Task_List SHALL reject the input and display an error message indicating the valid length range.
8. IF saved tasks in Local Storage are invalid or unavailable, THEN THE Task_List SHALL initialize with an empty task list and display no tasks.
9. IF saving tasks to Local Storage fails, THEN THE Storage_Manager SHALL retain the current tasks in memory and display an error message indicating the save failed.

### Requirement 7: Quick Links Management

**User Story:** As a user, I want quick links to favorite websites, so that I can open them in a single click.

#### Acceptance Criteria

1. WHEN a user adds a Link with a valid URL (maximum 2048 characters) and a label (maximum 50 characters), THE Quick_Links SHALL add a button displaying the label.
2. WHEN a user clicks a link button, THE Quick_Links SHALL open the Link URL in a new browser tab.
3. WHEN a user deletes a Link, THE Quick_Links SHALL remove the corresponding button.
4. WHEN a Link is added or deleted, THE Storage_Manager SHALL save the links to Local Storage.
5. WHEN the Dashboard loads, THE Quick_Links SHALL load saved links from Local Storage and display them as buttons.
6. IF a user submits a Link with an invalid or empty URL, THEN THE Quick_Links SHALL reject the addition and display an error message indicating the URL is invalid.
7. IF the number of saved links reaches 20, THEN THE Quick_Links SHALL prevent the addition of new links and display an error message indicating the maximum number of links has been reached.
8. IF saving links to Local Storage fails, THEN THE Storage_Manager SHALL retain the current links in memory and display an error message indicating the save failed.

### Requirement 8: Light and Dark Mode Toggle

**User Story:** As a user, I want to toggle between light and dark mode, so that I can use the Dashboard comfortably in any lighting.

#### Acceptance Criteria

1. WHEN a user toggles the theme, THE Theme_Manager SHALL switch to the theme that is not currently applied.
2. WHEN the theme is changed, THE Storage_Manager SHALL save the theme preference to Local Storage.
3. WHEN the Dashboard loads, THE Theme_Manager SHALL load the saved theme from Local Storage and apply it.
4. IF the saved theme is missing or contains an invalid value, THEN THE Theme_Manager SHALL default to light mode.
5. IF Local Storage is unavailable or the save fails, THEN THE Theme_Manager SHALL retain the current theme for the session and display an error message indicating the save failed.

### Requirement 9: Data Persistence and Serialization

**User Story:** As a user, I want my data saved between sessions, so that I do not lose my tasks, links, and settings.

#### Acceptance Criteria

1. WHEN saving data, THE Storage_Manager SHALL serialize Tasks, Links, and Settings to JSON before writing to Local Storage.
2. WHEN loading data, THE Storage_Manager SHALL deserialize JSON from Local Storage into Tasks, Links, and Settings.
3. FOR ALL valid sets of Tasks (0 to 10,000 items), Links (0 to 10,000 items), and Settings with required fields present, serializing then deserializing SHALL produce a field-value-identical set of data (round-trip property).
4. IF Local Storage contains no data, empty values, or data that cannot be parsed as valid JSON matching the expected structure, THEN THE Storage_Manager SHALL initialize with default values.
5. IF writing to Local Storage fails, THEN THE Storage_Manager SHALL retain the current data in memory and display an error message indicating the save failed.

### Requirement 10: Browser Compatibility and Technology Stack

**User Story:** As a user, I want the Dashboard to run in my browser without setup, so that I can use it anywhere.

#### Acceptance Criteria

1. THE Dashboard SHALL load and render all user interface components and execute all operations in a Modern_Browser without requiring installation or a backend server.
2. THE Dashboard SHALL be implemented using HTML, CSS, and Vanilla JavaScript without external frameworks.
3. THE Dashboard SHALL persist all user-generated data and application state client-side using the browser Local Storage API.
4. IF the Local Storage API is unavailable or the storage quota is exceeded, THEN THE Dashboard SHALL display an error message indicating persistence failure and retain current session data in memory.

### Requirement 11: Project Structure

**User Story:** As a developer, I want a clear file structure, so that the code is maintainable and easy to read.

#### Acceptance Criteria

1. THE Dashboard SHALL place all CSS rules in a single file at css/style.css.
2. THE Dashboard SHALL place all JavaScript logic in a single file at js/script.js.
3. THE Dashboard SHALL provide an index.html file in the project root as the entry point.
4. THE Dashboard SHALL include a comment describing the purpose of each function and each code block containing conditional or loop logic in js/script.js.

### Requirement 12: Performance and Visual Design

**User Story:** As a user, I want a fast and clean interface, so that the Dashboard is pleasant to use throughout the day.

#### Acceptance Criteria

1. THE Dashboard SHALL display the Clock, Focus_Timer, Task_List, and Quick_Links, each populated with persisted data, within 2 seconds of the user opening the Dashboard in a Modern_Browser.
2. WHEN a user performs a data-changing action, THE Dashboard SHALL reflect the updated data in the affected component within 100 milliseconds.
3. THE Dashboard SHALL display the Clock, Focus_Timer, Task_List, and Quick_Links simultaneously in a single primary view such that the visible area of each component does not intersect the visible area of any other component.
4. THE Dashboard SHALL use displayed text with a contrast ratio of at least 4.5:1 against its background in both light and dark modes.
