import axios from 'axios';

// Uses relative URLs — nginx proxies /api/* to the backend.
// No VITE_API_URL needed; works regardless of the host IP.
const api = axios.create({
  baseURL: '',
});

export default api;
