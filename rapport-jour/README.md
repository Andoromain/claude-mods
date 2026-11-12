# rapport-jour

Mod pour Claude Code : le rapport de ce que tu as fait dans la journée, envoyé par e-mail à l'heure que tu choisis, ou affiché quand tu le demandes.

- Pendant la journée, le mod note chaque demande faite à Claude et le début de sa réponse, avec l'heure et le projet.
- À l'heure réglée, il fait rédiger un rapport court (résumé, ce qui a été fait par projet, ce qui reste) et l'envoie par e-mail.
- `/rapport` affiche le rapport du jour à tout moment. `/rapport mail` l'envoie aussi par e-mail tout de suite.

## Installation

Dans une session Claude Code en terminal :

```
/plugin install rapport-jour --marketplace Andoromain/claude-mods
```

Ou depuis un shell :

```
claude plugin install rapport-jour --marketplace Andoromain/claude-mods
```

## Créer le mot de passe d'application (Gmail)

Le mod n'utilise jamais ton mot de passe habituel, mais un mot de passe réservé à cet usage, que tu peux révoquer quand tu veux.

1. Compte Google > **Sécurité** : active la **validation en deux étapes** si ce n'est pas fait.
2. Ouvre `https://myaccount.google.com/apppasswords`.
3. Donne un nom (par exemple « rapport Claude Code ») puis **Créer**.
4. Copie les 16 caractères affichés.

Avec une autre messagerie : crée de même un mot de passe d'application et indique son serveur SMTP (port 465).

## Réglages

Avec `/plugin configure rapport-jour`, dans une session Claude Code en terminal (la commande n'existe pas dans l'extension VS Code) :

- **Heure d'envoi** : au format `HH:MM` sur 24 heures. Par défaut `17:30`.
- **Adresse d'envoi** : ton adresse e-mail.
- **Mot de passe d'application** : les 16 caractères copiés ci-dessus. Gardé dans le stockage protégé de Claude Code, pas dans un fichier du projet.
- **Destinataire** : qui reçoit le rapport. Vide = toi-même.
- **Serveur d'envoi** : `smtp.gmail.com` par défaut.

Sans adresse ni mot de passe, rien n'est envoyé et `/rapport` continue de marcher.

## À savoir

- L'envoi part d'une session Claude Code : il faut une session ouverte à l'heure réglée. Sinon le rapport part à l'ouverture de la session suivante, même le lendemain.
- Plusieurs sessions ouvertes : un seul rapport, qui les regroupe toutes.
- Le rapport couvre ce qui est passé par Claude Code, pas le reste de ta journée.
- Le rapport contient des extraits de tes demandes et des réponses : il part par ta messagerie vers le destinataire réglé. Le journal reste sur ton poste, dans le stockage du mod, et s'efface au bout de 14 jours.
- L'envoi utilise `python3`, présent sur Linux et macOS. La connexion au serveur est chiffrée.
- La rédaction utilise le modèle `haiku`. S'il ne répond pas, le rapport est la liste brute des demandes.

## Licence

MIT, voir le fichier `LICENSE` à la racine du dépôt.
