import { afterEach, describe, expect, it } from 'vitest';
import { getConfig } from '../config';

const originalEnv = {
  COMMON_LAW_AUTO_BOOTSTRAP: process.env.COMMON_LAW_AUTO_BOOTSTRAP,
  PRIVATE_CONFIDANT: process.env.PRIVATE_CONFIDANT,
};

afterEach(() => {
  process.env.COMMON_LAW_AUTO_BOOTSTRAP = originalEnv.COMMON_LAW_AUTO_BOOTSTRAP;
  process.env.PRIVATE_CONFIDANT = originalEnv.PRIVATE_CONFIDANT;
});

describe('env boolean parsing', () => {
  it('treats COMMON_LAW_AUTO_BOOTSTRAP=false as false', () => {
    process.env.COMMON_LAW_AUTO_BOOTSTRAP = 'false';
    expect(getConfig().COMMON_LAW_AUTO_BOOTSTRAP).toBe(false);
  });

  it('treats PRIVATE_CONFIDANT=false as false', () => {
    process.env.PRIVATE_CONFIDANT = 'false';
    expect(getConfig().PRIVATE_CONFIDANT).toBe(false);
  });

  it('treats COMMON_LAW_AUTO_BOOTSTRAP=true as true', () => {
    process.env.COMMON_LAW_AUTO_BOOTSTRAP = 'true';
    expect(getConfig().COMMON_LAW_AUTO_BOOTSTRAP).toBe(true);
  });
});
