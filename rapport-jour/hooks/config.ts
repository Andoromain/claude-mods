export const COMMANDE = 'rapport'
/** Mot à ajouter à la commande pour envoyer aussi le rapport par e-mail. */
export const MOT_ENVOI = 'mail'

export const HEURE_PAR_DEFAUT = '17:30'
export const PERIODE_VERIFICATION_MS = 60_000
/** Les journaux plus vieux sont effacés. */
export const JOURS_GARDES = 14

export const PREFIXE_JOURNAL = 'journal:'
export const PREFIXE_ENVOYE = 'envoye:'

/** Ce qui est gardé de chaque tour : assez pour résumer, pas la conversation entière. */
export const LONGUEUR_DEMANDE = 300
export const LONGUEUR_REPONSE = 500
export const ENTREES_MAX_PAR_SESSION = 200
export const ENTREES_MAX_PAR_RAPPORT = 150

export const MODELE = 'haiku'
export const JETONS_MAX = 900
export const DELAI_REDACTION_MS = 60_000

export const CONSIGNE = [
  'Tu rédiges le rapport de fin de journée d\'un développeur, en français.',
  'Lecteur : un chef de projet, pas forcément développeur.',
  'À partir du journal ci-dessous, et de lui seul, écris :',
  '- une phrase de résumé de la journée ;',
  '- puis, par projet, une liste courte de ce qui a été fait ;',
  '- puis « Reste à faire » si le journal le montre, sinon rien.',
  'Phrases courtes, pas de jargon, pas de titre, pas de tableau. N\'invente rien.',
].join('\n')

export const SERVEUR_PAR_DEFAUT = 'smtp.gmail.com'
export const DELAI_ENVOI_MS = 60_000

/**
 * L'envoi passe par python3, présent sur Linux et macOS : le mot de passe lui arrive par
 * l'entrée standard, jamais sur la ligne de commande où les autres programmes le liraient.
 * Connexion chiffrée de bout en bout (SMTP sur TLS, port 465, certificat vérifié).
 */
export const SCRIPT_ENVOI = [
  'import json, smtplib, ssl, sys',
  'from email.message import EmailMessage',
  'd = json.load(sys.stdin)',
  'm = EmailMessage()',
  "m['From'] = d['de']",
  "m['To'] = d['a']",
  "m['Subject'] = d['sujet']",
  "m.set_content(d['texte'])",
  "with smtplib.SMTP_SSL(d['serveur'], 465, context=ssl.create_default_context(), timeout=30) as s:",
  "    s.login(d['de'], d['mdp'])",
  '    s.send_message(m)',
].join('\n')
