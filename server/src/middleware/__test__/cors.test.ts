import { describe, it, expect } from 'vitest';
import { corsMiddleware } from '../cors.js';

describe('corsMiddleware', () => {
  it('应该是一个函数（中间件）', () => {
    expect(typeof corsMiddleware).toBe('function');
  });

  it('应该接受三个参数（req, res, next）', () => {
    expect(corsMiddleware.length).toBe(3);
  });
});
