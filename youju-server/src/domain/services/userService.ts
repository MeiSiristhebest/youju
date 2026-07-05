import type { UserRepository } from '../ports/repositories.js'
import type { User } from '../types.js'

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getUser(id: number): Promise<User | null> {
    const user = await this.userRepo.getUserById(id)
    if (!user) return null
    return user
  }

  async findOrCreateUser(openid: string, nickname: string, avatar: string): Promise<User> {
    return this.userRepo.findOrCreateUser(openid, nickname, avatar)
  }
}
