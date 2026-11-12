import type { EngineInterface } from 'claude-code'

const APPLICATION = 'Claude Code'
const DELAI_COMMANDE_MS = 5000

/** Une commande par système, essayées dans l'ordre : Linux (notify-send), puis macOS (osascript). */
const commandes = (titre: string, texte: string): readonly (readonly string[])[] => [
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
): Promise<boolean> {
  for (const argv of commandes(titre, texte)) {
    if (await lancer($, argv)) return true
  }

  return false
}
