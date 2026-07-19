import { describe, expect, it } from 'vitest'
import { decode, encode } from './share'

async function roundTrip(source: string): Promise<string> {
  const result = await decode(await encode(source))
  if (!result.ok) {
    throw new Error(`expected a clean decode, got: ${result.message}`)
  }
  return result.source
}

describe('the share codec', () => {
  it.each([
    ['a short program', 'addi r1, r0, 1\nint 0'],
    ['escape sequences', 'message:\n\t"tab\\there\\nnewline"'],
    ['non-ASCII', '// olá, mundo — ✨\naddi r1, r0, 1'],
    ['tabs and blank lines', 'a:\n\n\t\tint 0\n\n'],
    ['an empty program', ''],
    ['a lone quote', '"'],
  ])('round-trips %s exactly', async (_name, source) => {
    expect(await roundTrip(source)).toBe(source)
  })

  it('round-trips a long program', async () => {
    const long = Array.from({ length: 2000 }, (_, index) => `addi r1, r0, ${index % 256}`).join(
      '\n',
    )

    expect(await roundTrip(long)).toBe(long)
  })

  // Assembly is mostly repeated mnemonics, so it should compress well rather than merely encode.
  it('compresses rather than just re-encoding', async () => {
    const repetitive = Array.from({ length: 500 }, () => 'addi r1, r0, 1').join('\n')

    const encoded = await encode(repetitive)

    expect(encoded.length).toBeLessThan(repetitive.length / 4)
  })

  it('produces a fragment safe to put in a URL unescaped', async () => {
    const encoded = await encode('addi r1, r0, 1\n// ✨\nint 0')

    expect(encoded).toMatch(/^[A-Za-z0-9\-_]*$/)
    expect(encodeURIComponent(encoded)).toBe(encoded)
  })

  it.each([
    ['a truncated fragment', 'abc'],
    ['nonsense', 'not-valid-base64-!!!'],
    ['a fragment of the wrong shape', 'AAAAAAAAAAAAAAAAAAAA'],
  ])('reports %s rather than throwing', async (_name, fragment) => {
    const result = await decode(fragment)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/corrupt or truncated/)
    }
  })
})
