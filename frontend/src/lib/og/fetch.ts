/** Busca na API pública a partir do servidor (metadados e imagens de compartilhamento). */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_ORIGIN}/api/v1${path}`, { next: { revalidate: 10 } })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}
