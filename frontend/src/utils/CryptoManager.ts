/**
 * CryptoManager - Handles Zero-Knowledge End-to-End Encryption (E2EE)
 * Utilizes the native browser WebCrypto API (window.crypto.subtle)
 * Uses ECDH (Elliptic Curve Diffie-Hellman) for Key Exchange
 * Uses AES-GCM for Message Encryption
 */

export class CryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecrets: Map<string, CryptoKey> = new Map();

  // 1. Generate or Load an ECDH Key Pair
  public async generateKeyPair(): Promise<void> {
    if (this.keyPair) return;

    // To prevent losing encrypted history on refresh, we attempt to load keys from IndexedDB
    const storedKeys = await this.loadKeysFromIndexedDB();
    if (storedKeys) {
       this.keyPair = storedKeys;
       console.log("[Crypto] ECDH Key Pair loaded from secure local storage.");
       return;
    }

    this.keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true, // extractable (so we can send the public key to peers)
      ["deriveKey", "deriveBits"]
    );

    await this.saveKeysToIndexedDB(this.keyPair);
    console.log("[Crypto] ECDH Key Pair generated and saved securely.");
  }

  // --- IndexedDB Key Persistence ---
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("SwarmCryptoStore", 1);
      request.onupgradeneeded = (e: any) => {
        e.target.result.createObjectStore("keys");
      };
      request.onsuccess = (e: any) => resolve(e.target.result);
      request.onerror = () => reject("Failed to open Crypto DB");
    });
  }

  private async loadKeysFromIndexedDB(): Promise<CryptoKeyPair | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction("keys", "readonly");
        const store = tx.objectStore("keys");
        const request = store.get("localKeyPair");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async saveKeysToIndexedDB(keyPair: CryptoKeyPair): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      const store = tx.objectStore("keys");
      const request = store.put(keyPair, "localKeyPair");
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  }

  // 2. Export the Public Key to a Base64 string to send over WebSocket
  public async exportPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error("Key pair not generated.");

    const exported = await window.crypto.subtle.exportKey("raw", this.keyPair.publicKey);
    const buffer = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  // 3. Import a Peer's Base64 Public Key
  private async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryDerString = atob(base64Key);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
      "raw",
      binaryDer,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  }

  // 4. Derive the Shared AES-GCM Secret Lock from our Private Key + Peer's Public Key
  public async deriveSharedSecret(targetId: string, peerBase64PublicKey: string): Promise<void> {
    if (!this.keyPair) throw new Error("Local key pair not generated.");

    console.log(`[Crypto] Deriving shared secret for peer: ${targetId}`);
    const peerPublicKey = await this.importPublicKey(peerBase64PublicKey);

    const sharedSecret = await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: peerPublicKey },
      this.keyPair.privateKey,
      { name: "AES-GCM", length: 256 },
      false, // non-extractable (highly secure, never leaves memory)
      ["encrypt", "decrypt"]
    );

    this.sharedSecrets.set(targetId, sharedSecret);
    console.log(`[Crypto] Shared secret locked for peer: ${targetId}`);
  }

  // 5. Encrypt a message using AES-GCM
  public async encryptMessage(targetId: string, plaintext: string): Promise<string> {
    const sharedSecret = this.sharedSecrets.get(targetId);
    if (!sharedSecret) throw new Error(`No shared secret established with ${targetId}`);

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // AES-GCM requires a unique Initialization Vector (IV) for every encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      sharedSecret,
      data
    );

    // Combine IV + Ciphertext into a single payload to send over the wire
    const combinedBuffer = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
    combinedBuffer.set(iv, 0);
    combinedBuffer.set(new Uint8Array(ciphertextBuffer), iv.length);

    // Return as Base64 string for easy JSON transport
    let binary = '';
    for (let i = 0; i < combinedBuffer.byteLength; i++) {
        binary += String.fromCharCode(combinedBuffer[i]);
    }
    return btoa(binary);
  }

  // 6. Decrypt a message using AES-GCM
  public async decryptMessage(senderId: string, base64Ciphertext: string): Promise<string> {
    const sharedSecret = this.sharedSecrets.get(senderId);
    if (!sharedSecret) throw new Error(`No shared secret established with ${senderId}`);

    const binaryString = atob(base64Ciphertext);
    const combinedBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combinedBuffer[i] = binaryString.charCodeAt(i);
    }

    // Extract the IV (first 12 bytes) and the actual ciphertext
    const iv = combinedBuffer.slice(0, 12);
    const ciphertext = combinedBuffer.slice(12);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        sharedSecret,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (e) {
      console.error("[Crypto] Decryption failed! The data may be tampered with or keys mismatched.", e);
      return "[ENCRYPTED - DECRYPTION FAILED]";
    }
  }

  public hasSharedSecret(targetId: string): boolean {
    return this.sharedSecrets.has(targetId);
  }
}

// Singleton instance for the UI
export const cryptoManager = new CryptoManager();