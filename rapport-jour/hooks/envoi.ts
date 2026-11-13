import type { EngineInterface, ModelCompleteResult } from 'claude-code'

import { DELAI_ENVOI_MS, DELAI_REDACTION_MS, JETONS_MAX, MODELE, SCRIPT_ENVOI } from './config'
import { htmlRapport } from './courriel'
import { lireJour } from './journal'
import {
  consigneRapport,
  lireRapport,
  messageMail,
  rapportDepuisJournal,
  resumeJournal,
  texteRapport,
  type Courrier,
  type Rapport,
  type Resume,
} from './regles'

/** Un rapport prêt à montrer : son contenu et les chiffres clés de la journée. */
export type Redige = { rapport: Rapport; resume: Resume }

/** Le rapport d'un jour, rédigé par le modèle ; les demandes rangées par projet s'il ne répond pas comme attendu. */
export async function rediger($: EngineInterface, jour: string): Promise<Redige> {
  const entrees = await lireJour($, jour)
  const resume = resumeJournal(entrees)
  if (entrees.length === 0) return { rapport: rapportDepuisJournal(entrees), resume }
  const reponse = await $.model.complete({
    model: MODELE,
    prompt: consigneRapport(jour, entrees),
    maxTokens: JETONS_MAX,
    timeoutMs: DELAI_REDACTION_MS,
  })
  if (!reponse.isAnswered) return { rapport: rapportDepuisJournal(entrees, raisonSansReponse(reponse)), resume }
  const lu = lireRapport(reponse.text)
  if (lu !== undefined) return { rapport: lu, resume }
  const coupee = reponse.usage.output_tokens >= JETONS_MAX

  return {
    rapport: rapportDepuisJournal(entrees, coupee ? 'réponse du modèle coupée' : 'réponse du modèle illisible'),
    resume,
  }
}

/** Pourquoi le modèle n'a rien rendu, en clair pour le rapport. */
function raisonSansReponse(reponse: Extract<ModelCompleteResult, { isAnswered: false }>): string {
  if (reponse.reason === 'api-error') return `erreur du service de rédaction : ${reponse.error} ${reponse.status ?? ''}`.trim()
  if (reponse.reason === 'empty-reply') return 'réponse vide du modèle'

  return 'rédaction interrompue'
}

/** Envoie le rapport par e-mail ; renvoie undefined quand c'est parti, sinon la raison de l'échec. */
export async function envoyerMail(
  $: EngineInterface,
  courrier: Courrier,
  jour: string,
  redige: Redige,
): Promise<string | undefined> {
  try {
    const { exitCode, stderr } = await $.process.run(['python3', '-I', '-c', SCRIPT_ENVOI], {
      stdin: messageMail(
        courrier,
        jour,
        texteRapport(redige.rapport),
        htmlRapport(jour, redige.rapport, redige.resume),
      ),
      timeoutMs: DELAI_ENVOI_MS,
    })
    if (exitCode === 0) return undefined
    // La dernière ligne de l'erreur dit pourquoi (identifiants refusés, serveur injoignable).
    const raison = stderr.trim().split('\n').pop() ?? ''

    return raison.slice(0, 160) || `l'envoi a répondu ${exitCode}`
  } catch (erreur) {
    return String(erreur).slice(0, 120)
  }
}
