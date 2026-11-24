import { describe, expect, it } from 'vitest'
import { homeFor, safeNext } from './redirects'

describe('safeNext', () => {
  it.each([
    ['/requests', '/requests'],
    ['/commuter/journeys?tab=open#x', '/commuter/journeys?tab=open#x'],
    [null, null],
    ['', null],
    ['requests', null],
    ['//evil.example.com', null],
    ['/\\evil.example.com', null],
    ['https://evil.example.com', null],
    ['/login', null],
    ['/signup?next=/x', null],
  ])('%s -> %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected)
  })
})

describe('homeFor', () => {
  it.each([
    [{ roles: ['admin'] as const, profileComplete: false }, '/admin'],
    [{ roles: ['commuter'] as const, profileComplete: false }, '/setup'],
    [{ roles: ['commuter', 'operator'] as const, profileComplete: true }, '/commuter'],
    [{ roles: ['operator'] as const, profileComplete: true }, '/operator'],
  ])('%o -> %s', (user, expected) => {
    expect(homeFor({ ...user, roles: [...user.roles] })).toBe(expected)
  })
})
