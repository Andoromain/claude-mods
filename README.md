# claude-mods

Mods pour Claude Code. Un dossier par mod, chacun avec son propre README.

| Mod | Ce qu'il fait |
| --- | --- |
| [alerte-attente](alerte-attente/README.md) | Notification système quand Claude attend une réponse, puis alerte sur le téléphone (ntfy) après 2 minutes sans réponse. |
| [modules](modules/README.md) | Panneau qui montre l'état git de tous les dépôts rangés à côté du projet : branche, fichiers modifiés, avance et retard, pull request. |

## Installer un mod

Dans une session Claude Code en terminal :

```
/plugin install <mod> --marketplace Andoromain/claude-mods
```

Ou depuis un shell :

```
claude plugin install <mod> --marketplace Andoromain/claude-mods
```

Remplace `<mod>` par le nom du mod, par exemple `alerte-attente`. Réponds `y` à « Add marketplace? », puis choisis la portée (« user » pour toutes tes sessions).

## Licence

MIT, voir `LICENSE`.
