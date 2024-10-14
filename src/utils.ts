// Utility function to sanitize file paths
export function sanitizePath(path: string): string {
  // Remove any '..' or '.' components to prevent directory traversal
  const parts = path.split(/[\/\\]+/);
  const filteredParts = parts.filter(part => part !== '.' && part !== '..');
  
  // Join the parts and remove any leading or trailing slashes
  return filteredParts.join('/').replace(/^\/+|\/+$/g, '');
}

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const combinedArray = new Uint8Array(salt.length + hash.byteLength);
  combinedArray.set(salt);
  combinedArray.set(new Uint8Array(hash), salt.length);
  return btoa(String.fromCharCode(...combinedArray));
}

// Function to verify a password against a stored hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const decoder = new TextDecoder();
  const combinedArray = new Uint8Array(atob(storedHash).split('').map(char => char.charCodeAt(0)));
  const salt = combinedArray.slice(0, 16);
  const storedHashArray = combinedArray.slice(16);

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const newHashArray = new Uint8Array(hash);

  return newHashArray.every((value, index) => value === storedHashArray[index]);
}
