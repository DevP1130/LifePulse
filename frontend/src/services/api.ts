import type { CustomerSummary, CustomerDetail, ConversationStarter, RelocationStatus } from '../types'

const BASE = 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  listCustomers: () =>
    request<CustomerSummary[]>('/api/customers'),

  getCustomer: (id: string) =>
    request<CustomerDetail>(`/api/customers/${id}`),

  getStarter: (id: string) =>
    request<ConversationStarter>(`/api/customers/${id}/brief`),

  updateStatus: (id: string, status: RelocationStatus) =>
    request<CustomerSummary>(`/api/customers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
}
