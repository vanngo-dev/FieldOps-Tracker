import bcrypt from "bcryptjs";

const passwordHashRounds = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, passwordHashRounds);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
