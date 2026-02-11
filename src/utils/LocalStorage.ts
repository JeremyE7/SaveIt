const getDataFromLocalStorage = <T>(key: string): T | null => {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
};

const setDataToLocalStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const removeDataFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};

const clearLocalStorage = (): void => {
  localStorage.clear();
};
export {
  getDataFromLocalStorage,
  setDataToLocalStorage,
  removeDataFromLocalStorage,
  clearLocalStorage,
};
