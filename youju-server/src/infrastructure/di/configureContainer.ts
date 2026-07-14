import type { DatabaseDriver } from '../../data/DatabaseDriver.js'
import { configureAdapters } from './configureAdapters.js'
import { configureRepositories } from './configureRepositories.js'
import { configureServices } from './configureServices.js'
import { createContainer, type ServiceLocator } from './container.js'
import { setServiceLocator } from './serviceLocator.js'

export interface AppDependencies {
  driver: DatabaseDriver
}

export function configureContainer(driver: DatabaseDriver): {
  container: ServiceLocator
  dependencies: AppDependencies
} {
  const container = createContainer()
  setServiceLocator(container)

  const repos = configureRepositories(driver, container)
  const adapters = configureAdapters(container)
  const services = configureServices(repos, adapters, container)

  const dependencies: AppDependencies = {
    driver,
  }

  return { container, dependencies }
}
