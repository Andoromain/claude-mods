import type { EngineInterface, Register, Timer } from 'claude-code'
import {
  COMMANDE,
  DELAI_AFFICHAGE_MS,
  DELAI_ALERTE_MS,
  PERIODE_SURVEILLANCE_MS,
  MOTIFS,
  SERVEUR_NTFY,
  SUJET_MANQUANT,
  SUJET_VALIDE,
  type Motif,
} from './config'
import { lirePresence } from './fenetre'
import { notifierSysteme } from './notification-systeme'

const CLE_TOUR = 'tour'
const TITRE = 'Claude Code attend'

/** Ce qui attend une réponse : clé (appel d'outil ou tour) -> motif. */
let attentes: ReadonlyMap<string, Motif> = new Map()
let minuteur: Timer | undefined
/** Le court délai avant la notification du poste. */
let minuteurPoste: Timer | undefined
/** L'adresse d'envoi, ou undefined tant que la personne n'a pas réglé son sujet. */
let adresseNtfy: string | undefined

const lireAdresse = (sujet: unknown): string | undefined =>
  typeof sujet === 'string' && SUJET_VALIDE.test(sujet.trim())
    ? `${SERVEUR_NTFY}/${sujet.trim()}`
    : undefined

const envoyerTelephone = async ($: EngineInterface, motif: Motif): Promise<boolean> => {
  if (adresseNtfy === undefined) {
    $.ui.toast(SUJET_MANQUANT)

    return false
  }
  try {
    const reponse = await $.http.fetch(adresseNtfy, {
      method: 'POST',
      headers: { Title: TITRE, Priority: 'urgent', Tags: 'bell' },
      body: MOTIFS[motif],
    })
    if (!reponse.ok) $.ui.toast(`Alerte téléphone refusée (HTTP ${reponse.status}).`)

    return reponse.ok
  } catch (erreur) {
    $.ui.toast(`Alerte téléphone impossible : ${String(erreur).slice(0, 120)}`)

    return false
  }
}

/**
 * Notification du système ; à défaut, le canal de notification de Claude Code.
 * Rien n'est affiché quand la personne a déjà la session sous les yeux, sauf si `forcer` (essai).
 */
const prevenirPoste = async ($: EngineInterface, motif: Motif, forcer = false): Promise<boolean> => {
  const presence = await lirePresence($)
  if (!forcer && presence.estSurClaude) return false
  if (await notifierSysteme($, TITRE, MOTIFS[motif], presence.fenetre)) return true
  try {
    return (await $.ui.notify(MOTIFS[motif], { title: TITRE })).isSent
  } catch {
    return false
  }
}

/**
 * Prévient le poste une fois, dès que la personne n'est plus sur Claude Code : tout de suite si
 * elle est déjà ailleurs, sinon au moment où elle change de fenêtre pendant que la question attend.
 */
const surveillerPoste = ($: EngineInterface, delaiMs: number): void => {
  minuteurPoste = $.clock.after(delaiMs, () => {
    minuteurPoste = undefined
    const [premier] = attentes.values()
    if (premier === undefined) return
    void prevenirPoste($, premier).then(estPrevenu => {
      // Pas prévenue parce qu'elle regarde la session : on regardera de nouveau, tant que ça attend.
      if (!estPrevenu && attentes.size > 0 && minuteurPoste === undefined) {
        surveillerPoste($, PERIODE_SURVEILLANCE_MS)
      }
    })
  })
}

const arreterMinuteur = (): void => {
  minuteur?.cancel()
  minuteur = undefined
  minuteurPoste?.cancel()
  minuteurPoste = undefined
}

const attendre = ($: EngineInterface, cle: string, motif: Motif): void => {
  const dejaEnAttente = attentes.size > 0
  attentes = new Map([...attentes, [cle, motif]])
  if (dejaEnAttente) return

  // La notification suit l'affichage de la question, elle ne le précède pas.
  surveillerPoste($, DELAI_AFFICHAGE_MS)
  minuteur = $.clock.after(DELAI_ALERTE_MS, () => {
    minuteur = undefined
    const [premier] = attentes.values()
    if (premier === undefined) return
    void envoyerTelephone($, premier)
    void prevenirPoste($, premier)
  })
}

const repondu = (cle: string): void => {
  attentes = new Map([...attentes].filter(([autre]) => autre !== cle))
  if (attentes.size === 0) arreterMinuteur()
}

const toutRepondu = (): void => {
  attentes = new Map()
  arreterMinuteur()
}

export const register: Register = (on, options) => {
  adresseNtfy = lireAdresse(options?.sujet_ntfy)

  on('session.start', async ($, e, next) => {
    if (adresseNtfy === undefined) $.ui.toast(SUJET_MANQUANT)
    await $.command.register({
      name: COMMANDE,
      description: "Envoie une alerte de test sur le téléphone",
    })

    return next(e)
  })

  on('command.run', { command: COMMANDE }, async $ => {
    const [telephone, poste] = await Promise.all([
      envoyerTelephone($, 'test'),
      prevenirPoste($, 'test', true),
    ])
    const ligneTelephone = telephone
      ? 'Téléphone : alerte de test envoyée.'
      : adresseNtfy === undefined
        ? `Téléphone : ${SUJET_MANQUANT}`
        : "Téléphone : l'alerte de test n'est pas partie."
    const lignePoste = poste
      ? 'Poste : notification système affichée.'
      : "Poste : aucune notification système n'a pu être affichée."

    return { text: `${ligneTelephone}\n${lignePoste}` }
  })

  // Une autorisation demandée à la personne : le verdict « ask ».
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask') attendre($, e.tool_use_id ?? e.tool, 'permission')

    return verdict
  })

  // L'appel se termine (réponse donnée, outil exécuté ou refusé) : plus d'attente.
  on('tool.call', async ($, e, next) => {
    if (e.tool === 'AskUserQuestion') attendre($, e.tool_use_id, 'question')
    try {
      return await next(e)
    } finally {
      repondu(e.tool_use_id)
      repondu(e.tool)
    }
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) attendre($, CLE_TOUR, 'tour')

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    toutRepondu()

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) toutRepondu()

    return next(e)
  })

  on('session.end', ($, e, next) => {
    toutRepondu()

    return next(e)
  })
}
