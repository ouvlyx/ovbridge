/**
 * Système d'exceptions typées et de gestion d'erreurs pour OvBridge.
 * Fournit des classes d'erreur précises avec codes, messages techniques et messages utilisateur localisés.
 */

export type ErrorSeverityLevel = "neutre" | "moyen" | "alerte";

export interface AppErrorOptions {
  code: string;
  userMessage: string;
  technicalDetails?: string;
  statusCode?: number;
  level?: ErrorSeverityLevel;
  severity?: string;
  cause?: unknown;
}

/**
 * Structure de sévérité à 3 niveaux :
 * - neutre : Information / Note passive (ex: presse-papiers vide, sauvegarde auto, file hors-ligne)
 * - moyen : Avertissement temporaire / Réessayable (ex: quota dépassé, code expiré, limite de taux)
 * - alerte : Erreur critique / Sécurité (ex: compte banni, appareil révoqué, échec de déchiffrement E2E)
 */

/**
 * Classe d'erreur de base pour l'application.
 */
export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly technicalDetails?: string;
  readonly statusCode?: number;
  readonly level: ErrorSeverityLevel;

  constructor(options: AppErrorOptions) {
    super(options.userMessage);
    this.name = "AppError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.technicalDetails = options.technicalDetails;
    this.statusCode = options.statusCode;
    this.level = options.level ?? "moyen";
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Détermine le niveau de sévérité à 3 niveaux d'une erreur (neutre | moyen | alerte).
 */
export function getErrorSeverityLevel(error: unknown): ErrorSeverityLevel {
  if (error instanceof AppError) {
    return error.level;
  }

  const msg = String(
    error && typeof error === "object" && "message" in error
      ? (error as any).message
      : error ?? ""
  ).toLowerCase();

  // Niveau Alerte (Critique)
  if (
    /decryption|déchiffrement|banni|banned|revoked|révoqué|unauthorized|session expired|invalid token/i.test(
      msg
    )
  ) {
    return "alerte";
  }

  // Niveau Neutre (Info)
  if (/vide|empty|auto-cache|file d'attente|saved|information/i.test(msg)) {
    return "neutre";
  }

  // Niveau Moyen (Avertissement par défaut)
  return "moyen";
}

/**
 * Erreurs liées à Internet, au réseau et aux timeouts de requêtes.
 */
export class NetworkError extends AppError {
  constructor(message = "Connexion impossible ou interrompue. Vérifiez votre accès Internet.", details?: string, cause?: unknown) {
    super({
      code: "NETWORK_ERROR",
      userMessage: message,
      technicalDetails: details,
      statusCode: 0,
      severity: "warning",
      cause,
    });
    this.name = "NetworkError";
  }
}

/**
 * Erreurs d'authentification et de gestion de session.
 */
export class AuthError extends AppError {
  constructor(code: string, userMessage: string, details?: string, statusCode = 401, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      statusCode,
      severity: "error",
      cause,
    });
    this.name = "AuthError";
  }

  static invalidCredentials(details?: string) {
    return new AuthError(
      "AUTH_INVALID_CREDENTIALS",
      "Adresse e-mail ou mot de passe incorrect.",
      details,
      401
    );
  }

  static emailAlreadyInUse(details?: string) {
    return new AuthError(
      "AUTH_EMAIL_EXISTS",
      "Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
      details,
      409
    );
  }

  static sessionExpired(details?: string) {
    return new AuthError(
      "AUTH_SESSION_EXPIRED",
      "Votre session n'est plus valide. Veuillez vous reconnecter.",
      details,
      401
    );
  }

  static rateLimit(details?: string) {
    return new AppError({
      code: "RATE_LIMIT_EXCEEDED",
      userMessage: "Trop de tentatives. Patientez quelques instants avant de réessayer.",
      technicalDetails: details,
      statusCode: 429,
      severity: "warning",
    });
  }
}

/**
 * Erreurs de chiffrement / déchiffrement E2E et clés cryptographiques.
 */
export class CryptoError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "error",
      cause,
    });
    this.name = "CryptoError";
  }

  static decryptionFailed(details?: string, cause?: unknown) {
    return new CryptoError(
      "CRYPTO_DECRYPT_FAILED",
      "Impossible de déchiffrer ce contenu. La clé est peut-être invalide ou le message est corrompu.",
      details,
      cause
    );
  }

  static encryptionFailed(details?: string, cause?: unknown) {
    return new CryptoError(
      "CRYPTO_ENCRYPT_FAILED",
      "Échec du chiffrement des données de transfert.",
      details,
      cause
    );
  }

  static missingKey(details?: string) {
    return new CryptoError(
      "CRYPTO_MISSING_KEY",
      "Clé cryptographique introuvable ou indisponible.",
      details
    );
  }
}

/**
 * Erreurs liées aux appareils et à leur identité.
 */
export class DeviceError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "error",
      cause,
    });
    this.name = "DeviceError";
  }

  static notFound(details?: string) {
    return new DeviceError(
      "DEVICE_NOT_FOUND",
      "Cet appareil est introuvable.",
      details
    );
  }

  static revoked(details?: string) {
    return new DeviceError(
      "DEVICE_REVOKED",
      "Cet appareil a été révoqué et ne peut plus échanger de messages.",
      details
    );
  }

  static identityMissing(details?: string) {
    return new DeviceError(
      "DEVICE_IDENTITY_MISSING",
      "Identité locale de l'appareil introuvable. Veuillez réappairer cet appareil.",
      details
    );
  }
}

/**
 * Erreurs liées à l'appairage par code ou QR code.
 */
export class PairingError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "warning",
      cause,
    });
    this.name = "PairingError";
  }

  static notFound(details?: string) {
    return new PairingError(
      "PAIRING_TOKEN_NOT_FOUND",
      "Ce code d'appairage n'est pas reconnu.",
      details
    );
  }

  static alreadyUsed(details?: string) {
    return new PairingError(
      "PAIRING_TOKEN_USED",
      "Ce code a déjà été utilisé. Demandez-en un nouveau.",
      details
    );
  }

  static expired(details?: string) {
    return new PairingError(
      "PAIRING_TOKEN_EXPIRED",
      "Ce code a expiré. Demandez-en un nouveau.",
      details
    );
  }

  static cameraDenied(details?: string) {
    return new PairingError(
      "PAIRING_CAMERA_DENIED",
      "Accès à la caméra refusé. Autorisez la caméra dans les réglages de votre navigateur.",
      details
    );
  }
}

/**
 * Erreurs de transfert de données et de fichiers.
 */
export class TransferError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "error",
      cause,
    });
    this.name = "TransferError";
  }

  static emptyText() {
    return new TransferError(
      "TRANSFER_EMPTY_TEXT",
      "Saisissez un message avant l'envoi."
    );
  }

  static noFileSelected() {
    return new TransferError(
      "TRANSFER_NO_FILE",
      "Sélectionnez un fichier à envoyer."
    );
  }

  static fileTooLarge(maxMb: number) {
    return new TransferError(
      "TRANSFER_FILE_TOO_LARGE",
      `Fichier trop volumineux. La taille maximale autorisée est de ${maxMb} Mo.`
    );
  }

  static recipientNotFound(details?: string) {
    return new TransferError(
      "TRANSFER_RECIPIENT_NOT_FOUND",
      "Le destinataire n'est plus disponible.",
      details
    );
  }

  static uploadFailed(details?: string, cause?: unknown) {
    return new TransferError(
      "TRANSFER_UPLOAD_FAILED",
      "Échec de l'envoi du fichier vers le stockage sécurisé.",
      details,
      cause
    );
  }

  static downloadFailed(details?: string, cause?: unknown) {
    return new TransferError(
      "TRANSFER_DOWNLOAD_FAILED",
      "Échec du téléchargement du fichier distant.",
      details,
      cause
    );
  }
}

/**
 * Erreurs relatives aux espaces collaboratifs.
 */
export class SpaceError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "error",
      cause,
    });
    this.name = "SpaceError";
  }

  static noTargetDevices() {
    return new SpaceError(
      "SPACE_NO_TARGET_DEVICES",
      "Aucun appareil destinataire actif dans cet espace."
    );
  }

  static inviteInvalid(details?: string) {
    return new SpaceError(
      "SPACE_INVITE_INVALID",
      "Ce code d'invitation d'espace est invalide ou expiré.",
      details
    );
  }
}

/**
 * Erreurs relatives à l'espace de stockage (Workspace).
 */
export class WorkspaceError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "error",
      cause,
    });
    this.name = "WorkspaceError";
  }

  static notFound(details?: string) {
    return new WorkspaceError(
      "WORKSPACE_NOT_FOUND",
      "L'espace de stockage personnel est introuvable.",
      details
    );
  }

  static quotaExceeded(details?: string) {
    return new WorkspaceError(
      "WORKSPACE_QUOTA_EXCEEDED",
      "Le quota de stockage de votre espace personnel est atteint.",
      details
    );
  }
}

/**
 * Erreurs liées au presse-papiers partagé.
 */
export class ClipboardError extends AppError {
  constructor(code: string, userMessage: string, details?: string, cause?: unknown) {
    super({
      code,
      userMessage,
      technicalDetails: details,
      severity: "warning",
      cause,
    });
    this.name = "ClipboardError";
  }

  static accessDenied() {
    return new ClipboardError(
      "CLIPBOARD_ACCESS_DENIED",
      "L'accès au presse-papiers a été refusé par votre navigateur. Collez manuellement le texte."
    );
  }

  static empty() {
    return new ClipboardError(
      "CLIPBOARD_EMPTY",
      "Le presse-papiers local est vide."
    );
  }

  static tooLarge(maxKiB: number) {
    return new ClipboardError(
      "CLIPBOARD_TOO_LARGE",
      `Le contenu est trop volumineux. La limite est de ${maxKiB} Kio.`
    );
  }

  static readTimeout() {
    return new ClipboardError(
      "CLIPBOARD_READ_TIMEOUT",
      "La lecture du presse-papiers prend trop de temps. Collez le contenu manuellement."
    );
  }

}

/**
 * Vérifie si une erreur provient d'un problème de réseau ou d'Internet.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof AppError && error.code === "NETWORK_ERROR") return true;

  if (typeof error === "string") {
    return /failed to fetch|network(error| request failed)|fetch failed|internet_disconnected|timeout|connexion/i.test(error);
  }

  if (error && typeof error === "object") {
    const err = error as { message?: string; name?: string; status?: number };
    const msg = String(err.message || "").toLowerCase();
    const name = String(err.name || "").toLowerCase();
    return (
      name === "networkerror" ||
      err.status === 0 ||
      /failed to fetch|network(error| request failed)|fetch failed|internet_disconnected|timeout|abort/i.test(msg)
    );
  }

  return false;
}

type ErrorDetails = {
  code?: unknown;
  message?: unknown;
  error_description?: unknown;
  status?: unknown;
};

const messages = {
  fallback: "Nous n'avons pas pu effectuer cette action. Veuillez réessayer dans un instant.",
  emailExists: "Cette adresse e-mail est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.",
  invalidCredentials: "Identifiants non reconnus. Vérifiez votre adresse e-mail et votre mot de passe.",
  rateLimit: "Hop ! Un peu trop de tentatives. Prenez une courte pause avant de réappuyer.",
  network: "Connexion réseau interrompue. Vos échanges seront automatiquement synchronisés dès le retour du réseau.",
};

/**
 * Convertit n'importe quelle erreur en message utilisateur clair et convivial.
 */
export function friendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (isNetworkError(error)) {
    return messages.network;
  }

  const details =
    typeof error === "string"
      ? { message: error }
      : error && typeof error === "object"
        ? (error as ErrorDetails)
        : {};

  const code = typeof details.code === "string" ? details.code.toLowerCase() : "";
  const message =
    typeof details.message === "string"
      ? details.message.toLowerCase()
      : typeof details.error_description === "string"
        ? details.error_description.toLowerCase()
        : "";
  const status = Number(details.status);

  if (
    ["user_already_exists", "email_exists"].includes(code) ||
    /email.*already (exists|registered|in use)|user already registered/.test(message)
  ) {
    return messages.emailExists;
  }
  if (
    ["invalid_credentials", "invalid_login_credentials"].includes(code) ||
    /invalid login credentials|invalid email or password|wrong password/.test(message)
  ) {
    return messages.invalidCredentials;
  }
  if (
    status === 429 ||
    /rate.?limit|too many requests|over_email_send_rate_limit|over_request_rate_limit/.test(
      `${code} ${message}`
    )
  ) {
    return "Trop de tentatives ou d'e-mails envoyés. Veuillez patienter quelques minutes.";
  }

  if (/auth session missing|session_not_found|no active session/i.test(message)) {
    return "Aucune session de réinitialisation active. Veuillez ouvrir le lien reçu par e-mail ou saisir votre code à 6 chiffres.";
  }

  if (/same_password|new password should be different/i.test(message)) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }

  if (/password should be at least|password is too short/i.test(message)) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }

  if (/token has expired|invalid token|otp_expired|token_expired/i.test(message)) {
    return "Le code ou le lien a expiré. Veuillez faire une nouvelle demande.";
  }

  const knownMessages: Record<string, string> = {
    "code introuvable": "Ce code d'appairage n'est pas reconnu.",
    "code déjà utilisé": "Ce code a déjà été utilisé. Demandez-en un nouveau.",
    "code expiré": "Ce code a expiré. Demandez-en un nouveau.",
    "code déjà utilisé ou expiré": "Ce code n'est plus valide. Demandez-en un nouveau.",
    "session introuvable": "Votre session n'est plus valide. Reconnectez-vous.",
    "texte vide": "Saisissez un message avant l'envoi.",
    "aucun fichier": "Sélectionnez un fichier à envoyer.",
    "destinataire introuvable": "Le destinataire n'est plus disponible.",
    "aucun appareil destinataire dans cet espace": "Aucun appareil destinataire dans cet espace.",
    "téléchargement échoué": "Le téléchargement du fichier a échoué.",
  };

  const originalMessage =
    typeof details.message === "string"
      ? details.message
      : typeof details.error_description === "string"
        ? details.error_description
        : typeof error === "string"
          ? error
          : null;

  if (originalMessage) {
    const friendly = knownMessages[originalMessage.toLowerCase()];
    if (friendly) return friendly;
    // Si c'est un message textuel explicite non masqué, le renvoyer
    if (originalMessage.length < 150) {
      return originalMessage;
    }
  }

  return messages.fallback;
}