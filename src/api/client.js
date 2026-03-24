import axios from 'axios'

// URL del worker en Railway — hardcodeada para asegurar que siempre apunta correcto
const RAILWAY_URL = 'https://worker-production-d575.up.railway.app'

const api = axios.create({
  baseURL: RAILWAY_URL,
  timeout: 15000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('khn_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('khn_token')
      localStorage.removeItem('khn_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const SSE_URL = () => {
  const token = localStorage.getItem('khn_token')
  return `${RAILWAY_URL}/api/inbox/stream?token=${token}`
}
