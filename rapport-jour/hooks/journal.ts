import type { EngineInterface } from 'claude-code'

import { ENTREES_MAX_PAR_SESSION, JOURS_GARDES, PREFIXE_JOURNAL } from './config'
import { cleJournal, jourDe, jourDeCle, lireEntrees, type Entree } from './regles'

const JOUR_MS = 24 * 60 * 60 * 1000

/** Ajoute une entrée au journal du jour de cette session (une clé par session : pas d'écrasement entre sessions). */
export async function noter($: EngineInterface, jour: string, entree: Entree): Promise<void> {
  const cle = cleJournal(jour, await $.session.id())
  const avant = lireEntrees(await $.store.get(cle))

  await $.store.set(cle, [...avant, entree].slice(-ENTREES_MAX_PAR_SESSION))
}

/** Toutes les entrées d'un jour, toutes sessions confondues. */
export async function lireJour($: EngineInterface, jour: string): Promise<Entree[]> {
  const cles = (await $.store.keys()).filter(cle => cle.startsWith(`${PREFIXE_JOURNAL}${jour}:`))
  const parSession = await Promise.all(cles.map(async cle => lireEntrees(await $.store.get(cle))))

  return parSession.flat()
}

/** Efface les journaux et les marques d'envoi trop vieux. */
export async function nettoyer($: EngineInterface, maintenant: number): Promise<void> {
  const limite = jourDe(maintenant - JOURS_GARDES * JOUR_MS)
  const vieilles = (await $.store.keys()).filter(cle => {
    const jour = jourDeCle(cle)

    return jour !== undefined && jour < limite
  })

  await Promise.all(vieilles.map(cle => $.store.delete(cle)))
}
