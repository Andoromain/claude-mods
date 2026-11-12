import {
  CONSIGNE,
  ENTREES_MAX_PAR_RAPPORT,
  HEURE_PAR_DEFAUT,
  PREFIXE_ENVOYE,
  PREFIXE_JOURNAL,
  SERVEUR_PAR_DEFAUT,
} from './config'

export type Entree = { heure: string; depot: string; demande: string; reponse: string }

const deux = (n: number): string => String(n).padStart(2, '0')

/** Le jour local de `ms`, au format AAAA-MM-JJ : il sert de clé et se compare comme du texte. */
export const jourDe = (ms: number): string => {
  const date = new Date(ms)

  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`
}

export const heureDe = (ms: number): string => {
  const date = new Date(ms)

  return `${deux(date.getHours())}:${deux(date.getMinutes())}`
}

/** « 2026-11-12 » -> « 12/11/2026 ». */
export const jourLisible = (jour: string): string => jour.split('-').reverse().join('/')

/** Une heure HH:MM valide, sinon l'heure par défaut. */
export const lireHeure = (texte: unknown): string => {
  const trouve = typeof texte === 'string' ? /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(texte.trim()) : null

  return trouve === null ? HEURE_PAR_DEFAUT : `${deux(Number(trouve[1]))}:${trouve[2]}`
}

export type Courrier = { de: string; a: string; mdp: string; serveur: string }

const ADRESSE = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"']+$/
const SERVEUR = /^[a-z0-9.-]+$/i

const lireAdresse = (texte: unknown): string | undefined =>
  typeof texte === 'string' && ADRESSE.test(texte.trim()) ? texte.trim() : undefined

/**
 * Les réglages d'envoi, ou undefined tant qu'ils sont incomplets ou invalides : rien ne part.
 * Sans destinataire, le rapport revient à l'adresse d'envoi.
 */
export const lireCourrier = (options: Record<string, unknown> | undefined): Courrier | undefined => {
  const de = lireAdresse(options?.email_expediteur)
  const mdp = typeof options?.mot_de_passe_application === 'string' ? options.mot_de_passe_application.trim() : ''
  const saisi = typeof options?.serveur_smtp === 'string' ? options.serveur_smtp.trim() : ''
  const serveur = saisi === '' ? SERVEUR_PAR_DEFAUT : saisi
  const voulu = typeof options?.email_destinataire === 'string' ? options.email_destinataire.trim() : ''
  const a = voulu === '' ? de : lireAdresse(voulu)
  if (de === undefined || a === undefined || mdp === '' || !SERVEUR.test(serveur)) return undefined

  return { de, a, mdp, serveur }
}

export const cleJournal = (jour: string, session: string): string =>
  `${PREFIXE_JOURNAL}${jour}:${session}`

export const cleEnvoye = (jour: string): string => `${PREFIXE_ENVOYE}${jour}`

/** Le jour d'une clé du mod (journal ou marque d'envoi), sinon undefined. */
export const jourDeCle = (cle: string): string | undefined =>
  /^(?:journal|envoye):(\d{4}-\d{2}-\d{2})(?::|$)/.exec(cle)?.[1]

/** Les jours qui ont un journal et pas encore de rapport envoyé, du plus ancien au plus récent. */
export const joursAEnvoyer = (cles: readonly string[]): string[] => {
  const envoyes = new Set(
    cles.filter(cle => cle.startsWith(PREFIXE_ENVOYE)).map(cle => jourDeCle(cle)),
  )
  const jours = cles
    .filter(cle => cle.startsWith(PREFIXE_JOURNAL))
    .map(cle => jourDeCle(cle))
    .filter((jour): jour is string => jour !== undefined && !envoyes.has(jour))

  return [...new Set(jours)].sort()
}

/** Un jour passé part tout de suite ; le jour même attend l'heure réglée. */
export const estDu = (jour: string, aujourdhui: string, maintenant: string, heure: string): boolean =>
  jour < aujourdhui || (jour === aujourdhui && maintenant >= heure)

export const estEntree = (valeur: unknown): valeur is Entree => {
  if (typeof valeur !== 'object' || valeur === null) return false
  const { heure, depot, demande, reponse } = valeur as Record<string, unknown>

  return [heure, depot, demande, reponse].every(champ => typeof champ === 'string')
}

/** Ce que le magasin a rendu, réduit aux entrées bien formées. */
export const lireEntrees = (valeur: unknown): Entree[] =>
  Array.isArray(valeur) ? valeur.filter(estEntree) : []

export const couper = (texte: string, longueur: number): string => {
  const propre = texte.replace(/\s+/g, ' ').trim()

  return propre.length > longueur ? `${propre.slice(0, longueur - 1)}…` : propre
}

export const trierEntrees = (entrees: readonly Entree[]): Entree[] =>
  [...entrees].sort((a, b) => a.heure.localeCompare(b.heure)).slice(-ENTREES_MAX_PAR_RAPPORT)

const ligne = (entree: Entree): string => `- ${entree.heure} [${entree.depot}] ${entree.demande}`

/** Le rapport sans rédaction : la liste des demandes, quand le modèle n'a pas répondu. */
export const rapportBrut = (entrees: readonly Entree[]): string =>
  entrees.length === 0 ? 'Rien de noté ce jour-là.' : trierEntrees(entrees).map(ligne).join('\n')

export const consigneRapport = (jour: string, entrees: readonly Entree[]): string =>
  [
    CONSIGNE,
    '',
    `Journal du ${jourLisible(jour)} (heure, projet, demande, puis réponse) :`,
    ...trierEntrees(entrees).map(entree => `${ligne(entree)}\n  -> ${entree.reponse}`),
  ].join('\n')

export const titreRapport = (jour: string): string => `Rapport du ${jourLisible(jour)}`

/** Ce que le script d'envoi lit sur son entrée standard. */
export const messageMail = (courrier: Courrier, jour: string, texte: string): string =>
  JSON.stringify({ ...courrier, sujet: titreRapport(jour), texte })
