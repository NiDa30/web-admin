export const API_URL = import.meta.env.VITE_API_URL;

export async function getStatus() {
  const res = await fetch(`${API_URL}/`);
  return await res.json();
}
