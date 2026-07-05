import type { ServiceLocator } from './container.js'
import { Tokens } from './tokens.js'

let _container: ServiceLocator | null = null

export function setServiceLocator(container: ServiceLocator): void {
  _container = container
}

export function getServiceLocator(): ServiceLocator {
  if (!_container) {
    throw new Error('ServiceLocator not initialized. Call setServiceLocator() first.')
  }
  return _container
}

export function getService<T>(token: symbol): T {
  return getServiceLocator().resolve<T>(token)
}

export function hasService(token: symbol): boolean {
  return _container?.has(token) ?? false
}

export { Tokens }
