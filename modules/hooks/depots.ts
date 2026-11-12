import type { EngineInterface } from 'claude-code'

import type { Module, PullRequest } from '../types'
import { DELAI_GH_MS, DELAI_GIT_MS } from './config'
import { dossierParent, estCache, estParDefaut, lireStatut, nomDossier } from './regles'

async function estDepot($: EngineInterface, chemin: string): Promise<boolean> {
  try {
    return await $.fs.exists(`${chemin}/.git`)
  } catch {
    // Dossier illisible : ce n'est pas un dépôt qu'on peut afficher.
    return false
  }
}

/** Les dépôts git rangés à côté de `racine`, plus ceux demandés, moins ceux cachés. */
export async function trouverDepots(
  $: EngineInterface,
  racine: string,
  enPlus: readonly string[],
  caches: readonly string[],
): Promise<string[]> {
  const parent = dossierParent(racine)
  const voisins = (await $.fs.list(parent))
    .filter(entree => entree.kind === 'dir')
    .map(entree => `${parent === '/' ? '' : parent}/${entree.name}`)
  const candidats = [...new Set([...voisins, ...enPlus])].filter(
    chemin => !estCache(chemin, caches),
  )
  const gardes = await Promise.all(candidats.map(chemin => estDepot($, chemin)))

  return candidats.filter((_, rang) => gardes[rang] === true)
}

async function lirePr($: EngineInterface, chemin: string): Promise<PullRequest | null> {
  try {
    const { exitCode, stdout } = await $.process.run(
      ['gh', 'pr', 'view', '--json', 'number,isDraft,url,state'],
      { cwd: chemin, timeoutMs: DELAI_GH_MS },
    )
    if (exitCode !== 0) return null
    const pr: unknown = JSON.parse(stdout)
    if (typeof pr !== 'object' || pr === null) return null
    const { number, isDraft, url, state } = pr as Record<string, unknown>

    return state === 'OPEN' && typeof number === 'number' && typeof url === 'string'
      ? { numero: number, estBrouillon: isDraft === true, url }
      : null
  } catch {
    // `gh` absent, non connecté ou réponse inattendue : pas de PR à montrer.
    return null
  }
}

/** L'état git d'un dépôt ; `avecPr` ajoute un appel à GitHub pour une branche de travail. */
export async function lireModule(
  $: EngineInterface,
  chemin: string,
  avecPr: boolean,
): Promise<Module> {
  const vide = { nom: nomDossier(chemin), chemin, branche: '?', modifs: 0, avance: 0, retard: 0, pr: null }
  try {
    const { exitCode, stdout, stderr } = await $.process.run(
      ['git', 'status', '--porcelain=v2', '--branch'],
      { cwd: chemin, timeoutMs: DELAI_GIT_MS },
    )
    if (exitCode !== 0) return { ...vide, erreur: stderr.trim().slice(0, 80) || `git a répondu ${exitCode}` }
    const statut = lireStatut(stdout)
    const pr = avecPr && !estParDefaut(statut.branche) ? await lirePr($, chemin) : null

    return { ...vide, ...statut, pr, erreur: null }
  } catch (erreur) {
    return { ...vide, erreur: String(erreur).slice(0, 80) }
  }
}
