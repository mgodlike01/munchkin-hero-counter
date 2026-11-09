export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6

export function rollD6(): DiceValue {
  const bytes = new Uint8Array(1)
  // 252 is divisible by six: discard the remainder to give all faces equal odds.
  do { crypto.getRandomValues(bytes) } while (bytes[0] >= 252)
  return (bytes[0] % 6 + 1) as DiceValue
}
