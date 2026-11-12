import { expect, test } from 'claude-code/testing'

const PANNEAU = {
  plugin: 'modules',
  component: 'Pane',
  requestId: 'modules',
  props: {
    title: 'Modules',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const ETAT = {
  modules: [
    { nom: 'facturation', chemin: '/depots/facturation', branche: 'feat/export', modifs: 3, avance: 1, retard: 0, pr: null, erreur: null },
    { nom: 'portail', chemin: '/depots/portail', branche: 'main', modifs: 0, avance: 0, retard: 0, pr: null, erreur: null },
  ],
  racine: '/depots/facturation',
  majA: 0,
  enCours: false,
  filtre: 'actifs',
  erreur: null,
}

test('le panneau montre un module à traiter, sur chaque surface', async ($, on) => {
  on('state.get', () => ({ value: { value: { shape: 'etat-1', value: ETAT }, version: 1 } }))

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANNEAU, surface })

    expect((await ui.find({ type: 'Text', text: /facturation/ }))?.text).toBe('facturation')
    expect((await ui.find({ type: 'Text', text: /feat\/export/ }))?.text).toBe('feat/export')
    // Le module au repos reste caché tant que le filtre est « actifs ».
    expect(await ui.find({ type: 'Text', text: /portail/ })).toBe(undefined)
    await ui.unmount()
  }
})

test('sans rien de lu, le panneau le dit', async $ => {
  const ui = await $.ui.mount({ ...PANNEAU, surface: 'vscode' })

  expect((await ui.find({ type: 'Text', text: /Pas encore lu/ }))?.text).toBe('Pas encore lu.')
  await ui.unmount()
})
