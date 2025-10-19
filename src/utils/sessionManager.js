import uuidv4 from "./uuid";

const SESSION_STORAGE_KEY = "current_session_id";

/**
 * Get existing session ID from localStorage or create a new one
 * @returns {string} Session ID (UUID)
 */
export function getOrCreateSession() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Set/update the current session ID in localStorage
 * @param {string} sessionId - The session ID to store
 */
export function setCurrentSessionId(sessionId) {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

/**
 * Clear the current session ID from localStorage
 */
export function clearCurrentSessionId() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Get the current session ID without creating a new one
 * @returns {string|null} Session ID or null if not set
 */
export function getCurrentSessionId() {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}
