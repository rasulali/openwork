export function getLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get localStorage key "${key}":`, error);
    return null;
  }
}

export function setLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to set localStorage key "${key}":`, error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded. Please clear some data.");
    }
    throw error;
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}":`, error);
  }
}

