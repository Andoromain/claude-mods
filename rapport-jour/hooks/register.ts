import type { EngineInterface, Register } from 'claude-code'

import {
  COMMANDE,
  LONGUEUR_DEMANDE,
  LONGUEUR_REPONSE,
  MOT_ENVOI,
  PERIODE_VERIFICATION_MS,
} from './config'
import { envoyerMail, rediger } from './envoi'
import { nettoyer, noter } from './journal'
import {
  cleEnvoye,
  couper,
  estDu,
  heureDe,
  jourDe,
  jourLisible,
  joursAEnvoyer,
  lireCourrier,
  lireHeure,
  titreRapport,
  type Courrier,
} from './regles'

type Reglages = { heure: string; courrier: Courrier | undefined }

const COURRIER_MANQUANT =
  "Envoi par e-mail non réglé ou incomplet : renseigne l'adresse et le mot de passe d'application avec /plugin configure rapport-jour."

/** La demande de chaque tour en cours, gardée jusqu'à sa fin. */
let demandes: ReadonlyMap<string, string> = new Map()
/** Une seule vérification à la fois. */
let estEnVerification = false

/** Rédige et envoie le rapport d'un jour ; la marque d'envoi est posée d'abord, retirée si l'envoi échoue. */
async function envoyerJour($: EngineInterface, courrier: Courrier, jour: string): Promise<string | undefined> {
  await $.store.set(cleEnvoye(jour), true)
  const echec = await envoyerMail($, courrier, jour, await rediger($, jour))
  if (echec !== undefined) await $.store.delete(cleEnvoye(jour))

  return echec
}

/** Envoie chaque rapport dû : les jours passés jamais envoyés, et le jour même une fois l'heure atteinte. */
async function verifier($: EngineInterface, reglages: Reglages): Promise<void> {
  const { courrier } = reglages
  if (estEnVerification || courrier === undefined) return
  estEnVerification = true
  try {
    const maintenant = await $.clock.now()
    const dus = joursAEnvoyer(await $.store.keys()).filter(jour =>
      estDu(jour, jourDe(maintenant), heureDe(maintenant), reglages.heure),
    )
    for (const jour of dus) {
      const echec = await envoyerJour($, courrier, jour)
      $.ui.toast(
        echec === undefined
          ? `${titreRapport(jour)} envoyé par e-mail.`
          : `${titreRapport(jour)} non envoyé : ${echec}`,
      )
    }
    await nettoyer($, maintenant)
  } catch (erreur) {
    $.ui.toast(`Rapport du jour : vérification impossible (${String(erreur).slice(0, 100)}).`)
  } finally {
    estEnVerification = false
  }
}

/** `/rapport` : le rapport du jour, ici ; avec « mail », envoyé aussi par e-mail. */
async function rapportDemande($: EngineInterface, reglages: Reglages, args: string): Promise<string> {
  const jour = jourDe(await $.clock.now())
  const texte = await rediger($, jour)
  const entete = `**${titreRapport(jour)}**\n\n${texte}`
  if (!args.toLowerCase().includes(MOT_ENVOI)) return entete
  if (reglages.courrier === undefined) return `${entete}\n\n${COURRIER_MANQUANT}`
  const echec = await envoyerMail($, reglages.courrier, jour, texte)

  return `${entete}\n\n${echec === undefined ? `Envoyé par e-mail à ${reglages.courrier.a}.` : `Non envoyé : ${echec}`}`
}

export const register: Register = (on, options) => {
  const reglages: Reglages = {
    heure: lireHeure(options?.heure),
    courrier: lireCourrier(options),
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMANDE,
      description: `Rapport de la journée (ajoute « ${MOT_ENVOI} » pour l'envoyer aussi par e-mail)`,
    })
    $.clock.every(PERIODE_VERIFICATION_MS, () => void verifier($, reglages))
    void verifier($, reglages)

    return next(e)
  })

  on('command.run', { command: COMMANDE }, async ($, e) => ({
    text: await rapportDemande($, reglages, e.args),
  }))

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) demandes = new Map([...demandes, [e.turnId, e.text]])

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const demande = demandes.get(e.turnId)
    demandes = new Map([...demandes].filter(([tour]) => tour !== e.turnId))
    if (e.agentId === undefined && !e.isAborted && demande !== undefined && demande.trim() !== '') {
      const maintenant = await $.clock.now()
      const depot = (await $.session.root()).split('/').filter(Boolean).pop() ?? '?'
      await noter($, jourDe(maintenant), {
        heure: heureDe(maintenant),
        depot,
        demande: couper(demande, LONGUEUR_DEMANDE),
        reponse: couper(e.answer, LONGUEUR_REPONSE),
      })
    }

    return next(e)
  })
}
