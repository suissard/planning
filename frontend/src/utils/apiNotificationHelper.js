/**
 * Helper to translate HTTP API status codes and endpoints into
 * human-intelligible, friendly French messages.
 */

// Human-friendly translations for HTTP status codes
const HTTP_STATUS_MESSAGES = {
  400: {
    title: 'Requête invalide',
    defaultMessage: 'Les données transmises sont incomplètes ou invalides. Veuillez vérifier votre saisie.'
  },
  401: {
    title: 'Authentification requise',
    defaultMessage: 'Votre session a expiré ou vos identifiants sont incorrects. Veuillez vous reconnecter.'
  },
  403: {
    title: 'Action non autorisée',
    defaultMessage: 'Vous ne disposez pas des autorisations nécessaires pour réaliser cette opération.'
  },
  404: {
    title: 'Élément introuvable',
    defaultMessage: 'La ressource demandée n\'existe pas ou a été déplacée/supprimée.'
  },
  408: {
    title: 'Délai d\'attente dépassé',
    defaultMessage: 'Le serveur met trop de temps à répondre. Veuillez réessayer ultérieurement.'
  },
  409: {
    title: 'Conflit de données',
    defaultMessage: 'Cette ressource est en conflit avec un élément existant (doublon ou contrainte).'
  },
  422: {
    title: 'Données non valides',
    defaultMessage: 'Certains critères ou règles de validation n\'ont pas été respectés.'
  },
  429: {
    title: 'Trop de requêtes',
    defaultMessage: 'Trop de requêtes ont été envoyées en peu de temps. Veuillez patienter un instant.'
  },
  500: {
    title: 'Erreur interne du serveur',
    defaultMessage: 'Un problème inattendu est survenu sur le serveur. Nos équipes en sont informées.'
  },
  502: {
    title: 'Passerelle incorrecte',
    defaultMessage: 'Le serveur backend est temporairement indisponible ou inaccessible.'
  },
  503: {
    title: 'Service indisponible',
    defaultMessage: 'Le service est actuellement en cours de maintenance. Veuillez patienter.'
  },
  504: {
    title: 'Passerelle expirée',
    defaultMessage: 'Le serveur en amont n\'a pas répondu à temps.'
  }
};

// Resource names based on API path
const RESOURCE_NAMES = [
  { pattern: /activity-templates/i, singular: 'Activité' },
  { pattern: /locations/i, singular: 'Lieu' },
  { pattern: /facilitators/i, singular: 'Animateur' },
  { pattern: /participants/i, singular: 'Participant' },
  { pattern: /time-slots/i, singular: 'Créneau horaire' },
  { pattern: /room-sessions/i, singular: 'Session de salle' },
  { pattern: /auth\/local\/register/i, singular: 'Compte utilisateur', customCreate: 'Compte créé avec succès ! Bienvenue.' },
  { pattern: /auth\/local/i, singular: 'Connexion', customCreate: 'Connexion réussie !' },
  { pattern: /users/i, singular: 'Profil utilisateur' }
];

/**
 * Extracts and formats a friendly error notification from an Axios error
 * @param {Error} error Axios error
 * @returns {{ title: string, message: string, status: number|null }}
 */
export function getIntelligibleErrorMessage(error) {
  if (!error) {
    return {
      title: 'Erreur inconnue',
      message: 'Une erreur imprévue est survenue.',
      status: null
    };
  }

  // Check if network error (no response)
  if (!error.response) {
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      return {
        title: 'Erreur de connexion',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet ou le statut du serveur.',
        status: null
      };
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        title: 'Délai d\'attente dépassé',
        message: 'La requête a pris trop de temps. Le serveur n\'a pas répondu.',
        status: 408
      };
    }
    return {
      title: 'Erreur',
      message: error.message || 'Une erreur de communication est survenue.',
      status: null
    };
  }

  const status = error.response.status;
  const statusInfo = HTTP_STATUS_MESSAGES[status] || {
    title: `Erreur HTTP ${status}`,
    defaultMessage: 'Une erreur est survenue lors de l\'échange avec le serveur.'
  };

  // Attempt to extract custom backend message from Strapi / custom API
  const responseData = error.response.data;
  let customDetail = '';

  if (responseData?.error?.message && typeof responseData.error.message === 'string') {
    const rawMsg = responseData.error.message.trim();
    if (rawMsg && !rawMsg.match(/^(bad request|internal server error|not found|unauthorized)$/i)) {
      customDetail = rawMsg;
    }
  } else if (responseData?.message && typeof responseData.message === 'string') {
    customDetail = responseData.message;
  }

  // Check validation details
  if (responseData?.error?.details?.errors && Array.isArray(responseData.error.details.errors)) {
    const fieldErrors = responseData.error.details.errors
      .map(e => e.message || e.path?.join('.'))
      .filter(Boolean)
      .join(', ');
    if (fieldErrors) {
      customDetail = fieldErrors;
    }
  }

  const finalMessage = customDetail 
    ? `${statusInfo.defaultMessage} (${customDetail})`
    : statusInfo.defaultMessage;

  return {
    title: statusInfo.title,
    message: finalMessage,
    status
  };
}

/**
 * Extracts and formats a friendly success notification for mutation HTTP calls (POST, PUT, PATCH, DELETE)
 * Returns null for GET requests (or if notifications are skipped).
 * @param {import('axios').AxiosResponse} response
 * @returns {{ title: string, message: string } | null}
 */
export function getIntelligibleSuccessMessage(response) {
  if (!response || !response.config) return null;

  const method = (response.config.method || '').toUpperCase();
  const url = response.config.url || '';

  // Only notify on mutations: POST, PUT, PATCH, DELETE (ignore GET, HEAD, OPTIONS)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  // Check if custom success message was provided in request config
  if (response.config.successMessage) {
    return {
      title: 'Succès',
      message: response.config.successMessage
    };
  }

  // Match resource by URL
  const matchedResource = RESOURCE_NAMES.find(r => r.pattern.test(url));
  const resName = matchedResource ? matchedResource.singular : 'Élément';

  if (method === 'POST') {
    if (matchedResource?.customCreate) {
      return {
        title: 'Succès',
        message: matchedResource.customCreate
      };
    }
    return {
      title: `${resName} créé`,
      message: `${resName} créé(e) avec succès !`
    };
  }

  if (method === 'PUT' || method === 'PATCH') {
    return {
      title: `${resName} mis à jour`,
      message: `Modifications enregistrées avec succès !`
    };
  }

  if (method === 'DELETE') {
    return {
      title: `${resName} supprimé`,
      message: `${resName} supprimé(e) avec succès !`
    };
  }

  return {
    title: 'Opération réussie',
    message: 'L\'opération a été effectuée avec succès.'
  };
}
