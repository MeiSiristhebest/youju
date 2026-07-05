import '@testing-library/jest-dom/vitest'

// localStorage mock for zustand persist middleware in jsdom test environment
// jsdom's localStorage can be unreliable; provide a robust in-memory implementation.
const localStorageStore = new Map<string, string>()

const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore.set(key, String(value))
  },
  removeItem: (key: string) => {
    localStorageStore.delete(key)
  },
  clear: () => {
    localStorageStore.clear()
  },
  key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
  get length() {
    return localStorageStore.size
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})
