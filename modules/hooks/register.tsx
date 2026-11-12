import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { EtatModules } from '../types'
import { COMMANDE, COMMANDE_GIT, PANNEAU, TITRE } from './config'
import { lireModule, trouverDepots } from './depots'
import { dessiner } from './panneau'
import { garderPr, lireListe, tableauTexte, trier } from './regles'

const INITIAL: EtatModules = {
  modules: [],
  racine: null,
  majA: null,
  enCours: false,
  filtre: 'actifs',
  erreur: null,
}

// Changer l'étiquette quand la forme de l'état change : elle écarte ce qu'une version d'avant a gardé.
const etat = atom({ plugin: 'modules', key: 'etat' } as const, INITIAL, { shape: 'etat-1' })

/** Une seule lecture à la fois : une demande pendant une lecture est ignorée. */
let estEnLecture = false

type Reglages = { enPlus: readonly string[]; caches: readonly string[] }

async function actualiser($: EngineInterface, reglages: Reglages, avecPr: boolean): Promise<void> {
  if (estEnLecture) return
  estEnLecture = true
  await update($, etat, (avant): EtatModules => ({ ...avant, enCours: true, erreur: null }))
  try {
    const racine = await $.session.root()
    const depots = await trouverDepots($, racine, reglages.enPlus, reglages.caches)
    const lus = await Promise.all(depots.map(chemin => lireModule($, chemin, avecPr)))
    const majA = await $.clock.now()
    await update($, etat, (avant): EtatModules => ({
      ...avant,
      modules: trier(avecPr ? lus : garderPr(lus, avant.modules)),
      racine,
      majA,
      enCours: false,
    }))
  } catch (erreur) {
    await update($, etat, (avant): EtatModules => ({
      ...avant,
      enCours: false,
      erreur: String(erreur).slice(0, 160),
    }))
  } finally {
    estEnLecture = false
  }
}

async function basculerFiltre($: EngineInterface): Promise<void> {
  await update($, etat, (avant): EtatModules => ({
    ...avant,
    filtre: avant.filtre === 'actifs' ? 'tous' : 'actifs',
  }))
}

export const register: Register = (on, options) => {
  const reglages: Reglages = {
    enPlus: lireListe(options?.dossiers_en_plus),
    caches: lireListe(options?.dossiers_caches),
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMANDE,
      description: "Ouvre le panneau d'état git de tous les modules",
    })

    return next(e)
  })

  on('command.run', { command: COMMANDE }, async $ => {
    const ouvert = await $.ui.open({ id: PANNEAU, title: TITRE })
    await actualiser($, reglages, true)

    return {
      text: ouvert.isPlaced
        ? 'Panneau « Modules » ouvert.'
        : tableauTexte((await read($, etat)).modules),
    }
  })

  // Une commande git du tour vient de finir : l'état affiché est à relire (sans les PR).
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const resultat = await next(e)
    // Rien n'est lu tant que la personne n'a pas ouvert le panneau elle-même.
    const dejaOuvert = (await read($, etat)).majA !== null
    if (dejaOuvert && COMMANDE_GIT.test(` ${e.command}`)) void actualiser($, reglages, false)

    return resultat
  })

  on('ui.render', { component: 'Pane', requestId: PANNEAU }, async ($, e) =>
    dessiner($.ui.resolve(e), await read($, etat), {
      actualiser: () => void actualiser($, reglages, true),
      basculerFiltre: () => void basculerFiltre($),
    }),
  )
}
