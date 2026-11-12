# modules

Mod pour Claude Code : un panneau qui montre, d'un coup d'œil, l'état git de tous tes dépôts rangés côte à côte.

Pour chaque dépôt : la branche, le nombre de fichiers modifiés (`±`), les commits à pousser (`↑`), les commits à récupérer (`↓`) et la pull request ouverte, avec son lien.

Les dépôts sont rangés du plus urgent au plus calme :

- **À traiter** : des fichiers modifiés, du retard sur la branche distante, ou un dépôt illisible.
- **En cours** : une branche de travail propre, des commits à pousser, ou une pull request ouverte.
- **Au repos** : sur `main` ou `master`, rien à faire. Cachés par défaut, un bouton les affiche.

Le mod lit seulement : il ne fait ni commit, ni push, ni changement de branche.

## Installation

Dans une session Claude Code en terminal :

```
/plugin install modules --marketplace Andoromain/claude-mods
```

Ou depuis un shell :

```
claude plugin install modules --marketplace Andoromain/claude-mods
```

## Utilisation

Tape `/modules` : le panneau s'ouvre et lit les dépôts, pull requests comprises. Là où le panneau ne peut pas s'afficher, la commande répond avec le même contenu en tableau.

- **Actualiser** (touche `r`) relit tout, pull requests comprises.
- **Tout afficher** (touche `t`) montre aussi les dépôts au repos.
- Une fois le panneau ouvert, il se relit tout seul après chaque commande `git` ou `gh` lancée par Claude, sans interroger GitHub.

## Quels dépôts sont affichés

Le mod regarde le dossier parent de ton projet et affiche chaque sous-dossier qui est un dépôt git. Exemple : une session dans `/code/app` affiche tous les dépôts de `/code/`.

Deux réglages, dans `/config` :

- **Dossiers en plus** : chemins absolus de dépôts rangés ailleurs, séparés par des virgules.
- **Dossiers à cacher** : noms de dossiers ou chemins absolus à ne pas afficher, séparés par des virgules.

## À savoir

- Rien n'est lu avant ton premier `/modules`. Ensuite seulement, le panneau se relit après les commandes git.
- Sécurité : avant de lancer git dans un dépôt, le mod lit son `.git/config`. S'il contient une section ou une clé qui peut désigner un programme (`filter`, `diff`, `include`, `alias`, `core.fsmonitor`, `core.sshCommand`…), le dépôt est affiché « non lu » et git n'y est pas lancé. Un dépôt qui a des arbres de travail liés (`git worktree`) ou une configuration par arbre est aussi affiché « non lu ». Les sous-modules ne sont pas parcourus.
- Les pull requests sont lues avec `gh`, qui doit être installé et connecté. Sans lui, la colonne reste vide.
- Lire les pull requests fait un appel à GitHub par dépôt sur une branche de travail : quelques secondes avec beaucoup de dépôts.
- Les branches de repos sont `main` et `master` ; la liste se change dans `hooks/config.ts`.

## Licence

MIT, voir le fichier `LICENSE` à la racine du dépôt.
