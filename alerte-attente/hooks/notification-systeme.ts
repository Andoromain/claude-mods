import type { EngineInterface } from 'claude-code'

import { SCRIPT_CLIQUABLE } from './notification-cliquable'

const APPLICATION = 'Claude Code'
const DELAI_COMMANDE_MS = 5000

const DUREE_AFFICHAGE_MS = 10_000

/**
 * Une commande par système, essayées dans l'ordre jusqu'à la première qui réussit :
 * Linux par le service de notifications lui-même (gdbus), Linux par notify-send, puis macOS.
 * gdbus passe en premier : lancé depuis une application snap (VS Code), notify-send passe par
 * le portail, répond 0 et n'affiche rien.
 */
const commandes = (
  titre: string,
  texte: string,
  fenetre: string | undefined,
): readonly (readonly string[])[] => [
  // D'abord la notification cliquable, quand la fenêtre où revenir est connue.
  ...(fenetre === undefined ? [] : [['python3', '-I', '-c', SCRIPT_CLIQUABLE, titre, texte, fenetre]]),
  [
    'gdbus',
    'call',
    '--session',
    '--dest',
    'org.freedesktop.Notifications',
    '--object-path',
    '/org/freedesktop/Notifications',
    '--method',
    'org.freedesktop.Notifications.Notify',
    APPLICATION,
    '0',
    'dialog-information',
    titre,
    texte,
    '[]',
    "{'urgency': <byte 2>}",
    String(DUREE_AFFICHAGE_MS),
  ],
  ['notify-send', '--urgency=critical', `--app-name=${APPLICATION}`, titre, texte],
  [
    'osascript',
    '-e',
    `display notification ${JSON.stringify(texte)} with title ${JSON.stringify(titre)}`,
  ],
]

async function lancer($: EngineInterface, argv: readonly string[]): Promise<boolean> {
  try {
    const { exitCode } = await $.process.run(argv, { timeoutMs: DELAI_COMMANDE_MS })

    return exitCode === 0
  } catch {
    // Commande absente sur ce système : on essaie la suivante.
    return false
  }
}

/** Affiche une notification du système d'exploitation ; false quand aucune commande n'a pu l'afficher. */
export async function notifierSysteme(
  $: EngineInterface,
  titre: string,
  texte: string,
  fenetre: string | undefined,
): Promise<boolean> {
  for (const argv of commandes(titre, texte, fenetre)) {
    if (await lancer($, argv)) return true
  }

  return false
}
