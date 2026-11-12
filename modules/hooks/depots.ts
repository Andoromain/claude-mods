import type { EngineInterface } from 'claude-code'

import type { Module, PullRequest } from '../types'
import {
  CONFIGS_CACHEES,
  CONTENU_GIT,
  DELAI_GH_MS,
  DELAI_GIT_MS,
  GIT_SANS_EXECUTION,
  NON_LU,
  OPTIONS_STATUT,
} from './config'
import { configSure, teteValide, dossierParent, estCache, estParDefaut, lireStatut, nomDossier } from './regles'

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

/** Faux quand la configuration du dépôt est illisible (arbre de travail lié) ou peut lancer un programme. */
async function estSur($: EngineInterface, chemin: string): Promise<boolean> {
  try {
    const presents = await Promise.all(
      CONTENU_GIT.map(nom => $.fs.exists(`${chemin}/.git/${nom}`)),
    )
    if (presents.includes(false)) return false
    const cachees = await Promise.all(
      CONFIGS_CACHEES.map(nom => $.fs.exists(`${chemin}/.git/${nom}`)),
    )
    if (cachees.includes(true)) return false
    // Un HEAD invalide ferait dire à git « pas un dépôt » et chercher ailleurs.
    if (!teteValide(await $.fs.read(`${chemin}/.git/HEAD`))) return false

    return configSure(await $.fs.read(`${chemin}/.git/config`))
  } catch {
    // Pas de configuration lisible : dans le doute, git n'est pas lancé.
    return false
  }
}

/** Le chemin réel du dossier, liens symboliques résolus ; undefined s'il ne peut pas être établi. */
async function cheminReel($: EngineInterface, chemin: string): Promise<string | undefined> {
  try {
    return (await $.fs.stat(chemin, { resolve: true })).realPath
  } catch {
    return undefined
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
    // Tout se fait sur le chemin réel : la vérification et git regardent le même dossier.
    const reel = await cheminReel($, chemin)
    if (reel === undefined || !(await estSur($, reel))) return { ...vide, erreur: NON_LU }
    const { exitCode, stdout, stderr } = await $.process.run(
      ['git', ...GIT_SANS_EXECUTION, 'status', ...OPTIONS_STATUT],
      // git cherche le dépôt lui-même, ce qui garde son contrôle du propriétaire (safe.directory),
      // mais sans remonter au-dessus du dossier ni changer de disque : jamais un dépôt non vérifié.
      {
        cwd: reel,
        timeoutMs: DELAI_GIT_MS,
        env: { GIT_CEILING_DIRECTORIES: dossierParent(reel), GIT_DISCOVERY_ACROSS_FILESYSTEM: '0' },
      },
    )
    if (exitCode !== 0) return { ...vide, erreur: stderr.trim().slice(0, 80) || `git a répondu ${exitCode}` }
    const statut = lireStatut(stdout)
    const pr = avecPr && !estParDefaut(statut.branche) ? await lirePr($, chemin) : null

    return { ...vide, ...statut, pr, erreur: null }
  } catch (erreur) {
    return { ...vide, erreur: String(erreur).slice(0, 80) }
  }
}
