# alerte-attente

Mod pour Claude Code : il te prévient quand Claude attend ta réponse.

- Claude demande une autorisation, pose une question ou termine son tour : notification du système sur le poste (Linux avec `notify-send`, macOS).
- Sans réponse au bout de 2 minutes : alerte sur ton téléphone, par l'application gratuite [ntfy](https://ntfy.sh), et nouvelle notification sur le poste.
- Tu réponds avant : rien n'est envoyé.

Le texte envoyé sur le téléphone est toujours générique (« Claude attend une autorisation. »). Rien de ton projet ne part vers ntfy.

## Installation

Dans une session Claude Code en terminal :

```
/plugin install alerte-attente --marketplace Andoromain/claude-mods
```

Ou depuis un shell :

```
claude plugin install alerte-attente --marketplace Andoromain/claude-mods
```

Réponds `y` à « Add marketplace? », puis choisis la portée (« user » pour toutes tes sessions).

## Réglage : ton sujet ntfy

Chaque personne utilise son propre sujet. Qui connaît un sujet reçoit ses alertes : choisis un nom long et difficile à deviner, par exemple `claude-alerte-` suivi d'une vingtaine de lettres et chiffres au hasard.

1. Installe l'application **ntfy** sur ton téléphone (Android ou iPhone). Aucun compte à créer.
2. Dans l'application : bouton **+**, saisis ton sujet, laisse le serveur par défaut, puis **S'abonner**. Autorise les notifications.
3. Sur Android : Paramètres > Applications > ntfy > Batterie > **Sans restriction**, sinon les alertes arrivent en retard.
4. Dans Claude Code, saisis le même sujet dans le réglage « Sujet ntfy » du mod (demandé à l'installation, modifiable ensuite dans `/config`).

Le sujet accepte les lettres, les chiffres, le tiret et le souligné, 64 caractères au plus.

## Quand la notification du poste s'affiche

- Seulement si tu travailles dans une autre fenêtre. Si la fenêtre active est celle de ta session Claude Code (VS Code ou terminal), rien ne s'affiche : tu vois déjà la question.
- Juste après l'affichage de la question, pas avant. Une réponse donnée tout de suite n'affiche rien.
- Si tu quittes la fenêtre plus tard, pendant que la question attend toujours, la notification s'affiche à ce moment-là (vérifié toutes les 3 secondes), une seule fois.
- La fenêtre active se lit sous Linux X11 (`xprop`) et macOS. Sous Wayland elle ne se lit pas : la notification s'affiche toujours.
- Un clic sur la notification ramène la fenêtre de ta session au premier plan (Linux sous X11, avec `python3` et PyGObject, présents sur Ubuntu). Ailleurs, la notification s'affiche sans cet effet.
- L'alerte sur le téléphone après 2 minutes ne change pas : elle part dans tous les cas.

## Vérifier

Tape `/alerte` dans Claude Code : une notification s'affiche sur le poste et ton téléphone sonne en quelques secondes. La commande dit ce qui est parti.

## À savoir

- L'alerte part de la session Claude Code : ordinateur éteint ou session fermée, pas d'alerte.
- Plusieurs sessions ouvertes : chacune envoie sa propre alerte, avec le même texte.
- Le délai et les textes se changent dans `hooks/config.ts`.

## Licence

MIT, voir le fichier `LICENSE` à la racine du dépôt.
