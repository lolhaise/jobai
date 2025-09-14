import { getSession } from 'next-auth/react'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest(url: string, options: RequestInit = {}) {
  const session = await getSession()
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.user?.id && { 'Authorization': `Bearer ${session.user.id}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)
  
  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`)
  }
  
  return response.json()
}

export const api = {
  get: (url: string) => apiRequest(url),
  post: (url: string, data: any) => apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (url: string, data: any) => apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  patch: (url: string, data: any) => apiRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (url: string) => apiRequest(url, {
    method: 'DELETE',
  }),
}

export { ApiError }