import { ClientCodification } from '../types';

export const INITIAL_CLIENT_CODIFICATIONS: ClientCodification[] = [
  {
    id: 'CRISTAL-ORAN',
    code: 'CRISTAL-ORAN',
    nom: 'CRISTAL Oran',
    prefixeCommande: 'O-',
    prefixeRepereSpecial: '', // Déduit 'O' + 1ère lettre client
    type: 'CRISTAL',
    badgeColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 border-purple-500/30',
    description: 'Showroom Particuliers & Habitat (Oran)',
    actif: true,
    ordre: 1
  },
  {
    id: 'SOMODAL-ORAN',
    code: 'SOMODAL-ORAN',
    nom: 'SOMODAL Oran',
    prefixeCommande: 'SO-',
    prefixeRepereSpecial: '', // Déduit 'SO' + 1ère lettre client
    type: 'SOMADAL',
    badgeColor: 'text-sky-300',
    badgeBg: 'bg-sky-500/20 border-sky-500/30',
    description: 'Client Pro / Menuisiers & Promoteurs (Oran)',
    actif: true,
    ordre: 2
  },
  {
    id: 'CRISTAL-ALGER',
    code: 'CRISTAL-ALGER',
    nom: 'CRISTAL Alger',
    prefixeCommande: 'A-',
    prefixeRepereSpecial: 'C', // Repère spécial: C + 1ère lettre client (ex: CF1)
    type: 'CRISTAL',
    badgeColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 border-purple-500/30',
    description: 'Showroom Particuliers & Habitat (Alger)',
    actif: true,
    ordre: 3
  },
  {
    id: 'SOMODAL-ALGER',
    code: 'SOMODAL-ALGER',
    nom: 'SOMODAL Alger',
    prefixeCommande: 'SA-',
    prefixeRepereSpecial: '', // Déduit 'SA' + 1ère lettre client (ex: SAF1)
    type: 'SOMADAL',
    badgeColor: 'text-sky-300',
    badgeBg: 'bg-sky-500/20 border-sky-500/30',
    description: 'Client Pro / Menuisiers & Promoteurs (Alger)',
    actif: true,
    ordre: 4
  },
  {
    id: 'CRISTAL-CONST',
    code: 'CRISTAL-CONST',
    nom: 'CRISTAL Constantine',
    prefixeCommande: 'D-',
    prefixeRepereSpecial: 'D', // Repère spécial: D + 1ère lettre client (ex: DF1)
    type: 'CRISTAL',
    badgeColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 border-purple-500/30',
    description: 'Showroom Particuliers & Habitat (Constantine)',
    actif: true,
    ordre: 5
  },
  {
    id: 'SOMODAL-CONST',
    code: 'SOMODAL-CONST',
    nom: 'SOMODAL Constantine',
    prefixeCommande: 'SC-',
    prefixeRepereSpecial: '', // Déduit 'SC' + 1ère lettre client
    type: 'SOMADAL',
    badgeColor: 'text-sky-300',
    badgeBg: 'bg-sky-500/20 border-sky-500/30',
    description: 'Client Pro / Menuisiers & Promoteurs (Constantine)',
    actif: true,
    ordre: 6
  },
  {
    id: 'ATELIER-ORAN',
    code: 'ATELIER-ORAN',
    nom: 'ATELIER Oran',
    prefixeCommande: 'AO-',
    prefixeRepereSpecial: '', // Déduit 'AO' + 1ère lettre client
    type: 'ATELIER',
    badgeColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 border-amber-500/30',
    description: 'Sous-traitance & Fabrication Atelier Oran',
    actif: true,
    ordre: 7
  },
  {
    id: 'ATELIER-CONST',
    code: 'ATELIER-CONST',
    nom: 'ATELIER Constantine',
    prefixeCommande: 'Y-',
    prefixeRepereSpecial: '', // Déduit 'Y' + 1ère lettre client
    type: 'ATELIER',
    badgeColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 border-amber-500/30',
    description: 'Sous-traitance & Fabrication Atelier Constantine',
    actif: true,
    ordre: 8
  },
  {
    id: 'CLIENT-DIRECT',
    code: 'CLIENT-DIRECT',
    nom: 'Client Direct / Menuisier Partenaire',
    prefixeCommande: 'CMD-',
    prefixeRepereSpecial: '',
    type: 'AUTRE',
    badgeColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/30',
    description: 'Commande directe atelier',
    actif: true,
    ordre: 9
  }
];
