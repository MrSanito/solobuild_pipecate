export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token;
  if (typeof window !== 'undefined') {
    token = sessionStorage.getItem('solobuild_token');
  }
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, { ...options, headers });
}
