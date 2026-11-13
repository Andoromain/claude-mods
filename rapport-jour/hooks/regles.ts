import {
  COMMANDE_MOD,
  CONSIGNE,
  ENTREES_MAX_PAR_RAPPORT,
  HEURE_PAR_DEFAUT,
  MOT_ENVOI,
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

/**
 * Balises que Claude Code ajoute autour ou à la place de ce que la personne a écrit (fichier ouvert,
 * sélection, consignes du navigateur, rappels, fin de tâche de fond…). Liste fermée : une balise de
 * composant que la personne écrit elle-même (`<bureau-sidebar>`) n'est jamais retirée.
 */
const BALISES_AJOUTEES = [
  'browser_instruction', 'ide_opened_file', 'ide_selection', 'ide_diagnostics', 'system-reminder',
  'task-notification', 'local-command-caveat', 'local-command-stdout', 'local-command-stderr',
  'command-name', 'command-message', 'command-args', 'bash-input', 'bash-stdout', 'bash-stderr',
  'deja-recall', 'user-prompt-submit-hook',
].join('|')
const BLOC_FERME = new RegExp(`<(${BALISES_AJOUTEES})\\b[^>]*>[\\s\\S]*?</\\1>`, 'g')
/** Une balise ouverte et jamais fermée (texte coupé à la longueur gardée) emporte la fin du texte. */
const BLOC_OUVERT = new RegExp(`<(?:${BALISES_AJOUTEES})\\b[^>]*>[\\s\\S]*$`)
const COLLE = /<pasted_content\b[^>]*>([\s\S]*?)(?:<\/pasted_content>|$)/g

/** La demande telle que la personne l'a écrite : sans les balises ajoutées, le texte collé gardé. */
export const nettoyerDemande = (texte: string): string =>
  texte
    .replace(BLOC_FERME, ' ')
    .replace(BLOC_OUVERT, ' ')
    .replace(COLLE, '$1')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Ce que le magasin a rendu, réduit aux entrées bien formées dont il reste une demande une fois
 * nettoyée : les entrées notées avant ce nettoyage sont corrigées à la lecture.
 */
export const lireEntrees = (valeur: unknown): Entree[] =>
  (Array.isArray(valeur) ? valeur.filter(estEntree) : [])
    .map(entree => ({ ...entree, demande: nettoyerDemande(entree.demande) }))
    .filter(entree => entree.demande !== '')

/**
 * L'heure d'envoi lue dans le texte de settings.json, ou undefined. Les réglages changés à la main
 * n'atteignent le mod qu'au redémarrage : il les relit à chaque vérification.
 */
export const heureDesReglages = (texte: string): string | undefined => {
  try {
    const configs = (JSON.parse(texte) as { pluginConfigs?: Record<string, { options?: { heure?: unknown } }> })
      .pluginConfigs
    const cle = Object.keys(configs ?? {}).find(nom => nom.startsWith(`${COMMANDE_MOD}@`))
    const heure = cle === undefined ? undefined : configs?.[cle]?.options?.heure
    if (typeof heure !== 'string') return undefined
    const lue = lireHeure(heure)

    // lireHeure retombe sur l'heure par défaut quand le texte n'est pas une heure : ce n'est pas un réglage.
    return lue === HEURE_PAR_DEFAUT && heure.trim() !== HEURE_PAR_DEFAUT ? undefined : lue
  } catch {
    // settings.json illisible : on garde l'heure lue au démarrage.
    return undefined
  }
}

/** Les mots passés à /rapport qui ne sont pas le mot d'envoi. */
export const motsInconnus = (args: string): string[] =>
  args
    .split(/\s+/)
    .map(mot => mot.trim().toLowerCase())
    .filter(mot => mot !== '' && mot !== MOT_ENVOI)

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

export type Projet = { nom: string; faits: string[] }
export type Rapport = { resume: string; projets: Projet[]; reste: string[] }
/** Les chiffres clés de la journée, tirés du journal. */
export type Resume = { demandes: number; projets: number; plage: string }

const textes = (valeur: unknown): string[] =>
  Array.isArray(valeur)
    ? valeur
        .filter((un): un is string => typeof un === 'string' && un.trim() !== '')
        .map(un => un.trim())
    : []

const lireProjet = (valeur: unknown): Projet | undefined => {
  if (typeof valeur !== 'object' || valeur === null) return undefined
  const { nom, faits } = valeur as Record<string, unknown>
  const lus = textes(faits)

  return typeof nom === 'string' && nom.trim() !== '' && lus.length > 0
    ? { nom: nom.trim(), faits: lus }
    : undefined
}

/**
 * Le rapport sans rédaction : les demandes rangées par projet, quand le modèle n'a pas répondu comme
 * attendu ; `raison` dit pourquoi.
 */
export const rapportDepuisJournal = (entrees: readonly Entree[], raison?: string): Rapport => {
  const triees = trierEntrees(entrees)
  const noms = [...new Set(triees.map(entree => entree.depot))]

  return {
    resume:
      triees.length === 0
        ? 'Rien de noté ce jour-là.'
        : `Rapport non rédigé${raison === undefined ? '' : ` (${raison})`} : voici les demandes de la journée.`,
    projets: noms.map(nom => ({
      nom,
      faits: triees
        .filter(entree => entree.depot === nom)
        .map(entree => `${entree.heure} — ${entree.demande}`),
    })),
    reste: [],
  }
}

/** Lit la réponse du modèle ; undefined quand ce n'est pas le JSON demandé. */
export const lireRapport = (reponse: string): Rapport | undefined => {
  const debut = reponse.indexOf('{')
  const fin = reponse.lastIndexOf('}')
  if (debut < 0 || fin <= debut) return undefined
  try {
    const lu: unknown = JSON.parse(reponse.slice(debut, fin + 1))
    if (typeof lu !== 'object' || lu === null) return undefined
    const { resume, projets, reste } = lu as Record<string, unknown>
    if (typeof resume !== 'string' || resume.trim() === '') return undefined

    return {
      resume: resume.trim(),
      projets: (Array.isArray(projets) ? projets : [])
        .map(lireProjet)
        .filter((projet): projet is Projet => projet !== undefined),
      reste: textes(reste),
    }
  } catch {
    // Réponse coupée ou mal formée : le rapport sera bâti depuis le journal.
    return undefined
  }
}

export const resumeJournal = (entrees: readonly Entree[]): Resume => {
  const triees = trierEntrees(entrees)
  const premiere = triees[0]?.heure
  const derniere = triees[triees.length - 1]?.heure

  return {
    demandes: triees.length,
    projets: new Set(triees.map(entree => entree.depot)).size,
    plage: premiere === undefined || derniere === undefined ? '—' : `${premiere} – ${derniere}`,
  }
}

const puces = (points: readonly string[]): string => points.map(point => `- ${point}`).join('\n')

/** Le rapport en texte : pour la conversation, et pour une messagerie qui n'affiche pas le HTML. */
export const texteRapport = (rapport: Rapport): string =>
  [
    rapport.resume,
    ...rapport.projets.map(projet => `**${projet.nom}**\n${puces(projet.faits)}`),
    ...(rapport.reste.length === 0 ? [] : [`**Reste à faire**\n${puces(rapport.reste)}`]),
  ].join('\n\n')

/** Ce que le script d'envoi lit sur son entrée standard : le texte seul et sa version mise en page. */
export const messageMail = (courrier: Courrier, jour: string, texte: string, html: string): string =>
  JSON.stringify({ ...courrier, sujet: titreRapport(jour), texte: texte.replace(/\*\*/g, ''), html })
