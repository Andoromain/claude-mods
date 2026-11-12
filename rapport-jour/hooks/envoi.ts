import type { EngineInterface } from 'claude-code'

import { DELAI_ENVOI_MS, DELAI_REDACTION_MS, JETONS_MAX, MODELE, SCRIPT_ENVOI } from './config'
import { lireJour } from './journal'
import { consigneRapport, messageMail, rapportBrut, type Courrier } from './regles'

/** Le rapport d'un jour, rédigé par le modèle ; la liste brute des demandes s'il ne répond pas. */
export async function rediger($: EngineInterface, jour: string): Promise<string> {
  const entrees = await lireJour($, jour)
  if (entrees.length === 0) return rapportBrut(entrees)
  const reponse = await $.model.complete({
    model: MODELE,
    prompt: consigneRapport(jour, entrees),
    maxTokens: JETONS_MAX,
    timeoutMs: DELAI_REDACTION_MS,
  })

  return reponse.isAnswered && reponse.text.trim() !== '' ? reponse.text.trim() : rapportBrut(entrees)
}

/** Envoie le rapport par e-mail ; renvoie undefined quand c'est parti, sinon la raison de l'échec. */
export async function envoyerMail(
  $: EngineInterface,
  courrier: Courrier,
  jour: string,
  texte: string,
): Promise<string | undefined> {
  try {
    const { exitCode, stderr } = await $.process.run(['python3', '-I', '-c', SCRIPT_ENVOI], {
      stdin: messageMail(courrier, jour, texte),
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
