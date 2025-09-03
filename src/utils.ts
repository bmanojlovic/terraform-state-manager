// Utility function to sanitize file paths
export function sanitizePath(path: string): string {
  // Remove any '..' or '.' components to prevent directory traversal
  const parts = path.split(/[\/\\]+/);
  const filteredParts = parts.filter(part => part !== '.' && part !== '..');
  
  // Join the parts and remove any leading or trailing slashes
  return filteredParts.join('/').replace(/^\/+|\/+$/g, '');
}

// Function to hash a password using PBKDF2 (available in Workers)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import password as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2 with salt
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // OWASP recommended minimum
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes
  );
  
  // Combine salt and derived key
  const result = new Uint8Array(salt.length + derivedBits.byteLength);
  result.set(salt);
  result.set(new Uint8Array(derivedBits), salt.length);
  
  return btoa(String.fromCharCode(...result));
}

// Function to verify a password against a stored hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = new Uint8Array(atob(storedHash).split('').map(char => char.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const storedDerivedKey = combined.slice(16);
    
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive key with same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const newDerivedKey = new Uint8Array(derivedBits);
    
    // Constant-time comparison
    return newDerivedKey.every((value, index) => value === storedDerivedKey[index]);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
