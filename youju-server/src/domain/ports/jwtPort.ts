export interface JwtPort {
  generateToken(userId: number): Promise<string>
  verifyToken(token: string): Promise<number | null>
}
