import type { CustomerSummary, OutreachBrief } from '../types'

const BASE = 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  listCustomers: () => get<CustomerSummary[]>('/api/customers'),
  getBrief: (id: string) => get<OutreachBrief>(`/api/customers/${id}/brief`),
}
