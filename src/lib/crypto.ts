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