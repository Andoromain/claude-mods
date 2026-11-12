import { expect, test } from 'claude-code/testing'

import type { Module } from '../types'
import { categorie, estCache, garderPr, lireListe, lireStatut, tableauTexte, trier } from '../hooks/regles'

const module = (champs: Partial<Module>): Module => ({
  nom: 'demo',
  chemin: '/depots/demo',
  branche: 'main',
  modifs: 0,
  avance: 0,
  retard: 0,
  pr: null,
  erreur: null,
  ...champs,
})

test('lit la branche, les fichiers modifiés, avance et retard', async () => {
  const sortie = [
    '# branch.oid 1234',
    '# branch.head feat/panneau',
    '# branch.upstream origin/feat/panneau',
    '# branch.ab +2 -3',
    '1 .M N... 100644 100644 100644 aaa bbb fichier.php',
    '? nouveau.txt',
    '',
  ].join('\n')

  expect(lireStatut(sortie)).toEqual({ branche: 'feat/panneau', modifs: 2, avance: 2, retard: 3 })
})

test('une branche sans branche distante a zéro avance et zéro retard', async () => {
  expect(lireStatut('# branch.oid 1\n# branch.head main\n')).toEqual({
    branche: 'main',
    modifs: 0,
    avance: 0,
    retard: 0,
  })
})

test('range un module selon ce qui reste à faire', async () => {
  expect(categorie(module({ modifs: 1 }))).toBe('aTraiter')
  expect(categorie(module({ retard: 1 }))).toBe('aTraiter')
  expect(categorie(module({ erreur: 'illisible' }))).toBe('aTraiter')
  expect(categorie(module({ branche: 'feat/x' }))).toBe('enCours')
  expect(categorie(module({ avance: 1 }))).toBe('enCours')
  expect(categorie(module({}))).toBe('auRepos')
})

test('trie du plus urgent au plus calme, puis par nom', async () => {
  const tries = trier([
    module({ nom: 'calme' }),
    module({ nom: 'zeta', modifs: 1 }),
    module({ nom: 'travail', branche: 'feat/x' }),
    module({ nom: 'alpha', modifs: 1 }),
  ])

  expect(tries.map(un => un.nom)).toEqual(['alpha', 'zeta', 'travail', 'calme'])
})

test('lit une liste de dossiers et cache par nom ou par chemin', async () => {
  expect(lireListe(' a , /x/b/ ,, ')).toEqual(['a', '/x/b'])
  expect(lireListe(undefined)).toEqual([])
  expect(estCache('/depots/demo', ['demo'])).toBe(true)
  expect(estCache('/depots/demo', ['/depots/demo'])).toBe(true)
  expect(estCache('/depots/demo', ['autre'])).toBe(false)
})

test('une lecture sans PR garde la PR connue tant que la branche est la même', async () => {
  const pr = { numero: 7, estBrouillon: true, url: 'https://exemple.test/pr/7' }
  const avant = [module({ branche: 'feat/x', pr })]

  expect(garderPr([module({ branche: 'feat/x' })], avant)[0]?.pr).toEqual(pr)
  expect(garderPr([module({ branche: 'main' })], avant)[0]?.pr).toBe(null)
})

test('le tableau en texte reprend chaque module', async () => {
  const texte = tableauTexte([module({ nom: 'demo', branche: 'feat/x', modifs: 3 })])

  expect(texte.includes('| demo | feat/x | 3 |')).toBe(true)
  expect(tableauTexte([])).toBe('Aucun dépôt git trouvé.')
})
