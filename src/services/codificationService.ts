import { ClientCodification, DossierCommandeGlobal, CommandeCaisson } from '../types';
import { INITIAL_CLIENT_CODIFICATIONS } from '../data/initialCodifications';

export interface InfoAgence {
  code: string;
  nom: string;
  type: 'SOMADAL' | 'CRISTAL' | 'ATELIER' | 'AUTRE';
  badgeColor: string;
  badgeBg: string;
  description: string;
}

export function detecterAgence(
  refCommande: string,
  codifications: ClientCodification[] = INITIAL_CLIENT_CODIFICATIONS
): InfoAgence {
  const ref = (refCommande || '').trim().toUpperCase();

  // Recherche par préfixe dans la liste dynamique
  const sorted = [...codifications].sort((a, b) => (b.prefixeCommande?.length || 0) - (a.prefixeCommande?.length || 0));
  for (const c of sorted) {
    const p1 = (c.prefixeCommande || '').toUpperCase();
    const p2 = p1.replace('-', '');
    if ((p1 && ref.startsWith(p1)) || (p2 && ref.startsWith(p2))) {
      return {
        code: c.code,
        nom: c.nom,
        type: c.type,
        badgeColor: c.badgeColor || 'text-sky-300',
        badgeBg: c.badgeBg || 'bg-sky-500/20 border-sky-500/30',
        description: c.description || c.nom
      };
    }
  }

  // Fallbacks classiques si besoin
  if (ref.startsWith('S-A') || ref.startsWith('SA')) {
    return { code: 'SOMADAL-ALGER', nom: 'SOMADAL Alger', type: 'SOMADAL', badgeColor: 'text-sky-300', badgeBg: 'bg-sky-500/20 border-sky-500/30', description: 'Client Pro (Alger)' };
  }
  if (ref.startsWith('S-O') || ref.startsWith('SO')) {
    return { code: 'SOMADAL-ORAN', nom: 'SOMADAL Oran', type: 'SOMADAL', badgeColor: 'text-sky-300', badgeBg: 'bg-sky-500/20 border-sky-500/30', description: 'Client Pro (Oran)' };
  }
  if (ref.startsWith('S-C') || ref.startsWith('SC')) {
    return { code: 'SOMADAL-CONST', nom: 'SOMADAL Constantine', type: 'SOMADAL', badgeColor: 'text-sky-300', badgeBg: 'bg-sky-500/20 border-sky-500/30', description: 'Client Pro (Constantine)' };
  }
  if (ref.startsWith('A-') || ref.startsWith('C-A') || ref.startsWith('CA')) {
    return { code: 'CRISTAL-ALGER', nom: 'CRISTAL Alger', type: 'CRISTAL', badgeColor: 'text-purple-300', badgeBg: 'bg-purple-500/20 border-purple-500/30', description: 'Showroom (Alger)' };
  }
  if (ref.startsWith('O-') || ref.startsWith('C-O') || ref.startsWith('CO')) {
    return { code: 'CRISTAL-ORAN', nom: 'CRISTAL Oran', type: 'CRISTAL', badgeColor: 'text-purple-300', badgeBg: 'bg-purple-500/20 border-purple-500/30', description: 'Showroom (Oran)' };
  }
  if (ref.startsWith('D-') || ref.startsWith('C-C') || ref.startsWith('CC')) {
    return { code: 'CRISTAL-CONST', nom: 'CRISTAL Constantine', type: 'CRISTAL', badgeColor: 'text-purple-300', badgeBg: 'bg-purple-500/20 border-purple-500/30', description: 'Showroom (Constantine)' };
  }
  if (ref.startsWith('AO')) {
    return { code: 'ATELIER-ORAN', nom: 'ATELIER Oran', type: 'ATELIER', badgeColor: 'text-amber-300', badgeBg: 'bg-amber-500/20 border-amber-500/30', description: 'Atelier Oran' };
  }
  if (ref.startsWith('Y-') || ref.startsWith('Y')) {
    return { code: 'ATELIER-CONST', nom: 'ATELIER Constantine', type: 'ATELIER', badgeColor: 'text-amber-300', badgeBg: 'bg-amber-500/20 border-amber-500/30', description: 'Atelier Constantine' };
  }

  return {
    code: 'STANDARD',
    nom: 'Commande Client',
    type: 'AUTRE',
    badgeColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/30',
    description: 'Commande standard'
  };
}

export const LISTE_DONNEURS_ORDRE = INITIAL_CLIENT_CODIFICATIONS;

/**
 * Nettoie une chaîne de nom client pour n'en garder que les lettres majuscules utiles (A-Z)
 */
function extraireLettresClient(nomClient: string): string {
  if (!nomClient) return '';
  // Supprimer préfixes courants d'entreprises (SARL, EURL, ETS, STE, M., MR, ...)
  const sansPrefixe = nomClient
    .toUpperCase()
    .replace(/\b(SARL|EURL|SPA|SNC|ETS|ENTREPRISE|STE|SOCIETE|MONSIEUR|MADAME|MR|MME)\b/gi, '')
    .trim();
  // Ne garder que les caractères alphabétiques
  const lettres = (sansPrefixe || nomClient).toUpperCase().replace(/[^A-Z]/g, '');
  return lettres;
}

/**
 * Calcule le préfixe de base du repère pour un Donneur d'Ordre donné
 * Exemples:
 * - SOMODAL ALGER (prefixe SA-) -> "SA"
 * - SOMODAL ORAN (prefixe SO-) -> "SO"
 * - SOMODAL CONSTANTINE (prefixe SC-) -> "SC"
 * - CRISTAL ALGER (prefixe A-) -> "C" (Règle spécifique)
 * - CRISTAL CONSTANTINE (prefixe D-) -> "D" (Règle spécifique)
 * - CRISTAL ORAN (prefixe O-) -> "O"
 * - ATELIER ORAN (prefixe AO-) -> "AO"
 * - ATELIER CONSTANTINE (prefixe Y-) -> "Y"
 */
export function getBasePrefixeRepere(
  donneurOrdreNom: string,
  codifications: ClientCodification[] = INITIAL_CLIENT_CODIFICATIONS
): string {
  const codif = codifications.find(
    c => c.nom.toUpperCase().trim() === donneurOrdreNom.toUpperCase().trim() ||
         c.code.toUpperCase().trim() === donneurOrdreNom.toUpperCase().trim()
  );

  if (codif) {
    if (codif.prefixeRepereSpecial && codif.prefixeRepereSpecial.trim()) {
      return codif.prefixeRepereSpecial.trim().toUpperCase();
    }
    // Sinon, on reprend le préfixe de la commande sans tiret
    return (codif.prefixeCommande || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  // Règle de repli par détection de texte
  const upper = (donneurOrdreNom || '').toUpperCase();
  if (upper.includes('CRISTAL') && (upper.includes('ALGER') || upper.includes('ALG'))) return 'C';
  if (upper.includes('CRISTAL') && (upper.includes('CONST') || upper.includes('CNE') || upper.includes('CST'))) return 'D';
  if (upper.includes('CRISTAL') && upper.includes('ORAN')) return 'O';
  if (upper.includes('SOMODAL') || upper.includes('SOMADAL')) {
    if (upper.includes('ALGER')) return 'SA';
    if (upper.includes('ORAN')) return 'SO';
    if (upper.includes('CONST') || upper.includes('CNE')) return 'SC';
  }
  if (upper.includes('ATELIER')) {
    if (upper.includes('ORAN')) return 'AO';
    if (upper.includes('CONST') || upper.includes('CNE')) return 'Y';
  }

  return 'CMD';
}

/**
 * Génère le repère automatique par défaut pour les Caissons & Sous-Faces :
 *
 * Règle métier demandée :
 * 1. Base = Préfixe d'agence (ex: 'SA', 'SO', 'C', 'D', 'O', 'AO', 'Y')
 * 2. + 1ère lettre du nom du client final (ex: client "FARID" -> 'F' => "SAF")
 * 3. Gestion des doublons / collisions récents :
 *    Si des repères identiques ont déjà été utilisés dans les commandes récentes / enregistrées
 *    pour un client différent ou s'il y a un risque d'ambiguïté, on ajoute la 2ème lettre du client (ex: "SAFA")
 * 4. + Numéro séquentiel (ex: "SAF1", "SAF2", "CF1", "DF1", ...)
 */
export function genererRepereCaissonSousFace(params: {
  donneurOrdreNom: string;
  nomClientFinal: string;
  indexLigne: number; // 1, 2, 3...
  lignesActuelles?: CommandeCaisson[];
  dossiersHistorique?: DossierCommandeGlobal[];
  codifications?: ClientCodification[];
  isSousFaceSeule?: boolean;
}): string {
  const {
    donneurOrdreNom,
    nomClientFinal,
    indexLigne,
    lignesActuelles = [],
    dossiersHistorique = [],
    codifications = INITIAL_CLIENT_CODIFICATIONS,
    isSousFaceSeule = false
  } = params;

  const basePrefix = getBasePrefixeRepere(donneurOrdreNom, codifications);
  const lettresClient = extraireLettresClient(nomClientFinal);

  const l1 = lettresClient.length > 0 ? lettresClient[0] : 'X';
  const l2 = lettresClient.length > 1 ? lettresClient[1] : '';

  // Préfixe court standard (1ère lettre) : ex "SAF" ou "CF" ou "DF"
  const prefixCourt = `${basePrefix}${l1}`;

  // Vérifier s'il existe une collision de repère dans l'historique récent (7 derniers jours ou dossiers existants)
  // avec un AUTRE client ayant la même première lettre
  let collisionDetectee = false;
  if (nomClientFinal.trim().length > 0 && dossiersHistorique.length > 0) {
    const nomNettoyeCourant = nomClientFinal.trim().toUpperCase();
    const septJoursAvant = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const dossier of dossiersHistorique) {
      const nomAutreClient = (dossier.nomClientFinal || '').trim().toUpperCase();
      if (!nomAutreClient || nomAutreClient === nomNettoyeCourant) continue;

      // Si le donneur d'ordre est identique ou le même préfixe
      const autreDonneur = (dossier.donneurOrdre || '').toUpperCase();
      if (autreDonneur === donneurOrdreNom.toUpperCase()) {
        const autresLettres = extraireLettresClient(nomAutreClient);
        if (autresLettres.length > 0 && autresLettres[0] === l1) {
          // Même 1ère lettre mais client différent -> Collision détectée !
          collisionDetectee = true;
          break;
        }
      }
    }
  }

  // Si collision détectée et qu'on a une 2ème lettre, on utilise la 2ème lettre (ex: SAFA1 au lieu de SAF1)
  const prefixFinal = collisionDetectee && l2 ? `${basePrefix}${l1}${l2}` : prefixCourt;

  // Calculer le prochain indice séquentiel
  // On regarde les repères déjà attribués dans les lignes actuelles qui commencent par ce préfixe
  let maxIndex = 0;
  for (const c of lignesActuelles) {
    const rep = (c.repere || '').toUpperCase().trim();
    if (rep.startsWith(prefixFinal)) {
      const suite = rep.replace(prefixFinal, '').replace(/[^0-9]/g, '');
      const num = parseInt(suite, 10);
      if (!isNaN(num) && num > maxIndex) {
        maxIndex = num;
      }
    }
  }

  const numSeq = maxIndex > 0 ? maxIndex + 1 : Math.max(1, indexLigne);

  return `${prefixFinal}${numSeq}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Récupère le préfixe de commande officiel pour une agence / donneur d'ordre
 * Ex: "SOMODAL Oran" -> "SO-", "CRISTAL Oran" -> "O-", "SOMODAL Alger" -> "SA-", etc.
 */
export function getPrefixeCommande(
  donneurOrdreNom: string,
  codifications: ClientCodification[] = INITIAL_CLIENT_CODIFICATIONS
): string {
  const codif = codifications.find(
    c => c.nom.toUpperCase().trim() === (donneurOrdreNom || '').toUpperCase().trim() ||
         c.code.toUpperCase().trim() === (donneurOrdreNom || '').toUpperCase().trim()
  );
  if (codif && codif.prefixeCommande) {
    return codif.prefixeCommande;
  }
  const upper = (donneurOrdreNom || '').toUpperCase();
  if (upper.includes('SOMODAL') || upper.includes('SOMADAL')) {
    if (upper.includes('ALGER')) return 'SA-';
    if (upper.includes('CONST')) return 'SC-';
    return 'SO-';
  }
  if (upper.includes('CRISTAL')) {
    if (upper.includes('ALGER')) return 'A-';
    if (upper.includes('CONST')) return 'D-';
    return 'O-';
  }
  if (upper.includes('ATELIER')) {
    if (upper.includes('CONST')) return 'Y-';
    return 'AO-';
  }
  return 'CMD-';
}

/**
 * Extrait le numéro ou suffixe d'une référence sans son préfixe d'agence connu
 * Ex: "SO-260460" -> "260460", "O-10025" -> "10025", "260460" -> "260460"
 */
export function extraireNumeroSansPrefixe(
  ref: string,
  codifications: ClientCodification[] = INITIAL_CLIENT_CODIFICATIONS
): string {
  if (!ref) return '';
  let clean = ref.trim();
  if (!clean) return '';

  // Trier par longueur décroissante des préfixes
  const sorted = [...codifications].sort((a, b) => (b.prefixeCommande?.length || 0) - (a.prefixeCommande?.length || 0));
  for (const c of sorted) {
    const p = (c.prefixeCommande || '').trim();
    if (p && clean.toUpperCase().startsWith(p.toUpperCase())) {
      return clean.substring(p.length).trim();
    }
    const pNoDash = p.replace(/[-_ ]/g, '');
    if (pNoDash && clean.toUpperCase().startsWith(pNoDash.toUpperCase())) {
      return clean.substring(pNoDash.length).trim();
    }
  }

  // Fallbacks regex généraux pour préfixes usuels (ex: SA-1234, CMD-1234, etc.)
  const match = clean.match(/^([A-Za-z]{1,5}[-_ ]?)(.*)$/);
  if (match && match[2]) {
    return match[2].trim();
  }

  return clean;
}

/**
 * Formate et joint automatiquement le numéro de commande avec son préfixe officiel
 * Ex: formaterRefCommandeAvecPrefixe("260460", "SOMODAL Oran") => "SO-260460"
 * Ex: formaterRefCommandeAvecPrefixe("SO-260460", "CRISTAL Oran") => "O-260460"
 */
export function formaterRefCommandeAvecPrefixe(
  numeroOuRef: string,
  donneurOrdreNom: string,
  codifications: ClientCodification[] = INITIAL_CLIENT_CODIFICATIONS
): string {
  const clean = (numeroOuRef || '').trim();
  if (!clean) return '';

  const prefix = getPrefixeCommande(donneurOrdreNom, codifications);
  const suffix = extraireNumeroSansPrefixe(clean, codifications);

  return suffix ? `${prefix}${suffix}` : `${prefix}${clean}`;
}
