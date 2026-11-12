export type PullRequest = { numero: number; estBrouillon: boolean; url: string }

export type Module = {
  nom: string
  chemin: string
  branche: string
  /** Fichiers modifiés, ajoutés ou non suivis, pas encore commités. */
  modifs: number
  /** Commits locaux pas encore poussés. */
  avance: number
  /** Commits distants pas encore récupérés. */
  retard: number
  pr: PullRequest | null
  /** Pourquoi le dépôt n'a pas pu être lu, sinon null. */
  erreur: string | null
}

export type Filtre = 'actifs' | 'tous'

export type EtatModules = {
  modules: Module[]
  /** Le dépôt de la session, mis en avant dans la liste. */
  racine: string | null
  /** Heure de la dernière lecture, en millisecondes ; null avant la première. */
  majA: number | null
  enCours: boolean
  filtre: Filtre
  erreur: string | null
}

declare module 'claude-code' {
  interface PluginState {
    modules: { etat: Shaped<EtatModules> }
  }
}
