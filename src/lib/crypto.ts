import sodium from "libsodium-wrappers";

let initialized = false;

export async function initCrypto(): Promise<typeof sodium> {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
  return sodium;
}

export type KeyPair = { publicKey: string; privateKey: string };

export async function generateKeyPair(): Promise<KeyPair> {
  const s = await initCrypto();
  const kp = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(kp.publicKey),
    privateKey: s.to_base64(kp.privateKey),
  };
}

export async function fingerprint(publicKeyB64: string): Promise<string> {
  const s = await initCrypto();
  const pub = s.from_base64(publicKeyB64);
  const hash = s.crypto_generichash(8, pub, null);
  return s.to_hex(hash);
}

// ---------------------------------------------------------------------------
// Texte — chiffré pour un destinataire précis
// ---------------------------------------------------------------------------

export type EncryptedPayload = { ciphertext: string; nonce: string };

export async function encryptFor(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderPrivateKeyB64: string
): Promise<EncryptedPayload> {
  const s = await initCrypto();
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const ct = s.crypto_box_easy(
    s.from_string(plaintext),
    nonce,
    s.from_base64(recipientPublicKeyB64),
    s.from_base64(senderPrivateKeyB64)
  );
  return {
    ciphertext: s.to_base64(ct),
    nonce: s.to_base64(nonce),
  };
}

export async function decryptFrom(
  payload: EncryptedPayload,
  peerPublicKeyB64: string,
  myPrivateKeyB64: string
): Promise<string> {
  const s = await initCrypto();
  const pt = s.crypto_box_open_easy(
    s.from_base64(payload.ciphertext),
    s.from_base64(payload.nonce),
    s.from_base64(peerPublicKeyB64),
    s.from_base64(myPrivateKeyB64)
  );
  return s.to_string(pt);
}

// ---------------------------------------------------------------------------
// Fichier — clé symétrique chiffrée pour le destinataire
// ---------------------------------------------------------------------------

export type EncryptedFile = {
  ciphertext: Uint8Array;
  encryptedKey: string;
  nonce: string;
};

export async function encryptFileFor(
  file: File,
  recipientPublicKeyB64: string,
  senderPrivateKeyB64: string
): Promise<EncryptedFile> {
  const s = await initCrypto();
  const raw = new Uint8Array(await file.arrayBuffer());

  const symKey = s.randombytes_buf(s.crypto_secretbox_KEYBYTES);
  const fileNonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);

  const ct = s.crypto_secretbox_easy(raw, fileNonce, symKey);

  const keyNonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const encKey = s.crypto_box_easy(
    symKey,
    keyNonce,
    s.from_base64(recipientPublicKeyB64),
    s.from_base64(senderPrivateKeyB64)
  );

  const blob = new Uint8Array(fileNonce.length + ct.length);
  blob.set(fileNonce, 0);
  blob.set(ct, fileNonce.length);

  return {
    ciphertext: blob,
    encryptedKey: s.to_base64(encKey),
    nonce: s.to_base64(keyNonce),
  };
}

export async function decryptFileFrom(
  ciphertextWithNonce: Uint8Array,
  encryptedKeyB64: string,
  keyNonceB64: string,
  peerPublicKeyB64: string,
  myPrivateKeyB64: string
): Promise<Uint8Array> {
  const s = await initCrypto();

  const fileNonceLen = s.crypto_secretbox_NONCEBYTES;
  const fileNonce = ciphertextWithNonce.slice(0, fileNonceLen);
  const ct = ciphertextWithNonce.slice(fileNonceLen);

  const symKey = s.crypto_box_open_easy(
    s.from_base64(encryptedKeyB64),
    s.from_base64(keyNonceB64),
    s.from_base64(peerPublicKeyB64),
    s.from_base64(myPrivateKeyB64)
  );

  return s.crypto_secretbox_open_easy(ct, fileNonce, symKey);
}

// ---------------------------------------------------------------------------
// Clé symétrique pour le workspace (chiffrée par device)
// ---------------------------------------------------------------------------

/** Génère une clé symétrique aléatoire (32 octets, base64). */
export async function generateSymKey(): Promise<string> {
  const s = await initCrypto();
  return s.to_base64(s.randombytes_buf(s.crypto_secretbox_KEYBYTES));
}

/** Chiffre une clé symétrique pour un device destinataire. */
export async function encryptSymKey(
  symKeyB64: string,
  recipientPublicKeyB64: string,
  senderPrivateKeyB64: string
): Promise<{ encryptedKey: string; nonce: string }> {
  const s = await initCrypto();
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const symKey = s.from_base64(symKeyB64);
  const enc = s.crypto_box_easy(
    symKey,
    nonce,
    s.from_base64(recipientPublicKeyB64),
    s.from_base64(senderPrivateKeyB64)
  );
  return {
    encryptedKey: s.to_base64(enc),
    nonce: s.to_base64(nonce),
  };
}

/** Déchiffre une clé symétrique reçue pour soi. */
export async function decryptSymKey(
  encryptedKeyB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  recipientPrivateKeyB64: string
): Promise<string> {
  const s = await initCrypto();
  const key = s.crypto_box_open_easy(
    s.from_base64(encryptedKeyB64),
    s.from_base64(nonceB64),
    s.from_base64(senderPublicKeyB64),
    s.from_base64(recipientPrivateKeyB64)
  );
  return s.to_base64(key);
}

/** Chiffre un texte avec une clé symétrique partagée. */
export async function encryptTextWithSymKey(
  plaintext: string,
  symKeyB64: string
): Promise<EncryptedPayload> {
  const s = await initCrypto();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ciphertext = s.crypto_secretbox_easy(
    s.from_string(plaintext),
    nonce,
    s.from_base64(symKeyB64)
  );

  return {
    ciphertext: s.to_base64(ciphertext),
    nonce: s.to_base64(nonce),
  };
}

/** Déchiffre un texte protégé par une clé symétrique partagée. */
export async function decryptTextWithSymKey(
  payload: EncryptedPayload,
  symKeyB64: string
): Promise<string> {
  const s = await initCrypto();
  const plaintext = s.crypto_secretbox_open_easy(
    s.from_base64(payload.ciphertext),
    s.from_base64(payload.nonce),
    s.from_base64(symKeyB64)
  );

  return s.to_string(plaintext);
}

/** Chiffre un blob avec la clé symétrique. */
export async function encryptFileWithSymKey(
  file: File,
  symKeyB64: string
): Promise<{ ciphertext: Uint8Array; nonce: string }> {
  const s = await initCrypto();
  const raw = new Uint8Array(await file.arrayBuffer());
  const symKey = s.from_base64(symKeyB64);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ct = s.crypto_secretbox_easy(raw, nonce, symKey);

  const blob = new Uint8Array(nonce.length + ct.length);
  blob.set(nonce, 0);
  blob.set(ct, nonce.length);

  return { ciphertext: blob, nonce: "" }; // nonce inclus dans le blob
}

/** Déchiffre un blob avec la clé symétrique. */
export async function decryptFileWithSymKey(
  ciphertextWithNonce: Uint8Array,
  symKeyB64: string
): Promise<Uint8Array> {
  const s = await initCrypto();
  const nonceLen = s.crypto_secretbox_NONCEBYTES;
  const nonce = ciphertextWithNonce.slice(0, nonceLen);
  const ct = ciphertextWithNonce.slice(nonceLen);
  const symKey = s.from_base64(symKeyB64);
  return s.crypto_secretbox_open_easy(ct, nonce, symKey);
}