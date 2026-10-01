type ErrorDetails = {
  code?: unknown;
  message?: unknown;
  error_description?: unknown;
  status?: unknown;
};

const messages = {
  fallback: "Une erreur est survenue. Réessayez.",
  emailExists:
    "Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
  invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
  rateLimit: "Trop de tentatives. Patientez quelques instants avant de réessayer.",
  network: "Connexion impossible. Vérifiez votre accès à Internet et réessayez.",
};

export function friendlyError(error: unknown): string {
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
    return messages.rateLimit;
  }
  if (
    /failed to fetch|network(error| request failed)|fetch failed|internet_disconnected|timeout/.test(
      message
    )
  ) {
    return messages.network;
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
  };

  const originalMessage =
    typeof details.message === "string" ? details.message : error;
  if (typeof originalMessage === "string") {
    const friendly = knownMessages[originalMessage.toLowerCase()];
    if (friendly) return friendly;
  }

  return messages.fallback;
}