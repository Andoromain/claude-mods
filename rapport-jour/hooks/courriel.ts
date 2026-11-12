import type { Rapport, Resume } from './regles'

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** Les couleurs du courriel, écrites une seule fois : sobres, lisibles dans toutes les messageries. */
const COULEURS = {
  fond: '#f3f4f6',
  carte: '#ffffff',
  entete: '#111827',
  enteteDiscret: '#9ca3af',
  enteteTexte: '#ffffff',
  accent: '#2563eb',
  texte: '#111827',
  discret: '#6b7280',
  trait: '#e5e7eb',
  resteFond: '#fffbeb',
  resteTrait: '#f59e0b',
  resteTexte: '#92400e',
} as const

const POLICE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const TABLEAU = 'role="presentation" width="100%" cellpadding="0" cellspacing="0"'
const SURTITRE = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;'

/** « 2026-11-12 » -> « jeudi 12 novembre 2026 ». */
export const dateLongue = (jour: string): string => {
  const [annee = 0, mois = 1, numero = 1] = jour.split('-').map(Number)
  const date = new Date(annee, mois - 1, numero)

  return `${JOURS[date.getDay()] ?? ''} ${numero} ${MOIS[mois - 1] ?? ''} ${annee}`.trim()
}

/** Rien de ce qui vient du journal ou du modèle n'est lu comme du HTML. */
export const echapper = (texte: string): string =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const chiffre = (valeur: string, libelle: string, estDernier: boolean): string =>
  `<td align="center" style="padding:14px 8px;${estDernier ? '' : `border-right:1px solid ${COULEURS.trait};`}">` +
  `<div style="font-size:22px;font-weight:700;color:${COULEURS.texte};line-height:1.2;">${echapper(valeur)}</div>` +
  `<div style="${SURTITRE}font-weight:400;color:${COULEURS.discret};margin-top:2px;">${echapper(libelle)}</div>` +
  '</td>'

const liste = (points: readonly string[], couleur: string): string =>
  `<table ${TABLEAU}>` +
  points
    .map(
      point =>
        '<tr>' +
        `<td valign="top" style="width:18px;padding:3px 0;color:${couleur};font-size:14px;line-height:1.5;">&#8226;</td>` +
        `<td style="padding:3px 0;font-size:14px;line-height:1.5;color:${COULEURS.texte};">${echapper(point)}</td>` +
        '</tr>',
    )
    .join('') +
  '</table>'

const titreSection = (texte: string): string =>
  `<div style="${SURTITRE}color:${COULEURS.discret};margin:0 0 10px;">${echapper(texte)}</div>`

const blocProjet = (nom: string, faits: readonly string[]): string =>
  `<table ${TABLEAU} style="margin:0 0 14px;border:1px solid ${COULEURS.trait};border-left:3px solid ${COULEURS.accent};border-radius:6px;">` +
  '<tr><td style="padding:12px 16px;">' +
  `<div style="font-size:15px;font-weight:700;color:${COULEURS.texte};margin:0 0 6px;">${echapper(nom)}</div>` +
  liste(faits, COULEURS.accent) +
  '</td></tr></table>'

const blocReste = (reste: readonly string[]): string =>
  reste.length === 0
    ? ''
    : `<table ${TABLEAU} style="margin:6px 0 0;background:${COULEURS.resteFond};border-left:3px solid ${COULEURS.resteTrait};border-radius:6px;">` +
      '<tr><td style="padding:12px 16px;">' +
      `<div style="${SURTITRE}color:${COULEURS.resteTexte};margin:0 0 6px;">Reste à faire</div>` +
      liste(reste, COULEURS.resteTrait) +
      '</td></tr></table>'

const entete = (jour: string): string =>
  `<tr><td style="background:${COULEURS.entete};padding:22px 28px;">` +
  `<div style="${SURTITRE}color:${COULEURS.enteteDiscret};">Rapport de la journée</div>` +
  `<div style="font-size:22px;font-weight:700;color:${COULEURS.enteteTexte};margin-top:4px;">${echapper(dateLongue(jour))}</div>` +
  '</td></tr>'

const chiffresCles = (resume: Resume): string =>
  `<tr><td style="border-bottom:1px solid ${COULEURS.trait};"><table ${TABLEAU}><tr>` +
  chiffre(String(resume.demandes), resume.demandes > 1 ? 'demandes' : 'demande', false) +
  chiffre(String(resume.projets), resume.projets > 1 ? 'projets' : 'projet', false) +
  chiffre(resume.plage, 'plage horaire', true) +
  '</tr></table></td></tr>'

const corps = (rapport: Rapport): string =>
  '<tr><td style="padding:24px 28px 8px;">' +
  titreSection('En bref') +
  `<div style="font-size:15px;line-height:1.6;color:${COULEURS.texte};margin:0 0 22px;">${echapper(rapport.resume)}</div>` +
  (rapport.projets.length === 0 ? '' : titreSection('Réalisé')) +
  rapport.projets.map(projet => blocProjet(projet.nom, projet.faits)).join('') +
  blocReste(rapport.reste) +
  '</td></tr>'

const pied = (): string =>
  '<tr><td style="padding:16px 28px 22px;">' +
  `<div style="border-top:1px solid ${COULEURS.trait};padding-top:12px;font-size:11px;line-height:1.5;color:${COULEURS.discret};">` +
  'Rapport établi automatiquement à partir du travail de la journée dans Claude Code.' +
  '</div></td></tr>'

/**
 * Le courriel en HTML : mise en page en tableaux et styles en ligne, la seule forme que toutes
 * les messageries affichent pareil. Aucune image, aucun lien, aucune ressource extérieure.
 */
export const htmlRapport = (jour: string, rapport: Rapport, resume: Resume): string =>
  '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
  `<body style="margin:0;padding:0;background:${COULEURS.fond};font-family:${POLICE};">` +
  `<table ${TABLEAU} style="background:${COULEURS.fond};"><tr><td align="center" style="padding:24px 12px;">` +
  `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COULEURS.carte};border-radius:10px;overflow:hidden;border:1px solid ${COULEURS.trait};">` +
  entete(jour) +
  chiffresCles(resume) +
  corps(rapport) +
  pied() +
  '</table></td></tr></table></body></html>'
