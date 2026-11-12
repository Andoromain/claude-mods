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
  messageMail,
  rapportBrut,
} from '../hooks/regles'

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
  const message = JSON.parse(messageMail(courrier, '2026-01-02', 'Journée calme.'))

  expect(message.sujet).toBe('Rapport du 02/01/2026')
  expect(message.texte).toBe('Journée calme.')
  expect(message.a).toBe('chef@exemple.test')
})
