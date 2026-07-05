/**
 * 轻量 DI 容器（自研，避免引入 tsyringe 等新依赖）
 *
 * 设计：
 * - Symbol token 作为依赖标识
 * - Factory 模式注册，支持 lazy 初始化与 singleton 缓存
 * - ServiceLocator 接口供 service 通过构造函数注入依赖
 *
 * 使用：
 *   const container = createContainer()
 *   container.register(Tokens.UserService, (loc) => new UserService(loc.resolve(Tokens.UserRepository)))
 *   const userService = container.resolve<UserService>(Tokens.UserService)
 */

export interface ServiceLocator {
  resolve<T>(token: symbol): T
  register<T>(token: symbol, factory: (loc: ServiceLocator) => T): void
  registerSingleton<T>(token: symbol, factory: (loc: ServiceLocator) => T): void
  has(token: symbol): boolean
}

interface ServiceFactory {
  factory: (loc: ServiceLocator) => unknown
  singleton: boolean
  instance?: unknown
}

export function createContainer(): ServiceLocator {
  const factories = new Map<symbol, ServiceFactory>()

  const resolve = <T>(token: symbol): T => {
    const entry = factories.get(token)
    if (!entry) {
      throw new Error(`No service registered for token: ${token.toString()}`)
    }
    if (entry.singleton) {
      if (entry.instance === undefined) {
        entry.instance = entry.factory(locator)
      }
      return entry.instance as T
    }
    return entry.factory(locator) as T
  }

  const register = <T>(token: symbol, factory: (loc: ServiceLocator) => T): void => {
    factories.set(token, { factory, singleton: false })
  }

  const registerSingleton = <T>(token: symbol, factory: (loc: ServiceLocator) => T): void => {
    factories.set(token, { factory, singleton: true })
  }

  const has = (token: symbol): boolean => factories.has(token)

  const locator: ServiceLocator = { resolve, register, registerSingleton, has }
  return locator
}
