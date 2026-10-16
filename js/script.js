/*!
 * To-Do List Life Dashboard - Application Logic
 * ------------------------------------------------------------------
 * A single-file, framework-free client-side dashboard combining a live
 * clock, a time-based greeting, a Pomodoro-style focus timer, a to-do
 * list, and quick links. All user data and application state persist in
 * the browser via the Local Storage API; no backend server is required.
 *
 * Requirements: 10.2 (Vanilla JS, no frameworks), 11.2 (all JS in this file).
 *
 * Architecture (layered):
 *   - Logic Layer:   pure functions (no side effects) - validation,
 *                    formatting, greeting, timer state machine, serialization.
 *   - Storage Layer: Storage_Manager over the Local Storage API.
 *   - UI Layer:      DOM components (Clock, Greeting, Timer, Tasks, Links, Theme).
 *   - Bootstrap:     entry point wiring the components on DOMContentLoaded.
 *
 * This file is loaded as a regular (non-module) <script> so the app runs
 * standalone from the file:// protocol without ES module CORS restrictions.
 * All code is wrapped in an IIFE that reveals a single namespace object (TLD)
 * on the global scope, namespacing the components and avoiding global pollution.
 */
(function (global) {
  'use strict';

  /**
   * Single application namespace revealed on the global scope.
   * Exposing one object (instead of many globals) namespaces the components
   * and keeps global pollution to a minimum while remaining testable.
   */
  var TLD = {};

  /* ============================================================
   * LOGIC LAYER - Pure helper functions (no side effects)
   * These functions are isolated from DOM and Local Storage I/O so they
   * can be verified with property-based tests. See design.md.
   * ============================================================ */

  /**
   * serialize(data) encodes a value as a JSON string.
   * Pure function. (Requirement 9.1)
   * @param {unknown} data - value to serialize
   * @returns {string} JSON string
   */
  function serialize(data) {
    // Encode the value as a JSON string using the native JSON serializer.
    // JSON.stringify handles the plain types used by Tasks, Links, and
    // Settings (objects, arrays, strings, numbers, booleans, and null),
    // so the result can be written to Local Storage as text. (Requirement 9.1)
    return JSON.stringify(data);
  }

  /**
   * deserialize(json) parses a JSON string back to data, catching parse errors.
   * Pure function. (Requirement 9.2)
   * @param {string} json - JSON string to parse
   * @returns {{ data: unknown|null, error?: string }}
   */
  function deserialize(json) {
    // Attempt to parse the JSON string back into data.
    // Wrap JSON.parse in a try/catch so a malformed or empty string never
    // throws; instead it yields a safe null result with an error message
    // that lets callers fall back to default values. (Requirement 9.2)
    try {
      var data = JSON.parse(json);
      return { data: data };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }

  /**
   * pad2(value) zero-pads a non-negative integer to two digits.
   * Pure helper used by the time/countdown formatters. (Requirement 1.1)
   * @param {number} value - non-negative integer (expected 0-59 or 0-23)
   * @returns {string} two-digit string, e.g. 7 -> "07", 12 -> "12"
   */
  function pad2(value) {
    // Prefix a leading zero and take the last two characters so that both
    // single-digit (7 -> "07") and two-digit (12 -> "12") values yield a
    // fixed two-digit string without conditional branching.
    return ('0' + value).slice(-2);
  }

  /**
   * formatTime(date) returns the 24-hour time as "HH:MM:SS" with zero padding.
   * Pure function. (Requirement 1.1)
   * @param {Date} date - date value to format
   * @returns {string} "HH:MM:SS"
   */
  function formatTime(date) {
    // Read the local time components from the Date object. getHours() returns
    // 0-23 in 24-hour format, so no AM/PM conversion is needed. (Req 1.1)
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    // Pad each component to two digits with a leading zero. (Req 1.1)
    return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds);
  }

  /**
   * formatDate(date) returns the full date as "Weekday, D Month YYYY".
   * Pure function. (Requirement 1.2)
   * @param {Date} date - date value to format
   * @returns {string} "Weekday, D Month YYYY"
   */
  function formatDate(date) {
    // Full weekday names indexed by getDay() (0 = Sunday ... 6 = Saturday).
    var weekdays = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
    // Full month names indexed by getMonth() (0 = January ... 11 = December).
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    var weekday = weekdays[date.getDay()];
    var day = date.getDate();
    var month = months[date.getMonth()];
    var year = date.getFullYear();
    // Assemble "Weekday, D Month YYYY" (e.g. "Monday, 5 May 2025"). (Req 1.2)
    return weekday + ', ' + day + ' ' + month + ' ' + year;
  }

  /**
   * getGreeting(hour) maps an hour (0-23) to a time-of-day greeting phrase.
   * Pure function. (Requirements 2.1-2.4)
   * @param {number} hour - hour of the day, 0-23
   * @returns {string} one of "Good Morning", "Good Afternoon", "Good Evening", "Good Night"
   */
  function getGreeting(hour) {
    // Morning: hours 5-11 (05:00-11:59). (Requirement 2.1)
    if (hour >= 5 && hour <= 11) {
      return 'Good Morning';
    }
    // Afternoon: hours 12-16 (12:00-16:59). (Requirement 2.2)
    if (hour >= 12 && hour <= 16) {
      return 'Good Afternoon';
    }
    // Evening: hours 17-20 (17:00-20:59). (Requirement 2.3)
    if (hour >= 17 && hour <= 20) {
      return 'Good Evening';
    }
    // Night: hours 21-23 and 0-4 (21:00-04:59). (Requirement 2.4)
    return 'Good Night';
  }

  /**
   * validateCustomName(name) accepts names of 1-50 trimmed characters.
   * Pure function. (Requirements 3.1, 3.4, 3.5)
   * @param {string} name - custom name to validate
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateCustomName(name) {
    // Coerce null/undefined to empty string, then trim whitespace. (Req 3.1)
    var trimmed = (name == null ? '' : String(name)).trim();
    // Reject empty or whitespace-only names. (Requirement 3.4)
    if (trimmed.length === 0) {
      return { valid: false, error: 'Name is required' };
    }
    // Reject names exceeding 50 characters. (Requirement 3.5)
    if (trimmed.length > 50) {
      return { valid: false, error: 'Name must be 50 characters or fewer' };
    }
    return { valid: true };
  }

  /**
   * validateFocusDuration(minutes) accepts integers from 1 to 120.
   * Pure function. (Requirements 5.1, 5.5)
   * @param {number} minutes - focus duration to validate
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateFocusDuration(minutes) {
    // Check that the value is a finite number and an integer in range 1-120.
    // Non-numeric, NaN, Infinity, floats, and out-of-range values are rejected.
    if (typeof minutes !== 'number' || !isFinite(minutes) ||
        Math.floor(minutes) !== minutes || minutes < 1 || minutes > 120) {
      return { valid: false, error: 'Duration must be an integer between 1 and 120 minutes' };
    }
    return { valid: true };
  }

  /**
   * getTimerState(action, currentState) returns the next timer state for a
   * state-machine transition (start/stop/reset/tick). Pure function.
   * (Requirements 4.1-4.7)
   *
   * State machine:
   *   idle     + start -> running (remaining unchanged)
   *   idle     + reset -> idle (no-op)
   *   running  + start -> running (no-op, continue) (Req 4.7)
   *   running  + stop  -> paused (remaining unchanged)
   *   running  + reset -> idle (remaining = duration * 60)
   *   running  + tick  -> running (remaining - 1), or completed if remaining reaches 0
   *   paused   + start -> running (remaining unchanged)
   *   paused   + reset -> idle (remaining = duration * 60)
   *   completed + reset -> idle (remaining = duration * 60)
   *
   * @param {"start"|"stop"|"reset"|"tick"} action
   * @param {{ state: string, remaining: number, duration: number }} currentState
   * @returns {{ state: string, remaining: number, duration: number }}
   */
  function getTimerState(action, currentState) {
    var s = currentState.state;
    var r = currentState.remaining;
    var d = currentState.duration;

    // Handle the "reset" action: always returns to idle with full duration. (Req 4.4)
    if (action === 'reset') {
      return { state: 'idle', remaining: d * 60, duration: d };
    }

    // Handle the "start" action. (Req 4.2, 4.7)
    if (action === 'start') {
      // If already running, do nothing (no-op). (Requirement 4.7)
      if (s === 'running') {
        return { state: 'running', remaining: r, duration: d };
      }
      // From idle, paused, or completed: transition to running. (Req 4.2)
      if (s === 'idle' || s === 'paused' || s === 'completed') {
        return { state: 'running', remaining: r, duration: d };
      }
    }

    // Handle the "stop" action: pause from running only. (Req 4.3)
    if (action === 'stop') {
      if (s === 'running') {
        return { state: 'paused', remaining: r, duration: d };
      }
      // Stop from any other state is a no-op.
      return { state: s, remaining: r, duration: d };
    }

    // Handle the "tick" action: decrement from running only. (Req 4.5)
    if (action === 'tick') {
      if (s === 'running') {
        var newRemaining = r - 1;
        // When remaining reaches zero, transition to completed. (Req 4.5)
        if (newRemaining <= 0) {
          return { state: 'completed', remaining: 0, duration: d };
        }
        return { state: 'running', remaining: newRemaining, duration: d };
      }
      // Tick from any non-running state is a no-op.
      return { state: s, remaining: r, duration: d };
    }

    // Default: return the current state unchanged for unknown actions.
    return { state: s, remaining: r, duration: d };
  }

  /**
   * formatCountdown(totalSeconds) returns "MM:SS" or "HH:MM:SS", zero-padded.
   * Pure function. (Requirement 4.6)
   * @param {number} totalSeconds - remaining seconds to format
   * @returns {string} zero-padded countdown string
   */
  function formatCountdown(totalSeconds) {
    // Clamp negative values to zero for display purposes.
    if (totalSeconds < 0) {
      totalSeconds = 0;
    }
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    // Use "HH:MM:SS" for durations >= 60 minutes, "MM:SS" otherwise. (Req 4.6)
    if (hours > 0) {
      return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds);
    }
    return pad2(minutes) + ':' + pad2(seconds);
  }

  /**
   * validateTaskText(text) accepts 1-255 trimmed characters.
   * Pure function. (Requirements 6.1, 6.2, 6.7)
   * @param {string} text - task text to validate
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateTaskText(text) {
    // Coerce null/undefined to empty string, then trim whitespace.
    var trimmed = (text == null ? '' : String(text)).trim();
    // Reject empty or whitespace-only text. (Requirement 6.7)
    if (trimmed.length === 0) {
      return { valid: false, error: 'Task text is required' };
    }
    // Reject text exceeding 255 characters. (Requirement 6.7)
    if (trimmed.length > 255) {
      return { valid: false, error: 'Task text must be 255 characters or fewer' };
    }
    return { valid: true };
  }

  /**
   * generateId() creates a unique identifier using crypto.randomUUID() with
   * a fallback to timestamp+random for older browsers.
   * @returns {string} unique identifier
   */
  function generateId() {
    // Prefer the native crypto.randomUUID() when available (modern browsers).
    // Fall back to timestamp + random suffix for broader compatibility.
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  /**
   * createTask(text) builds a Task object with a generated id and completed=false.
   * (Requirement 6.1)
   * @param {string} text - task text
   * @returns {{ id: string, text: string, completed: boolean }}
   */
  function createTask(text) {
    var trimmed = (text == null ? '' : String(text)).trim();
    return { id: generateId(), text: trimmed, completed: false };
  }

  /**
   * isValidUrl(url) checks the URL is non-empty, <=2048 chars, and http/https.
   * Pure function. (Requirements 7.1, 7.6)
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  function isValidUrl(url) {
    // Reject null, undefined, non-string, or empty values.
    if (url == null || typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    // Reject URLs exceeding 2048 characters. (Requirement 7.1)
    if (url.length > 2048) {
      return false;
    }
    // Use the URL constructor to validate the URL structure, then check
    // that the protocol is http: or https:. (Requirement 7.6)
    try {
      var parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  /**
   * validateLink(label, url) validates label (1-50) and a valid http/https URL.
   * Pure function. (Requirements 7.1, 7.6)
   * @param {string} label - link label
   * @param {string} url - link URL
   * @returns {{ valid: boolean, error?: string }}
   */
  function validateLink(label, url) {
    // Validate the label: 1-50 non-empty trimmed characters.
    var trimmedLabel = (label == null ? '' : String(label)).trim();
    if (trimmedLabel.length === 0) {
      return { valid: false, error: 'Label is required' };
    }
    if (trimmedLabel.length > 50) {
      return { valid: false, error: 'Label must be 50 characters or fewer' };
    }
    // Validate the URL using the isValidUrl helper.
    if (!isValidUrl(url)) {
      return { valid: false, error: 'URL is invalid. Enter a valid http or https URL.' };
    }
    return { valid: true };
  }

  /**
   * createLink(label, url) builds a Link object with a generated id.
   * (Requirement 7.1)
   * @param {string} label - link label
   * @param {string} url - link URL
   * @returns {{ id: string, label: string, url: string }}
   */
  function createLink(label, url) {
    var trimmedLabel = (label == null ? '' : String(label)).trim();
    return { id: generateId(), label: trimmedLabel, url: url };
  }

  /**
   * validateTheme(theme) accepts "light"/"dark" (case-insensitive); rejects others.
   * Pure function. (Requirement 8.4)
   * @param {string} theme - theme value to validate
   * @returns {{ valid: boolean, normalized?: string }}
   */
  function validateTheme(theme) {
    // Coerce to lowercase string for case-insensitive comparison.
    if (theme == null || typeof theme !== 'string') {
      return { valid: false };
    }
    var lower = theme.toLowerCase().trim();
    if (lower === 'light' || lower === 'dark') {
      return { valid: true, normalized: lower };
    }
    return { valid: false };
  }

  /* ============================================================
   * STORAGE LAYER
   * Storage_Manager owns all Local Storage interaction: availability
   * detection, JSON serialization/deserialization, and read/write with
   * error handling. (Requirements 9 and 10)
   * ============================================================ */

  /** Storage keys namespaced with tld_ to avoid collisions. */
  var KEYS = {
    TASKS: 'tld_tasks',
    LINKS: 'tld_links',
    SETTINGS: 'tld_settings'
  };

  /** Storage_Manager module (revealing pattern). */
  var Storage_Manager = (function () {
    // Private cached availability flag, set once by init().
    var available = false;

    return {
      /**
       * init() probes Local Storage availability with a test write/read/delete.
       * (Requirements 9.4, 10.4)
       * @returns {boolean} true if Local Storage is usable
       */
      init: function () {
        try {
          var ls = global.localStorage;
          if (!ls) {
            available = false;
            return false;
          }
          var probeKey = 'tld_probe';
          var probeValue = '1';
          ls.setItem(probeKey, probeValue);
          var readBack = ls.getItem(probeKey);
          ls.removeItem(probeKey);
          available = readBack === probeValue;
          return available;
        } catch (e) {
          available = false;
          return false;
        }
      },

      /**
       * save(key, data) serializes data to JSON and writes to Local Storage.
       * (Requirements 9.5, 10.3, 10.4)
       * @param {string} key - storage key
       * @param {unknown} data - value to persist
       * @returns {{ success: boolean, error?: string }}
       */
      save: function (key, data) {
        try {
          var json = serialize(data);
          global.localStorage.setItem(key, json);
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      /**
       * load(key) reads and deserializes JSON from Local Storage.
       * (Requirements 9.4, 10.3)
       * @param {string} key - storage key
       * @returns {{ data: unknown|null, error?: string }}
       */
      load: function (key) {
        try {
          var json = global.localStorage.getItem(key);
          if (json === null || json === '') {
            return { data: null };
          }
          return deserialize(json);
        } catch (e) {
          return { data: null, error: e.message };
        }
      },

      /**
       * isAvailable() returns the cached Local Storage availability flag.
       * @returns {boolean}
       */
      isAvailable: function () {
        return available;
      }
    };
  })();

  /* ============================================================
   * HELPER: showError / clearError
   * Utility to show and clear inline error messages in a DOM element.
   * ============================================================ */

  /**
   * showError(el, message) sets the text content of an error element.
   * @param {HTMLElement|null} el - the error element
   * @param {string} message - the error message to display
   */
  function showError(el, message) {
    if (el) {
      el.textContent = message || '';
    }
  }

  /**
   * clearError(el) clears the text content of an error element.
   * @param {HTMLElement|null} el - the error element
   */
  function clearError(el) {
    if (el) {
      el.textContent = '';
    }
  }

  /**
   * showGlobalError(message) displays a non-blocking global error message.
   * The message auto-hides after 5 seconds. (Requirements 9.5, 10.4)
   * @param {string} message - the error message
   */
  function showGlobalError(message) {
    var el = document.getElementById('global-error');
    if (el) {
      el.textContent = message;
      // Auto-clear after 5 seconds so the message does not persist forever.
      setTimeout(function () {
        if (el.textContent === message) {
          el.textContent = '';
        }
      }, 5000);
    }
  }

  /**
   * loadSettings() loads the shared settings object from Local Storage,
   * returning defaults for any missing or invalid fields.
   * @returns {{ customName: string, theme: string, focusDuration: number }}
   */
  function loadSettings() {
    var result = Storage_Manager.load(KEYS.SETTINGS);
    var settings = result.data;
    // Build a validated settings object with defaults for missing fields.
    var defaults = { customName: '', theme: 'light', focusDuration: 25 };
    if (!settings || typeof settings !== 'object') {
      return defaults;
    }
    return {
      customName: (typeof settings.customName === 'string') ? settings.customName : '',
      theme: (typeof settings.theme === 'string') ? settings.theme : 'light',
      focusDuration: (typeof settings.focusDuration === 'number' &&
                      settings.focusDuration >= 1 && settings.focusDuration <= 120)
        ? settings.focusDuration
        : 25
    };
  }

  /**
   * saveSettings(updates) merges partial updates into the persisted settings.
   * @param {object} updates - fields to update (e.g. { theme: 'dark' })
   * @returns {{ success: boolean, error?: string }}
   */
  function saveSettings(updates) {
    var settings = loadSettings();
    // Merge each provided key into the existing settings.
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        settings[key] = updates[key];
      }
    }
    var result = Storage_Manager.save(KEYS.SETTINGS, settings);
    // If save failed, display a global error. (Requirements 9.5, 10.4)
    if (!result.success) {
      showGlobalError('Could not save settings: ' + (result.error || 'Unknown error'));
    }
    return result;
  }

  /* ============================================================
   * UI LAYER - DOM components
   * Each component owns a DOM region and exposes init/render methods.
   * ============================================================ */

  /** Clock component: live 24-hour time and date. (Requirements 1.1-1.3) */
  var Clock = (function () {
    var timeEl = null;
    var dateEl = null;
    var intervalId = null;

    return {
      /**
       * init() caches clock DOM elements and renders the current time/date
       * immediately so the clock shows correct values before the first tick.
       * (Requirements 1.1, 1.2)
       */
      init: function () {
        timeEl = document.getElementById('clock-time');
        dateEl = document.getElementById('clock-date');
        this.update();
      },

      /**
       * start() starts a setInterval that calls update() every 1000ms.
       * Guards against stacking duplicate intervals. (Requirements 1.1, 1.3)
       */
      start: function () {
        if (intervalId !== null) {
          return;
        }
        intervalId = setInterval(this.update.bind(this), 1000);
      },

      /**
       * update() reads the current Date and writes formatted time/date to DOM.
       * (Requirements 1.1, 1.2, 1.3)
       */
      update: function () {
        var now = new Date();
        if (timeEl) {
          timeEl.textContent = formatTime(now);
        }
        if (dateEl) {
          dateEl.textContent = formatDate(now);
        }
      }
    };
  })();

  /** Greeting_Widget: time-of-day greeting and custom name. (Requirements 2, 3) */
  var Greeting_Widget = (function () {
    var greetingTextEl = null;
    var nameInputEl = null;
    var errorEl = null;
    var customName = '';

    return {
      /**
       * init() loads the saved custom name from settings, seeds the input,
       * and renders the greeting. (Requirements 2.5, 2.6, 3.3, 3.4)
       */
      init: function () {
        greetingTextEl = document.getElementById('greeting-text');
        nameInputEl = document.getElementById('custom-name-input');
        errorEl = document.getElementById('greeting-error');

        var settings = loadSettings();
        customName = settings.customName || '';

        // Seed the name input with the loaded value. (Requirement 3.3)
        if (nameInputEl) {
          nameInputEl.value = customName;
        }
        // Render the greeting immediately. (Req 2.5, 2.6)
        this.update();
      },

      /**
       * update() reads the current local hour, computes the greeting,
       * and writes it with the optional custom name to the DOM.
       * (Requirements 2.5, 2.6, 3.1, 3.4)
       */
      update: function () {
        var hour = new Date().getHours();
        var greeting = getGreeting(hour);
        // Append custom name if set: "Good Morning, Name!" (Req 3.1, 3.4)
        var display = customName
          ? greeting + ', ' + customName + '!'
          : greeting;
        if (greetingTextEl) {
          greetingTextEl.textContent = display;
        }
      },

      /**
       * setCustomName(name) validates, saves, and re-renders the custom name.
       * (Requirements 3.1, 3.2, 3.5)
       * @param {string} name - custom name to set
       * @returns {{ valid: boolean, error?: string }}
       */
      setCustomName: function (name) {
        var result = validateCustomName(name);
        if (!result.valid) {
          showError(errorEl, result.error);
          return result;
        }
        clearError(errorEl);
        var trimmed = (name == null ? '' : String(name)).trim();
        customName = trimmed;
        // Persist the name in the shared Settings object. (Req 3.2)
        saveSettings({ customName: trimmed });
        this.update();
        return { valid: true };
      }
    };
  })();

  /** Focus_Timer: Pomodoro-style countdown. (Requirements 4, 5) */
  var Focus_Timer = (function () {
    // Timer state variables
    var state = 'idle';       // 'idle' | 'running' | 'paused' | 'completed'
    var remaining = 25 * 60;  // remaining seconds
    var duration = 25;        // configured duration in minutes
    var intervalId = null;    // handle to the active setInterval

    // Cached DOM elements
    var displayEl = null;
    var statusEl = null;
    var errorEl = null;
    var durationInput = null;

    /**
     * render() updates the timer display and status text based on current state.
     */
    function render() {
      if (displayEl) {
        displayEl.textContent = formatCountdown(remaining);
        // Add/remove the 'completed' class for visual feedback.
        if (state === 'completed') {
          displayEl.classList.add('completed');
        } else {
          displayEl.classList.remove('completed');
        }
      }
      // Show a completion message when the timer finishes. (Req 4.5)
      if (statusEl) {
        if (state === 'completed') {
          statusEl.textContent = '🎉 Time\'s up! Great focus session!';
        } else {
          statusEl.textContent = '';
        }
      }
    }

    /**
     * tick() is called every second while the timer is running.
     * Applies the 'tick' action through the state machine. (Req 4.5)
     */
    function tick() {
      var next = getTimerState('tick', {
        state: state, remaining: remaining, duration: duration
      });
      state = next.state;
      remaining = next.remaining;
      render();
      // If the timer completed, stop the interval. (Req 4.5)
      if (state === 'completed') {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    return {
      /**
       * init() loads the saved focus duration, applies defaults, and renders.
       * (Requirements 5.3, 5.4)
       */
      init: function () {
        displayEl = document.getElementById('timer-display');
        statusEl = document.getElementById('timer-status');
        errorEl = document.getElementById('timer-error');
        durationInput = document.getElementById('focus-duration-input');

        // Load saved duration from settings. (Req 5.3)
        var settings = loadSettings();
        duration = settings.focusDuration;
        remaining = duration * 60;

        // Seed the duration input with the loaded value.
        if (durationInput) {
          durationInput.value = duration;
        }
        render();
      },

      /**
       * start() begins the countdown if not already running. (Req 4.2, 4.7)
       * If already running, does nothing (no-op).
       */
      start: function () {
        // If already running, no-op. (Requirement 4.7)
        if (state === 'running') {
          return;
        }
        // Apply state transition through the state machine.
        var next = getTimerState('start', {
          state: state, remaining: remaining, duration: duration
        });
        state = next.state;
        remaining = next.remaining;
        // Start the 1-second tick interval.
        if (intervalId !== null) {
          clearInterval(intervalId);
        }
        intervalId = setInterval(tick, 1000);
        clearError(errorEl);
        render();
      },

      /**
       * stop() pauses the countdown and retains remaining time. (Req 4.3)
       */
      stop: function () {
        var next = getTimerState('stop', {
          state: state, remaining: remaining, duration: duration
        });
        state = next.state;
        remaining = next.remaining;
        // Clear the interval so ticking stops.
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        render();
      },

      /**
       * reset() resets remaining time to the configured duration and stops.
       * (Req 4.4)
       */
      reset: function () {
        var next = getTimerState('reset', {
          state: state, remaining: remaining, duration: duration
        });
        state = next.state;
        remaining = next.remaining;
        // Clear the interval.
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        clearError(errorEl);
        render();
      },

      /**
       * setDuration(minutes) validates and saves a custom focus duration.
       * Resets the timer to the new duration. (Req 5.1, 5.5)
       * @param {number} minutes - new duration in minutes
       * @returns {{ valid: boolean, error?: string }}
       */
      setDuration: function (minutes) {
        var result = validateFocusDuration(minutes);
        if (!result.valid) {
          showError(errorEl, result.error);
          return result;
        }
        clearError(errorEl);
        duration = minutes;
        // Reset the timer to the new duration. (Req 5.1)
        remaining = duration * 60;
        state = 'idle';
        // Clear any running interval.
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        // Persist the new duration. (Req 5.2)
        saveSettings({ focusDuration: duration });
        // Update the input to reflect the new value.
        if (durationInput) {
          durationInput.value = duration;
        }
        render();
        return { valid: true };
      }
    };
  })();

  /** Task_List: to-do management. (Requirement 6) */
  var Task_List = (function () {
    // In-memory array of task objects.
    var tasks = [];

    // Cached DOM elements
    var listEl = null;
    var inputEl = null;
    var errorEl = null;

    /**
     * saveTasks() persists the current task list to Local Storage.
     * On failure, retains data in memory and shows a global error. (Req 6.5, 9.5)
     */
    function saveTasks() {
      var result = Storage_Manager.save(KEYS.TASKS, tasks);
      if (!result.success) {
        showGlobalError('Could not save tasks: ' + (result.error || 'Unknown error'));
      }
    }

    /**
     * renderTasks() re-renders the entire task list in the DOM.
     * Each task gets a checkbox (toggle), text, edit button, and delete button.
     * (Requirements 6.1-6.4)
     */
    function renderTasks() {
      if (!listEl) return;
      listEl.innerHTML = '';

      // Show empty state message when there are no tasks.
      if (tasks.length === 0) {
        var emptyMsg = document.createElement('li');
        emptyMsg.className = 'tasks-empty';
        emptyMsg.textContent = 'No tasks yet. Add one above!';
        listEl.appendChild(emptyMsg);
        return;
      }

      // Create a DOM element for each task.
      for (var i = 0; i < tasks.length; i++) {
        (function (task) {
          var li = document.createElement('li');
          // Add 'completed' class for styling when task is done. (Req 6.3)
          if (task.completed) {
            li.classList.add('completed');
          }

          // Checkbox to toggle completion status. (Req 6.3)
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = task.completed;
          checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' +
            (task.completed ? 'incomplete' : 'complete'));
          checkbox.addEventListener('change', function () {
            Task_List.toggle(task.id);
          });
          li.appendChild(checkbox);

          // Task text span. (Req 6.1)
          var textSpan = document.createElement('span');
          textSpan.className = 'task-text';
          textSpan.textContent = task.text;
          li.appendChild(textSpan);

          // Action buttons container
          var actions = document.createElement('div');
          actions.className = 'task-actions';

          // Edit button (Req 6.2)
          var editBtn = document.createElement('button');
          editBtn.className = 'btn-sm';
          editBtn.textContent = '✏️';
          editBtn.setAttribute('aria-label', 'Edit "' + task.text + '"');
          editBtn.addEventListener('click', function () {
            // Replace text span with an input for inline editing.
            var editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'task-edit-input';
            editInput.value = task.text;
            editInput.maxLength = 255;
            li.replaceChild(editInput, textSpan);
            editInput.focus();

            // Replace edit button with save button.
            var saveBtn = document.createElement('button');
            saveBtn.className = 'btn-sm';
            saveBtn.textContent = '💾';
            saveBtn.setAttribute('aria-label', 'Save edit');
            actions.replaceChild(saveBtn, editBtn);

            // Save on click or Enter key.
            function saveEdit() {
              var newText = editInput.value;
              Task_List.edit(task.id, newText);
            }
            saveBtn.addEventListener('click', saveEdit);
            editInput.addEventListener('keydown', function (e) {
              if (e.key === 'Enter') {
                saveEdit();
              }
            });
          });
          actions.appendChild(editBtn);

          // Delete button (Req 6.4)
          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn-sm btn-danger';
          deleteBtn.textContent = '🗑️';
          deleteBtn.setAttribute('aria-label', 'Delete "' + task.text + '"');
          deleteBtn.addEventListener('click', function () {
            Task_List.remove(task.id);
          });
          actions.appendChild(deleteBtn);

          li.appendChild(actions);
          listEl.appendChild(li);
        })(tasks[i]);
      }
    }

    return {
      /**
       * init() loads saved tasks from Local Storage (or empty list on failure)
       * and renders them. (Requirements 6.6, 6.8)
       */
      init: function () {
        listEl = document.getElementById('task-list');
        inputEl = document.getElementById('task-input');
        errorEl = document.getElementById('task-error');

        // Load tasks from Local Storage. Default to empty array. (Req 6.6, 6.8)
        var result = Storage_Manager.load(KEYS.TASKS);
        if (result.data && Array.isArray(result.data)) {
          tasks = result.data;
        } else {
          tasks = [];
        }
        renderTasks();
      },

      /**
       * add(text) validates, creates, saves, and re-renders a new task.
       * (Requirements 6.1, 6.7)
       * @param {string} text - task text
       * @returns {{ valid: boolean, error?: string }}
       */
      add: function (text) {
        var result = validateTaskText(text);
        if (!result.valid) {
          showError(errorEl, result.error);
          return result;
        }
        clearError(errorEl);
        var task = createTask(text);
        tasks.push(task);
        saveTasks();
        renderTasks();
        // Clear the input field after successful addition.
        if (inputEl) {
          inputEl.value = '';
        }
        return { valid: true };
      },

      /**
       * edit(id, text) validates, updates, saves, and re-renders a task.
       * (Requirements 6.2, 6.7)
       * @param {string} id - task id
       * @param {string} text - new task text
       * @returns {{ valid: boolean, error?: string }}
       */
      edit: function (id, text) {
        var result = validateTaskText(text);
        if (!result.valid) {
          showError(errorEl, result.error);
          return result;
        }
        clearError(errorEl);
        var trimmed = (text == null ? '' : String(text)).trim();
        // Find the task by id and update its text.
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].id === id) {
            tasks[i].text = trimmed;
            break;
          }
        }
        saveTasks();
        renderTasks();
        return { valid: true };
      },

      /**
       * toggle(id) flips a task's completion status, saves, and re-renders.
       * (Requirement 6.3)
       * @param {string} id - task id
       */
      toggle: function (id) {
        // Find the task by id and flip its completed flag.
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].id === id) {
            tasks[i].completed = !tasks[i].completed;
            break;
          }
        }
        saveTasks();
        renderTasks();
      },

      /**
       * remove(id) deletes a task, saves, and re-renders. (Requirement 6.4)
       * @param {string} id - task id
       */
      remove: function (id) {
        // Filter out the task with the matching id.
        tasks = tasks.filter(function (t) { return t.id !== id; });
        saveTasks();
        renderTasks();
      },

      /**
       * getAll() returns the current in-memory task array. (Requirement 6)
       * @returns {Array} tasks
       */
      getAll: function () {
        return tasks;
      }
    };
  })();

  /** Quick_Links: favorite-website buttons (capped at 20). (Requirement 7) */
  var Quick_Links = (function () {
    // In-memory array of link objects.
    var links = [];

    // Default links shown on first load when storage is empty. (Checklist 4)
    var DEFAULT_LINKS = [
      { id: 'default-1', label: 'Google', url: 'https://www.google.com' },
      { id: 'default-2', label: 'YouTube', url: 'https://www.youtube.com' },
      { id: 'default-3', label: 'GitHub', url: 'https://github.com' }
    ];

    // Cached DOM elements
    var listEl = null;
    var labelInput = null;
    var urlInput = null;
    var errorEl = null;

    /**
     * saveLinks() persists the current links to Local Storage.
     * On failure, retains data in memory and shows a global error. (Req 7.4, 9.5)
     */
    function saveLinks() {
      var result = Storage_Manager.save(KEYS.LINKS, links);
      if (!result.success) {
        showGlobalError('Could not save links: ' + (result.error || 'Unknown error'));
      }
    }

    /**
     * renderLinks() re-renders all link buttons in the DOM.
     * Each link is a clickable button that opens in a new tab, with a
     * delete button. (Requirements 7.1-7.3)
     */
    function renderLinks() {
      if (!listEl) return;
      listEl.innerHTML = '';

      // Show empty state when no links exist.
      if (links.length === 0) {
        var emptyMsg = document.createElement('span');
        emptyMsg.className = 'links-empty';
        emptyMsg.textContent = 'No quick links yet. Add one above!';
        listEl.appendChild(emptyMsg);
        return;
      }

      // Create a button for each link.
      for (var i = 0; i < links.length; i++) {
        (function (link) {
          var item = document.createElement('span');
          item.className = 'link-item';

          // Clickable label that opens URL in new tab. (Req 7.2)
          var label = document.createElement('span');
          label.className = 'link-label';
          label.textContent = link.label;
          label.addEventListener('click', function () {
            Quick_Links.open(link.url);
          });
          item.appendChild(label);

          // Delete button. (Req 7.3)
          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'link-delete';
          deleteBtn.textContent = '×';
          deleteBtn.setAttribute('aria-label', 'Delete "' + link.label + '"');
          deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            Quick_Links.remove(link.id);
          });
          item.appendChild(deleteBtn);

          listEl.appendChild(item);
        })(links[i]);
      }
    }

    return {
      /**
       * init() loads saved links from Local Storage (or default links if
       * storage is empty on first load) and renders them. (Req 7.5)
       */
      init: function () {
        listEl = document.getElementById('link-list');
        labelInput = document.getElementById('link-label-input');
        urlInput = document.getElementById('link-url-input');
        errorEl = document.getElementById('link-error');

        // Load links from Local Storage. (Req 7.5)
        var result = Storage_Manager.load(KEYS.LINKS);
        if (result.data && Array.isArray(result.data)) {
          links = result.data;
        } else {
          // First load: use default links. (Checklist item 4)
          links = DEFAULT_LINKS.slice();
          // Save defaults so they persist on next load.
          saveLinks();
        }
        renderLinks();
      },

      /**
       * add(label, url) validates, checks the 20-link cap, saves, and re-renders.
       * (Requirements 7.1, 7.6, 7.7)
       * @param {string} label - link label
       * @param {string} url - link URL
       * @returns {{ valid: boolean, error?: string }}
       */
      add: function (label, url) {
        // Check the 20-link cap before validation. (Req 7.7)
        if (links.length >= 20) {
          var capError = 'Maximum of 20 links reached. Delete a link to add a new one.';
          showError(errorEl, capError);
          return { valid: false, error: capError };
        }
        var result = validateLink(label, url);
        if (!result.valid) {
          showError(errorEl, result.error);
          return result;
        }
        clearError(errorEl);
        var link = createLink(label, url);
        links.push(link);
        saveLinks();
        renderLinks();
        // Clear the inputs after successful addition.
        if (labelInput) labelInput.value = '';
        if (urlInput) urlInput.value = '';
        return { valid: true };
      },

      /**
       * remove(id) deletes a link, saves, and re-renders. (Requirement 7.3)
       * @param {string} id - link id
       */
      remove: function (id) {
        links = links.filter(function (l) { return l.id !== id; });
        saveLinks();
        renderLinks();
      },

      /**
       * open(url) opens the URL in a new browser tab. (Requirement 7.2)
       * @param {string} url - URL to open
       */
      open: function (url) {
        global.open(url, '_blank');
      },

      /**
       * getAll() returns the current in-memory link array. (Requirement 7)
       * @returns {Array} links
       */
      getAll: function () {
        return links;
      }
    };
  })();

  /** Theme_Manager: light/dark toggle and persistence. (Requirement 8) */
  var Theme_Manager = (function () {
    // Current theme held in memory.
    var currentTheme = 'light';

    return {
      /**
       * init() loads the saved theme (default light) and applies it.
       * (Requirements 8.3, 8.4)
       */
      init: function () {
        var settings = loadSettings();
        var result = validateTheme(settings.theme);
        // Default to 'light' if the saved theme is invalid. (Req 8.4)
        currentTheme = result.valid ? result.normalized : 'light';
        this.apply(currentTheme);
      },

      /**
       * toggle() switches to the opposite theme, saves, and applies it.
       * (Requirement 8.1)
       */
      toggle: function () {
        // Switch to the opposite theme. (Req 8.1)
        currentTheme = (currentTheme === 'light') ? 'dark' : 'light';
        this.apply(currentTheme);
        // Persist the theme change. (Req 8.2)
        saveSettings({ theme: currentTheme });
      },

      /**
       * apply(theme) applies the theme to the document via data-theme attribute.
       * (Requirement 8.1)
       * @param {string} theme - 'light' or 'dark'
       */
      apply: function (theme) {
        document.documentElement.setAttribute('data-theme', theme);
        // Update the toggle button text for visual feedback.
        var toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = (theme === 'dark') ? '☀️ Light' : '🌙 Dark';
        }
      }
    };
  })();

  /* ============================================================
   * BOOTSTRAP / INIT
   * Entry point invoked on DOMContentLoaded: detect storage availability,
   * initialize each component in order, and bind global event listeners.
   * (Requirement 10.1)
   * ============================================================ */

  /**
   * init() boots the application once the DOM is ready.
   * Components are initialized in dependency order so storage and theme are
   * available before the UI components render. (Requirement 10.1)
   */
  function init() {
    // 1. Detect Local Storage availability. (Req 10.4)
    var storageAvailable = Storage_Manager.init();
    if (!storageAvailable) {
      showGlobalError('Local Storage is unavailable. Your data will not be saved between sessions.');
    }

    // 2. Initialize and apply the saved theme (default light). (Req 8.3)
    Theme_Manager.init();

    // 3. Start the live clock with 1-second updates. (Req 1.1, 1.3)
    Clock.init();
    Clock.start();

    // 4. Load the custom name and render the greeting. (Req 2.5, 3.3)
    Greeting_Widget.init();

    // 5. Load the focus duration and render the timer. (Req 5.3)
    Focus_Timer.init();

    // 6. Load tasks and render the list. (Req 6.6)
    Task_List.init();

    // 7. Load links and render the buttons. (Req 7.5)
    Quick_Links.init();

    // 8. Update the greeting every minute so it changes with time of day.
    setInterval(function () {
      Greeting_Widget.update();
    }, 60000);

    // ---- Bind global event listeners ----

    // Theme toggle button. (Req 8.1)
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        Theme_Manager.toggle();
      });
    }

    // Custom name save button. (Req 3.1)
    var nameSaveBtn = document.getElementById('custom-name-save');
    var nameInput = document.getElementById('custom-name-input');
    if (nameSaveBtn && nameInput) {
      nameSaveBtn.addEventListener('click', function () {
        Greeting_Widget.setCustomName(nameInput.value);
      });
      // Also save on Enter key in the input.
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          Greeting_Widget.setCustomName(nameInput.value);
        }
      });
    }

    // Focus Timer buttons. (Req 4.2, 4.3, 4.4)
    var timerStartBtn = document.getElementById('timer-start');
    var timerStopBtn = document.getElementById('timer-stop');
    var timerResetBtn = document.getElementById('timer-reset');
    if (timerStartBtn) {
      timerStartBtn.addEventListener('click', function () {
        Focus_Timer.start();
      });
    }
    if (timerStopBtn) {
      timerStopBtn.addEventListener('click', function () {
        Focus_Timer.stop();
      });
    }
    if (timerResetBtn) {
      timerResetBtn.addEventListener('click', function () {
        Focus_Timer.reset();
      });
    }

    // Focus duration save button. (Req 5.1)
    var durationSaveBtn = document.getElementById('focus-duration-save');
    var durationInput = document.getElementById('focus-duration-input');
    if (durationSaveBtn && durationInput) {
      durationSaveBtn.addEventListener('click', function () {
        var value = parseInt(durationInput.value, 10);
        Focus_Timer.setDuration(value);
      });
    }

    // Task form submission. (Req 6.1)
    var taskForm = document.getElementById('task-form');
    var taskInput = document.getElementById('task-input');
    if (taskForm) {
      taskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (taskInput) {
          Task_List.add(taskInput.value);
        }
      });
    }

    // Quick Links form submission. (Req 7.1)
    var linkForm = document.getElementById('link-form');
    var linkLabelInput = document.getElementById('link-label-input');
    var linkUrlInput = document.getElementById('link-url-input');
    if (linkForm) {
      linkForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (linkLabelInput && linkUrlInput) {
          Quick_Links.add(linkLabelInput.value, linkUrlInput.value);
        }
      });
    }
  }

  /* ------------------------------------------------------------
   * Reveal the public API on a single namespace to namespace the
   * components and avoid global pollution, while keeping the
   * pure-logic layer accessible for tests. (Requirement 11.2)
   * ------------------------------------------------------------ */
  TLD.logic = {
    serialize: serialize,
    deserialize: deserialize,
    formatTime: formatTime,
    formatDate: formatDate,
    getGreeting: getGreeting,
    validateCustomName: validateCustomName,
    validateFocusDuration: validateFocusDuration,
    getTimerState: getTimerState,
    formatCountdown: formatCountdown,
    validateTaskText: validateTaskText,
    createTask: createTask,
    isValidUrl: isValidUrl,
    validateLink: validateLink,
    createLink: createLink,
    validateTheme: validateTheme
  };
  TLD.Storage_Manager = Storage_Manager;
  TLD.Clock = Clock;
  TLD.Greeting_Widget = Greeting_Widget;
  TLD.Focus_Timer = Focus_Timer;
  TLD.Task_List = Task_List;
  TLD.Quick_Links = Quick_Links;
  TLD.Theme_Manager = Theme_Manager;
  TLD.init = init;

  // Expose the single namespace on the global scope.
  global.TLD = TLD;

  /* ------------------------------------------------------------
   * Auto-start the application when the DOM is ready.
   * Guarded so the file is safe to load in non-DOM environments
   * (e.g. test harnesses) without throwing.
   * ------------------------------------------------------------ */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
