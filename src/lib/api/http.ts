/**
 * Shared fetch helper with a small in-memory cache + simple rate limiting.
 * OpenF1 & Jolpica throttle aggressively (HTTP 429): requests are queued per host.
 */
const memCache = new Map<string, { at: number; data: unknown }>()
const hostQueues = new Map<string, Promise<unknown>>()
const MIN_GAP_MS: Record<string, number> = {
  'api.openf1.org': 350,
  'api.jolpi.ca': 300,
}

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} sur ${url}`)
  }
}

export async function fetchJson<T>(url: string, opts: { ttlMs?: number; signal?: AbortSignal } = {}): Promise<T> {
  const ttl = opts.ttlMs ?? 60_000
  const hit = memCache.get(url)
  if (hit && Date.now() - hit.at < ttl) return hit.data as T

  const host = new URL(url).host
  const gap = MIN_GAP_MS[host] ?? 0
  const prev = hostQueues.get(host) ?? Promise.resolve()
  const run = prev.catch(() => undefined).then(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response
      try {
        res = await fetch(url, { signal: opts.signal })
      } catch (e) {
        // A 429 served without CORS headers surfaces as a network TypeError: retry with backoff.
        if (opts.signal?.aborted || attempt === 2) throw e
        await sleep(1000 * (attempt + 1))
        continue
      }
      if (res.status === 429) {
        await sleep(1000 * (attempt + 1))
        continue
      }
      if (!res.ok) throw new HttpError(res.status, url)
      const data = (await res.json()) as T
      memCache.set(url, { at: Date.now(), data })
      return data
    }
    throw new HttpError(429, url)
  })
  hostQueues.set(host, run.then(() => sleep(gap), () => sleep(gap)))
  return run
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Build a query string, skipping undefined values. Supports OpenF1 operators via raw keys like "date>". */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const m = k.match(/^(.*?)([<>]=?)$/)
      return m ? `${encodeURIComponent(m[1])}${m[2]}${encodeURIComponent(String(v))}` : `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    })
  return parts.length ? `?${parts.join('&')}` : ''
}
