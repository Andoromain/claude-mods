import type { ElementTable } from 'claude-code'

import type { EtatModules, Module } from '../types'
import { LIBELLES } from './config'
import { categorie, heure, libellePr, parCategorie, type Categorie } from './regles'

export type Actions = { actualiser: () => void; basculerFiltre: () => void }

const POINT: Record<Categorie, { signe: string; couleur: 'warning' | 'success' | 'inactive' }> = {
  aTraiter: { signe: '●', couleur: 'warning' },
  enCours: { signe: '●', couleur: 'success' },
  auRepos: { signe: '○', couleur: 'inactive' },
}

/** Un chiffre clé de l'en-tête : la valeur en gras, son libellé discret dessous. */
function chiffre(
  { Box, Text }: ElementTable,
  valeur: number,
  libelle: string,
  couleur: 'text' | 'warning' | 'success' | 'merged',
) {
  return (
    <Box flexDirection="column" minWidth={8}>
      <Text size="title" weight="bold" tabular color={valeur === 0 ? 'inactive' : couleur}>
        {String(valeur)}
      </Text>
      <Text size="caption" dimColor>
        {libelle}
      </Text>
    </Box>
  )
}

/** Les compteurs d'un module : rien n'est écrit quand il n'y a rien à dire. */
function compteurs({ Box, Text }: ElementTable, module: Module) {
  return (
    <Box flexDirection="row" gap={1} flexShrink={0}>
      {module.modifs > 0 && (
        <Text color="warning" tabular>
          ±{String(module.modifs)}
        </Text>
      )}
      {module.avance > 0 && (
        <Text color="success" tabular>
          ↑{String(module.avance)}
        </Text>
      )}
      {module.retard > 0 && (
        <Text color="error" tabular>
          ↓{String(module.retard)}
        </Text>
      )}
    </Box>
  )
}

/** Un module actif : nom et compteurs sur une ligne, branche et PR dessous. */
function carte(table: ElementTable, module: Module, estIci: boolean) {
  const { Box, Text, Link } = table
  const point = POINT[categorie(module)]

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1} justifyContent="space-between">
        <Box flexDirection="row" gap={1} flexShrink={1}>
          <Text color={point.couleur}>{point.signe}</Text>
          <Text weight="semibold" wrap="truncate-end">
            {module.nom}
          </Text>
          {estIci && (
            <Text size="caption" color="claude">
              ici
            </Text>
          )}
        </Box>
        {compteurs(table, module)}
      </Box>
      <Box flexDirection="row" gap={1} paddingLeft={2}>
        {module.erreur !== null ? (
          <Text size="footnote" color="error" wrap="truncate-end">
            illisible : {module.erreur}
          </Text>
        ) : (
          <Text size="footnote" mono dimColor wrap="truncate-middle">
            {module.branche}
          </Text>
        )}
        {module.pr !== null && <Link href={module.pr.url} label={libellePr(module)} />}
      </Box>
    </Box>
  )
}

/** Un module au repos : une seule ligne discrète. */
function ligneRepos({ Box, Text }: ElementTable, module: Module, estIci: boolean) {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color="inactive">{POINT.auRepos.signe}</Text>
      <Text dimColor wrap="truncate-end">
        {module.nom}
      </Text>
      {estIci && (
        <Text size="caption" color="claude">
          ici
        </Text>
      )}
      <Text size="footnote" mono dimColor>
        {module.branche}
      </Text>
    </Box>
  )
}

function section(table: ElementTable, etat: EtatModules, voulue: Categorie) {
  const { Box, Text } = table
  const modules = parCategorie(etat.modules, voulue)
  if (modules.length === 0) return null
  const estRepos = voulue === 'auRepos'

  return (
    <Box flexDirection="column" gap={estRepos ? 0 : 1}>
      <Text size="footnote" weight="semibold" dimColor>
        {LIBELLES[voulue].toUpperCase()} · {String(modules.length)}
      </Text>
      {modules.map(module =>
        estRepos
          ? ligneRepos(table, module, module.chemin === etat.racine)
          : carte(table, module, module.chemin === etat.racine),
      )}
    </Box>
  )
}

function pied({ Text }: ElementTable, etat: EtatModules) {
  if (etat.erreur !== null) return <Text color="error">Lecture impossible : {etat.erreur}</Text>
  if (etat.enCours) return <Text dimColor>Lecture des dépôts…</Text>
  if (etat.majA === null) return <Text dimColor>Pas encore lu.</Text>

  return (
    <Text size="caption" dimColor>
      Lu à {heure(etat.majA)}
    </Text>
  )
}

/** Le panneau entier : chiffres clés, actions, puis les modules du plus urgent au plus calme. */
export function dessiner(table: ElementTable, etat: EtatModules, actions: Actions) {
  const { Box, Text, Button } = table
  const repos = parCategorie(etat.modules, 'auRepos').length
  const prs = etat.modules.filter(module => module.pr !== null).length
  const estVide = etat.modules.length === 0 && !etat.enCours && etat.majA !== null

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" gap={2}>
        {chiffre(table, etat.modules.length, 'modules', 'text')}
        {chiffre(table, parCategorie(etat.modules, 'aTraiter').length, 'à traiter', 'warning')}
        {chiffre(table, parCategorie(etat.modules, 'enCours').length, 'en cours', 'success')}
        {chiffre(table, prs, 'PR ouvertes', 'merged')}
      </Box>
      <Box flexDirection="row" gap={1}>
        <Button key="actualiser" variant="primary" hotkey="r" onPress={actions.actualiser}>
          Actualiser
        </Button>
        {repos > 0 && (
          <Button key="filtre" hotkey="t" onPress={actions.basculerFiltre}>
            {etat.filtre === 'actifs' ? `Tout afficher (${repos} au repos)` : 'Actifs seulement'}
          </Button>
        )}
      </Box>
      {estVide && <Text dimColor>Aucun dépôt git trouvé à côté de ce projet.</Text>}
      {section(table, etat, 'aTraiter')}
      {section(table, etat, 'enCours')}
      {etat.filtre === 'tous' && section(table, etat, 'auRepos')}
      {pied(table, etat)}
    </Box>
  )
}
