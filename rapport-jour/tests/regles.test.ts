import { expect, test } from 'claude-code/testing'

import {
  couper,
  estDu,
  jourDeCle,
  jourLisible,
  joursAEnvoyer,
  lireEntrees,
  lireCourrier,
  lireHeure,
  lireRapport,
  messageMail,
  rapportBrut,
  rapportDepuisJournal,
  resumeJournal,
  texteRapport,
} from '../hooks/regles'
import { dateLongue, echapper, htmlRapport } from '../hooks/courriel'

test("lit une heure valide, sinon l'heure par défaut", async () => {
  expect(lireHeure('8:05')).toBe('08:05')
  expect(lireHeure(' 17:30 ')).toBe('17:30')
  expect(lireHeure('25:00')).toBe('17:30')
  expect(lireHeure('midi')).toBe('17:30')
  expect(lireHeure(undefined)).toBe('17:30')
})

test("l'envoi n'est réglé qu'avec une adresse valide et un mot de passe", async () => {
  const complet = { email_expediteur: 'moi@exemple.test', mot_de_passe_application: ' secret ' }

  expect(lireCourrier(complet)).toEqual({
    de: 'moi@exemple.test',
    a: 'moi@exemple.test',
    mdp: 'secret',
    serveur: 'smtp.gmail.com',
  })
  expect(lireCourrier({ ...complet, email_destinataire: 'chef@exemple.test' })?.a).toBe('chef@exemple.test')
  expect(lireCourrier({ ...complet, mot_de_passe_application: '' })).toBe(undefined)
  expect(lireCourrier({ ...complet, email_expediteur: 'pas une adresse' })).toBe(undefined)
  expect(lireCourrier({ ...complet, email_destinataire: 'a@b.test\nBcc: x@y.test' })).toBe(undefined)
  expect(lireCourrier({ ...complet, serveur_smtp: 'smtp.exemple.test/../x' })).toBe(undefined)
  expect(lireCourrier(undefined)).toBe(undefined)
})

test('trouve les jours qui ont un journal et pas de rapport envoyé', async () => {
  const cles = [
    'journal:2026-01-03:s1',
    'journal:2026-01-02:s1',
    'journal:2026-01-02:s2',
    'journal:2026-01-01:s1',
    'envoye:2026-01-01',
    'autre:cle',
  ]

  expect(joursAEnvoyer(cles)).toEqual(['2026-01-02', '2026-01-03'])
  expect(jourDeCle('envoye:2026-01-01')).toBe('2026-01-01')
  expect(jourDeCle('autre:cle')).toBe(undefined)
})

test("un jour passé est dû tout de suite, le jour même à partir de l'heure réglée", async () => {
  expect(estDu('2026-01-01', '2026-01-02', '08:00', '17:30')).toBe(true)
  expect(estDu('2026-01-02', '2026-01-02', '17:29', '17:30')).toBe(false)
  expect(estDu('2026-01-02', '2026-01-02', '17:30', '17:30')).toBe(true)
  expect(estDu('2026-01-03', '2026-01-02', '23:59', '17:30')).toBe(false)
})

test('écarte ce qui ne ressemble pas à une entrée', async () => {
  const bonne = { heure: '09:00', depot: 'demo', demande: 'ajouter un bouton', reponse: 'fait' }

  expect(lireEntrees([bonne, { heure: 9 }, null, 'texte'])).toEqual([bonne])
  expect(lireEntrees(undefined)).toEqual([])
})

test('le rapport brut liste les demandes dans l\'ordre des heures', async () => {
  const brut = rapportBrut([
    { heure: '14:00', depot: 'b', demande: 'seconde', reponse: '' },
    { heure: '09:00', depot: 'a', demande: 'première', reponse: '' },
  ])

  expect(brut).toBe('- 09:00 [a] première\n- 14:00 [b] seconde')
  expect(rapportBrut([])).toBe('Rien de noté ce jour-là.')
})

test('coupe un texte long et écrit la date à la française', async () => {
  expect(couper('  un   texte \n long ', 8)).toBe('un text…')
  expect(jourLisible('2026-01-02')).toBe('02/01/2026')
})

test("le message porte le sujet, le texte et les réglages d'envoi", async () => {
  const courrier = { de: 'moi@exemple.test', a: 'chef@exemple.test', mdp: 'secret', serveur: 'smtp.exemple.test' }
  const message = JSON.parse(messageMail(courrier, '2026-01-02', '**Projet**\nJournée calme.', '<p>mis en page</p>'))

  expect(message.sujet).toBe('Rapport du 02/01/2026')
  // Le texte seul part sans les marques de gras de la conversation.
  expect(message.texte).toBe('Projet\nJournée calme.')
  expect(message.html).toBe('<p>mis en page</p>')
  expect(message.a).toBe('chef@exemple.test')
})

const ENTREES = [
  { heure: '14:00', depot: 'portail', demande: 'corriger le menu', reponse: 'fait' },
  { heure: '09:00', depot: 'facturation', demande: 'ajouter un export', reponse: 'fait' },
  { heure: '10:30', depot: 'facturation', demande: 'tester', reponse: 'ok' },
]

test('lit le JSON du modèle, même entouré de texte, et écarte le reste', async () => {
  const reponse =
    'Voici : {"resume": " Bonne journée. ", "projets": [{"nom": "facturation", "faits": ["export ajouté", ""]}, {"nom": "vide", "faits": []}], "reste": ["tester"]} fin'

  expect(lireRapport(reponse)).toEqual({
    resume: 'Bonne journée.',
    projets: [{ nom: 'facturation', faits: ['export ajouté'] }],
    reste: ['tester'],
  })
  expect(lireRapport('pas du JSON')).toBe(undefined)
  expect(lireRapport('{"resume": ""}')).toBe(undefined)
  expect(lireRapport('{"resume": "coupé", "projets": [')).toBe(undefined)
})

test('sans rédaction, le rapport range les demandes par projet', async () => {
  const rapport = rapportDepuisJournal(ENTREES)

  expect(rapport.projets.map(projet => projet.nom)).toEqual(['facturation', 'portail'])
  expect(rapport.projets[0]?.faits).toEqual(['09:00 — ajouter un export', '10:30 — tester'])
  expect(rapportDepuisJournal([]).resume).toBe('Rien de noté ce jour-là.')
})

test('les chiffres clés viennent du journal', async () => {
  expect(resumeJournal(ENTREES)).toEqual({ demandes: 3, projets: 2, plage: '09:00 – 14:00' })
  expect(resumeJournal([])).toEqual({ demandes: 0, projets: 0, plage: '—' })
})

test('le rapport en texte suit résumé, projets, reste', async () => {
  const texte = texteRapport({
    resume: 'Bonne journée.',
    projets: [{ nom: 'facturation', faits: ['export ajouté'] }],
    reste: ['tester'],
  })

  expect(texte).toBe('Bonne journée.\n\n**facturation**\n- export ajouté\n\n**Reste à faire**\n- tester')
})

test('le courriel met en page le rapport et neutralise le HTML du contenu', async () => {
  const html = htmlRapport(
    '2026-01-02',
    { resume: 'Bonne <b>journée</b>.', projets: [{ nom: 'facturation', faits: ['export & tri'] }], reste: [] },
    { demandes: 3, projets: 1, plage: '09:00 – 14:00' },
  )

  expect(dateLongue('2026-01-02')).toBe('vendredi 2 janvier 2026')
  expect(html.includes('vendredi 2 janvier 2026')).toBe(true)
  expect(html.includes('Bonne &lt;b&gt;journée&lt;/b&gt;.')).toBe(true)
  expect(html.includes('export &amp; tri')).toBe(true)
  expect(html.includes('Reste à faire')).toBe(false)
  expect(echapper(`"a" < 'b'`)).toBe('&quot;a&quot; &lt; &#39;b&#39;')
})
