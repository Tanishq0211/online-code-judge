import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hash(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

export async function compare(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}
