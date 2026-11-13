export const COMMANDE = 'rapport'
/** Nom du mod : la clé de ses réglages dans settings.json est `<nom>@<catalogue>`. */
export const COMMANDE_MOD = 'rapport-jour'
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
/** Assez pour un JSON complet sur une journée chargée : coupé, il est illisible. */
export const JETONS_MAX = 4000
export const DELAI_REDACTION_MS = 120_000

/** Le modèle répond en JSON : le mod met en page lui-même, pareil dans la conversation et dans le courriel. */
export const CONSIGNE = [
  "Tu rédiges le rapport de fin de journée d'un développeur, en français.",
  'Lecteur : un chef de projet, pas forcément développeur.',
  "À partir du journal ci-dessous, et de lui seul, réponds par un objet JSON et rien d'autre, de cette forme :",
  '{"resume": "une ou deux phrases sur la journée",',
  ' "projets": [{"nom": "nom du projet", "faits": ["ce qui a été fait"]}],',
  ' "reste": ["ce qui reste à faire"]}',
  'Règles : phrases courtes, pas de jargon, 2 à 6 faits par projet, « reste » vide si le journal ne montre rien.',
  "N'invente rien. Aucun texte avant ni après le JSON, pas de bloc de code.",
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
  "m.add_alternative(d['html'], subtype='html')",
  "with smtplib.SMTP_SSL(d['serveur'], 465, context=ssl.create_default_context(), timeout=30) as s:",
  "    s.login(d['de'], d['mdp'])",
  '    s.send_message(m)',
].join('\n')
