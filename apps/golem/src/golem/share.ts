// The share codec. Compresses the Source into the URL fragment, client-side only — the deck has
// no backend, and a fragment is never sent to a server even when the URL is requested, so the
// code you write genuinely never leaves your machine.
//
// Built on the platform's own `CompressionStream` rather than a library: assembly compresses well
// (it is mostly repeated mnemonics and whitespace), and this adds nothing to the bundle.

// `deflate` rather than `deflate-raw`: the raw variant is absent from older Node, which makes the
// codec awkward to run outside a browser, and the zlib header it avoids is six bytes against a
// fragment measured in hundreds.
const FORMAT: CompressionFormat = 'deflate'

export type DecodeResult = { ok: true; source: string } | { ok: false; message: string }

/** Compresses source to a URL-fragment-safe string. */
export async function encode(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source)
  const compressed = await pipe(bytes, new CompressionStream(FORMAT))
  return toBase64Url(compressed)
}

/**
 * Reverses `encode`. A corrupted or truncated fragment produces a message rather than throwing,
 * so a bad link lands the visitor on a working page with an explanation instead of a blank one.
 */
export async function decode(fragment: string): Promise<DecodeResult> {
  try {
    const bytes = fromBase64Url(fragment)
    const decompressed = await pipe(bytes, new DecompressionStream(FORMAT))
    return { ok: true, source: new TextDecoder().decode(decompressed) }
  } catch {
    return { ok: false, message: 'this share link is corrupt or truncated' }
  }
}

async function pipe(bytes: Uint8Array, transform: TransformStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform)
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

// Base64url: `+/` become `-_` and the padding goes, so the fragment survives a URL intact and
// nothing needs escaping when it is copied out of the address bar.
function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(fragment: string): Uint8Array {
  const padded = fragment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
