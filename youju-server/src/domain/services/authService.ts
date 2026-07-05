import type { JwtPort } from '../ports/jwtPort.js'
import type { UserService } from './userService.js'

export class AuthService {
  constructor(
    private readonly jwtPort: JwtPort,
    private readonly userService: UserService,
  ) {}

  async wechatLoginMock(
    code?: string,
  ): Promise<{ token: string; user: { id: number; nickname: string; avatar: string } }> {
    const mockOpenid = code ? `wx_${code}` : `wx_guest_${Date.now()}`
    const mockNicknames = ['微信用户', '小据同学', '有据用户', 'AI助手']
    const nickname = mockNicknames[Math.floor(Math.random() * mockNicknames.length)]
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockOpenid}`

    const user = await this.userService.findOrCreateUser(mockOpenid, nickname, avatar)
    const token = await this.jwtPort.generateToken(Number(user.id))

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    }
  }
}
