/** Serveur ntfy public. Le sujet, lui, est un réglage par personne (userConfig `sujet_ntfy`). */
export const SERVEUR_NTFY = 'https://ntfy.sh'

/** Un sujet ntfy valide : lettres, chiffres, tiret, souligné, 64 caractères au plus. */
export const SUJET_VALIDE = /^[A-Za-z0-9_-]{1,64}$/

/** Délai sans réponse avant l'alerte sur le téléphone. */
export const DELAI_ALERTE_MS = 2 * 60 * 1000

export const COMMANDE = 'alerte'

export const SUJET_MANQUANT =
  'Sujet ntfy non réglé ou invalide : renseigne « Sujet ntfy » du mod alerte-attente dans /config.'

/** Textes volontairement génériques : rien du projet ne part vers ntfy. */
export const MOTIFS = {
  permission: 'Claude attend une autorisation.',
  question: 'Claude attend une réponse à une question.',
  tour: 'Claude a terminé et attend la suite.',
  test: "Test de l'alerte : tout fonctionne.",
} as const

export type Motif = keyof typeof MOTIFS

/**
 * Attente avant la notification du poste : le temps que la question soit affichée à l'écran.
 * Une réponse donnée dans ce délai n'affiche rien.
 */
export const DELAI_AFFICHAGE_MS = 1500

/** Tant qu'une question attend et que la personne est sur Claude Code, on regarde de nouveau à ce rythme si elle est partie ailleurs. */
export const PERIODE_SURVEILLANCE_MS = 3000
