export const PANNEAU = 'modules'
export const COMMANDE = 'modules'
export const TITRE = 'Modules'

/** Une branche de ce nom est la branche de repos : rien en cours dessus. */
export const BRANCHES_PAR_DEFAUT: readonly string[] = ['main', 'master']

export const DELAI_GIT_MS = 10_000
export const DELAI_GH_MS = 20_000

/** Une commande du tour qui touche git : l'état affiché est à relire. */
export const COMMANDE_GIT = /(^|[\s;&|(])(git|gh)\s/

export const LIBELLES = {
  aTraiter: 'À traiter',
  enCours: 'En cours',
  auRepos: 'Au repos',
} as const

/**
 * Le mod lance git dans des dépôts que personne n'a choisis un par un : la configuration
 * d'un dépôt ne doit rien pouvoir faire exécuter (moniteur de fichiers, hooks).
 */
export const GIT_SANS_EXECUTION: readonly string[] = [
  '--no-optional-locks',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.hooksPath=/dev/null',
]

/**
 * Seules sections admises dans le `.git/config` d'un dépôt pour que git y soit lancé.
 * Toute autre section (filter, diff, merge, include, alias…) peut désigner un programme :
 * le dépôt est alors affiché « non lu », sans lancer git.
 */
export const SECTIONS_SURES: readonly string[] = [
  'core',
  'remote',
  'branch',
  'user',
  'pull',
  'push',
  'fetch',
  'init',
  'gc',
  'lfs',
  'submodule',
  'extensions',
  'maintenance',
  'advice',
  'color',
  'status',
  'rebase',
  // Un pilote de fusion ne tourne que pendant une fusion, jamais pour lire l'état.
  'merge',
]

/** Clés qui désignent un programme, refusées même dans une section admise. */
export const CLES_REFUSEES: readonly string[] = [
  'sshcommand',
  'hookspath',
  'pager',
  'editor',
  'askpass',
  'gitproxy',
  'alternaterefscommand',
  'uploadpack',
  'receivepack',
  'vcs',
  'proxy',
  'update',
]

export const NON_LU = 'non lu : la configuration git du dépôt peut lancer un programme'

/** Clés admises seulement avec une valeur oui/non : toute autre valeur est un programme à lancer. */
export const CLES_BOOLEENNES: readonly string[] = ['fsmonitor']

export const VALEURS_BOOLEENNES: readonly string[] = ['true', 'false', 'yes', 'no', 'on', 'off', '1', '0', '']
