import type { EngineInterface } from 'claude-code'

const DELAI_MS = 5000
const NUMERO_FENETRE = /^0x[0-9a-fA-F]+$/

/** Où en est la personne : sur la session ou ailleurs, et la fenêtre de la session si elle est connue. */
export type Presence = { estSurClaude: boolean; fenetre: string | undefined }

/**
 * Dit si la fenêtre active est celle qui héberge cette session (VS Code, terminal) :
 * 0 = oui, 1 = non, 2 = impossible à savoir ; écrit le numéro de la fenêtre de la session
 * quand il le trouve. Texte fixe, rien n'y est inséré.
 * Linux sous X11 par xprop, macOS par osascript ; sous Wayland la réponse est 2.
 * Une fenêtre appartient à la session quand son processus est un ancêtre du nôtre.
 */
const SCRIPT = [
  'anc=" "',
  'p=$$',
  'while [ "${p:-0}" -gt 1 ]; do',
  '  anc="$anc$p "',
  '  p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d \' \')',
  'done',
  'if command -v xprop >/dev/null 2>&1 && [ -n "$DISPLAY" ]; then',
  "  w=$(xprop -root _NET_ACTIVE_WINDOW 2>/dev/null | grep -oE '0x[0-9a-fA-F]+' | head -n 1)",
  '  f=""',
  '  [ -n "$w" ] && f=$(xprop -id "$w" _NET_WM_PID 2>/dev/null | grep -oE \'[0-9]+$\')',
  '  if [ -n "$f" ]; then',
  '    case "$anc" in *" $f "*) echo "$w"; exit 0 ;; esac',
  "    for c in $(xprop -root _NET_CLIENT_LIST 2>/dev/null | grep -oE '0x[0-9a-fA-F]+'); do",
  '      q=$(xprop -id "$c" _NET_WM_PID 2>/dev/null | grep -oE \'[0-9]+$\')',
  '      if [ -n "$q" ]; then case "$anc" in *" $q "*) echo "$c"; exit 1 ;; esac; fi',
  '    done',
  '    exit 1',
  '  fi',
  'fi',
  'if command -v osascript >/dev/null 2>&1; then',
  '  f=$(osascript -e \'tell application "System Events" to get unix id of first application process whose frontmost is true\' 2>/dev/null)',
  '  [ -n "$f" ] || exit 2',
  '  case "$anc" in *" $f "*) exit 0 ;; esac',
  '  exit 1',
  'fi',
  'exit 2',
].join('\n')

/**
 * Avec plusieurs fenêtres de la même application, celle où la personne a été vue en dernier
 * est la bonne : on la garde pour y ramener au clic.
 */
let derniereFenetre: string | undefined

/** Dans le doute (commande absente, trop lente), la personne est tenue pour absente : on préviendra. */
export async function lirePresence($: EngineInterface): Promise<Presence> {
  try {
    const { exitCode, stdout } = await $.process.run(['sh', '-c', SCRIPT], { timeoutMs: DELAI_MS })
    const lue = stdout.trim().split('\n')[0] ?? ''
    const fenetre = NUMERO_FENETRE.test(lue) ? lue : undefined
    if (exitCode === 0 && fenetre !== undefined) derniereFenetre = fenetre

    return { estSurClaude: exitCode === 0, fenetre: derniereFenetre ?? fenetre }
  } catch {
    return { estSurClaude: false, fenetre: derniereFenetre }
  }
}
