import argon2 from 'argon2';

export async function hashPassword(plainText: string) {
  return argon2.hash(plainText);
}

export async function verifyPassword(hash: string, plainText: string) {
  return argon2.verify(hash, plainText);
}
