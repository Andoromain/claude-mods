import type { EngineInterface } from 'claude-code'

const DELAI_MS = 5000

/**
 * Dit si la fenêtre active est celle qui héberge cette session (VS Code, terminal) :
 * 0 = oui, 1 = non, 2 = impossible à savoir. Texte fixe, rien n'y est inséré.
 * Linux sous X11 par xprop, macOS par osascript ; sous Wayland la réponse est 2.
 * La fenêtre active appartient à la session quand son processus est un ancêtre du nôtre.
 */
const SCRIPT = [
  'f=""',
  'if command -v xprop >/dev/null 2>&1 && [ -n "$DISPLAY" ]; then',
  "  w=$(xprop -root _NET_ACTIVE_WINDOW 2>/dev/null | grep -oE '0x[0-9a-fA-F]+' | head -n 1)",
  '  [ -n "$w" ] && f=$(xprop -id "$w" _NET_WM_PID 2>/dev/null | grep -oE \'[0-9]+$\')',
  'fi',
  'if [ -z "$f" ] && command -v osascript >/dev/null 2>&1; then',
  '  f=$(osascript -e \'tell application "System Events" to get unix id of first application process whose frontmost is true\' 2>/dev/null)',
  'fi',
  '[ -n "$f" ] || exit 2',
  'p=$$',
  'while [ "${p:-0}" -gt 1 ]; do',
  '  [ "$p" = "$f" ] && exit 0',
  '  p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d \' \')',
  'done',
  'exit 1',
].join('\n')

/** Vrai seulement quand il est établi que la personne a cette session sous les yeux ; dans le doute, faux. */
export async function estSurClaude($: EngineInterface): Promise<boolean> {
  try {
    const { exitCode } = await $.process.run(['sh', '-c', SCRIPT], { timeoutMs: DELAI_MS })

    return exitCode === 0
  } catch {
    // Pas de shell ou commande trop lente : on ne sait pas, donc on préviendra.
    return false
  }
}
