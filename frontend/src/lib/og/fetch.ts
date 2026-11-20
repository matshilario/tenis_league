/** Busca na API pública a partir do servidor (metadados e imagens de compartilhamento). */
import { API_ORIGIN } from '@/lib/api'

export { API_ORIGIN }

export async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_ORIGIN}/api/v1${path}`, { next: { revalidate: 10 } })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}
