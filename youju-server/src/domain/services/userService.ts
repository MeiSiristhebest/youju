import type { UserRepository } from '../ports/repositories.js'
import type { User } from '../types.js'

let _userRepo: UserRepository | null = null

export function setUserRepository(repo: UserRepository): void {
  _userRepo = repo
}

function getUserRepo(): UserRepository {
  if (!_userRepo) {
    throw new Error('UserRepository not set. Call setUserRepository() first.')
  }
  return _userRepo
}

export async function getUser(id: number): Promise<User | null> {
  const user = await getUserRepo().getUserById(id)
  if (!user) return null
  return user
}
