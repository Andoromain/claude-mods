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
