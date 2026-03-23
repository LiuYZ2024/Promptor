const LAST_SESSION_KEY = 'promptor:lastActiveSessionId';

export function getLastActiveSessionId(): string | null {
  try {
    return localStorage.getItem(LAST_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setLastActiveSessionId(id: string): void {
  try {
    localStorage.setItem(LAST_SESSION_KEY, id);
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function clearLastActiveSessionId(): void {
  try {
    localStorage.removeItem(LAST_SESSION_KEY);
  } catch {
    // noop
  }
}
