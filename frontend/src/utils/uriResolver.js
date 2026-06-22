/**
 * URI Resolver utilities for parsing task metadata and result URIs into human-readable text.
 */

function safeAtob(str) {
  if (!str) return ''
  // Restore base64 padding if stripped
  const pad = str.length % 4
  if (pad) str += '='.repeat(4 - pad)
  try {
    return atob(str)
  } catch {
    return ''
  }
}

/**
 * Parse a task metadata URI into a human-readable task name/description.
 * @param {string} metadataURI
 * @returns {string}
 */
export function parseTaskName(metadataURI) {
  if (!metadataURI || typeof metadataURI !== 'string') return 'Untitled Task'

  if (metadataURI.startsWith('mock://task/')) {
    const encoded = metadataURI.slice('mock://task/'.length)
    // Try decodeURIComponent first (plain text encoding)
    try {
      const decoded = decodeURIComponent(encoded)
      if (decoded && decoded.trim().length > 0 && !decoded.includes('\u0000')) {
        return decoded.trim()
      }
    } catch {
      // decodeURIComponent failed
    }
    // Try base64 fallback
    const decoded = safeAtob(encoded)
    if (decoded && decoded.trim().length > 0) return decoded.trim()
    return encoded.slice(0, 60)
  }

  if (metadataURI.startsWith('ipfs://task-meta/')) {
    const encoded = metadataURI.slice('ipfs://task-meta/'.length)
    // Try base64 first (primary encoding used by the app)
    const decoded = safeAtob(encoded)
    if (decoded && decoded.trim().length > 0) return decoded.trim()
    // Try decodeURIComponent fallback
    try {
      const uriDecoded = decodeURIComponent(encoded)
      if (uriDecoded && uriDecoded.trim().length > 0) return uriDecoded.trim()
    } catch {
      // decodeURIComponent failed
    }
    return encoded.slice(0, 60)
  }

  // Fallback: truncate the raw URI
  return metadataURI.slice(0, 60)
}

/**
 * Parse a result URI into readable content.
 * @param {string} resultURI
 * @returns {string|null} — null if no parseable content
 */
export function parseResult(resultURI) {
  if (!resultURI || typeof resultURI !== 'string') return null

  if (resultURI.startsWith('data:')) {
    const commaIndex = resultURI.indexOf(',')
    if (commaIndex !== -1) {
      const payload = resultURI.slice(commaIndex + 1)
      const decoded = safeAtob(payload)
      if (decoded) return decoded
    }
    return resultURI
  }

  if (resultURI.startsWith('mock://result/')) {
    const encoded = resultURI.slice('mock://result/'.length)
    try {
      const decoded = decodeURIComponent(encoded)
      if (decoded && decoded.trim().length > 0) return decoded.trim()
    } catch {
      // decodeURIComponent failed
    }
    const decoded = safeAtob(encoded)
    if (decoded && decoded.trim().length > 0) return decoded.trim()
    return encoded
  }

  return null
}

/**
 * Shorten an Ethereum address to 0x1234...5678 format.
 * @param {string} addr
 * @returns {string}
 */
export function shortenAddress(addr) {
  if (!addr || typeof addr !== 'string') return ''
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/**
 * Encode user text into a data URI suitable for on-chain result submission.
 * @param {string} text
 * @returns {string}
 */
export function textToDataURI(text) {
  if (!text) return 'data:text/plain;base64,'
  try {
    // Encode Unicode to UTF-8 bytes, then base64
    const bytes = new TextEncoder().encode(text)
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('')
    const base64 = btoa(binary)
    return `data:text/plain;base64,${base64}`
  } catch {
    // Fallback to mock URI if base64 fails
    return `mock://result/${encodeURIComponent(text)}`
  }
}
