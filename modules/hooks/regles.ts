import type { Module } from '../types'
import {
  BRANCHES_PAR_DEFAUT,
  CLES_BOOLEENNES,
  CLES_REFUSEES,
  LIBELLES,
  SECTIONS_SURES,
  VALEURS_BOOLEENNES,
} from './config'

export type Statut = { branche: string; modifs: number; avance: number; retard: number }

export type Categorie = keyof typeof LIBELLES

/** Lit la sortie de `git status --porcelain=v2 --branch`. */
export const lireStatut = (sortie: string): Statut => {
  const lignes = sortie.split('\n').filter(ligne => ligne.trim() !== '')
  const entete = (cle: string): string | undefined =>
    lignes.find(ligne => ligne.startsWith(`# ${cle} `))?.slice(cle.length + 3)
  const [avance = 0, retard = 0] = (entete('branch.ab') ?? '')
    .split(' ')
    .map(part => Math.abs(Number.parseInt(part, 10)) || 0)

  return {
    branche: entete('branch.head') ?? '?',
    modifs: lignes.filter(ligne => !ligne.startsWith('#')).length,
    avance,
    retard,
  }
}

export const estParDefaut = (branche: string): boolean => BRANCHES_PAR_DEFAUT.includes(branche)

export const categorie = (module: Module): Categorie => {
  if (module.erreur !== null || module.modifs > 0 || module.retard > 0) return 'aTraiter'
  if (!estParDefaut(module.branche) || module.avance > 0 || module.pr !== null) return 'enCours'

  return 'auRepos'
}

const RANG: Record<Categorie, number> = { aTraiter: 0, enCours: 1, auRepos: 2 }

export const trier = (modules: readonly Module[]): Module[] =>
  [...modules].sort(
    (a, b) => RANG[categorie(a)] - RANG[categorie(b)] || a.nom.localeCompare(b.nom),
  )

export const parCategorie = (modules: readonly Module[], voulue: Categorie): Module[] =>
  modules.filter(module => categorie(module) === voulue)

/** « a, b ,c » ou une valeur absente -> ['a', 'b', 'c']. */
export const lireListe = (texte: unknown): string[] =>
  typeof texte === 'string'
    ? texte
        .split(/[,\n]/)
        .map(part => part.trim().replace(/\/+$/, ''))
        .filter(part => part !== '')
    : []

export const dossierParent = (chemin: string): string =>
  chemin.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/'

export const nomDossier = (chemin: string): string =>
  chemin.replace(/\/+$/, '').split('/').pop() ?? chemin

export const estCache = (chemin: string, caches: readonly string[]): boolean =>
  caches.includes(chemin) || caches.includes(nomDossier(chemin))

/** Une lecture sans les PR garde celles déjà connues, tant que la branche n'a pas changé. */
export const garderPr = (frais: readonly Module[], avant: readonly Module[]): Module[] =>
  frais.map(module => {
    const ancien = avant.find(autre => autre.chemin === module.chemin)

    return ancien !== undefined && ancien.branche === module.branche
      ? { ...module, pr: ancien.pr }
      : module
  })

export const heure = (ms: number): string => {
  const date = new Date(ms)
  const deux = (n: number): string => String(n).padStart(2, '0')

  return `${deux(date.getHours())}:${deux(date.getMinutes())}`
}

export const libellePr = (module: Module): string =>
  module.pr === null ? '' : `#${module.pr.numero}${module.pr.estBrouillon ? ' brouillon' : ''}`

/** Le même contenu que le panneau, en texte, pour une surface qui ne le dessine pas. */
export const tableauTexte = (modules: readonly Module[]): string =>
  modules.length === 0
    ? 'Aucun dépôt git trouvé.'
    : [
        '| Module | Branche | Modifs | Avance | Retard | PR |',
        '| --- | --- | --- | --- | --- | --- |',
        ...modules.map(module =>
          module.erreur !== null
            ? `| ${module.nom} | illisible : ${module.erreur} | | | | |`
            : `| ${module.nom} | ${module.branche} | ${module.modifs || ''} | ${module.avance || ''} | ${module.retard || ''} | ${libellePr(module)} |`,
        ),
      ].join('\n')

/**
 * Vrai quand le `.git/config` d'un dépôt ne contient que des sections admises et aucune clé
 * qui désigne un programme : git peut y être lancé sans rien faire exécuter d'autre.
 */
export const configSure = (config: string): boolean =>
  config
    .split('\n')
    .map(ligne => ligne.trim().toLowerCase())
    .filter(ligne => ligne !== '' && !ligne.startsWith('#') && !ligne.startsWith(';'))
    .every(ligne => {
      // Une ligne qui commence par « [ » doit être un en-tête entier et rien d'autre :
      // git accepte une clé à la suite du « ] » sur la même ligne.
      if (ligne.startsWith('[')) {
        const section = /^\[\s*([a-z0-9-]+)(\s+"[^"\\]*")?\s*\]$/.exec(ligne)

        return section !== null && SECTIONS_SURES.includes(section[1] ?? '')
      }
      const cle = /^([a-z0-9.-]+)\s*(?:=\s*(.*))?$/.exec(ligne)
      if (cle === null || CLES_REFUSEES.includes(cle[1] ?? '')) return false

      return !CLES_BOOLEENNES.includes(cle[1] ?? '') || VALEURS_BOOLEENNES.includes(cle[2] ?? '')
    })

/** Vrai quand le contenu de `.git/HEAD` est celui d'un vrai dépôt : une branche ou un commit. */
export const teteValide = (tete: string): boolean =>
  /^(ref: refs\/[^\s]+|[0-9a-f]{40}(?:[0-9a-f]{24})?)\s*$/.test(tete)
