import {
  BesoinMoustiquaire,
  ChuteMaille,
  ModeleMoustiquaireConfig,
  ResultatMoustiquaire
} from '../types';

export const MARGE_SECURITE_PLIS = 2; // Règle d'origine atelier validée (+2 plis)

// Déductions exactes de coupe d'après règles de fabrication
// 1. SANS Barre Inférieure (Cadre 4 côtés standard) :
export const DEDUCTION_CADRE_LARGEUR_MM = -62; // Marge traverses cadre (L - 62)
export const DEDUCTION_CADRE_HAUTEUR_STANDARD_MM = -62; // Marge montants cadre sans barre inf (H - 62)
export const DEDUCTION_COULISSE_STANDARD_MM = -46; // Marge coulisse sans barre inf (H - 46 ou L - 46)

// 2. AVEC Barre Inférieure (Cadre 3 côtés + Barre Inférieure fine) :
export const DEDUCTION_CADRE_HAUTEUR_AVEC_BARRE_INF_MM = -37; // Marge montants cadre avec barre inf (H - 37)
export const DEDUCTION_BARRE_INF_MM = -13; // Marge barre inférieure (L - 13)
export const DEDUCTION_COULISSE_AVEC_BARRE_INF_MM = -33; // Marge coulisse avec barre inf (H - 33 ou L - 33)

// Alias de rétrocompatibilité
export const DEDUCTION_CADRE_MM = -62;
export const DEDUCTION_COULISSE_MM = -46;

export function normalizeTypeOuverture(typeOuverture: string = ''): 'FENETRE' | 'PORTE_FENETRE' | 'DOUBLE_VANTAUX' | 'CENTRALE' | 'FIXE' {
  const t = typeOuverture.toUpperCase().trim();
  if (t.includes('DOUBLE') || t.includes('2 V') || t.includes('2V') || t.includes('BAIS') || t.includes('BAIE')) {
    return 'DOUBLE_VANTAUX';
  }
  if (t.includes('CENTRALE')) {
    return 'CENTRALE';
  }
  if (t.includes('FIXE') || t.includes('FIX')) {
    return 'FIXE';
  }
  if (t.includes('PORTE') || t.includes('PF')) {
    return 'PORTE_FENETRE';
  }
  return 'FENETRE';
}

export function determinerNbFilsGuidage(dimension: number): number {
  // Test n de 2 à 8 tel que dimension/n est entre 250mm et 370mm
  for (let n = 2; n <= 8; n++) {
    const ratio = dimension / n;
    if (ratio >= 250 && ratio <= 370) {
      return n;
    }
  }
  // Si hors plage, trouver n minimisant l'écart à 300mm
  let meilleurN = 2;
  let minDiff = Infinity;
  for (let n = 2; n <= 8; n++) {
    const ratio = dimension / n;
    const diff = Math.abs(ratio - 300);
    if (diff < minDiff) {
      minDiff = diff;
      meilleurN = n;
    }
  }
  return meilleurN;
}

export function calculerBesoinMaille(besoin: BesoinMoustiquaire): {
  dimension_fixe_requise: number;
  dimension_fixe_est: 'L' | 'H';
  nb_plis_requis: number;
  nb_fils_guidage: number;
  distance_cordes: number;
  longueur_corde_unitaire_m: number;
  longueur_corde_totale_m: number;
  superficie_m2: number;
} {
  const typeKey = normalizeTypeOuverture(besoin.typeOuverture);
  const L = besoin.largeur;
  const H = besoin.hauteur;
  const Q = Math.max(1, besoin.quantite);

  let dimensionPertinenteForPlis: number;
  let dimensionFixeEst: 'L' | 'H';
  let dimensionFixeRequise: number;
  let dimensionCordes: number;
  let formuleCordeUnitM: number;

  if (typeKey === 'DOUBLE_VANTAUX') {
    // 2 vantaux : dimension fixe = H, plis calculés sur L/2
    dimensionPertinenteForPlis = L / 2.0;
    dimensionFixeEst = 'H';
    dimensionFixeRequise = H;
    dimensionCordes = H;
    formuleCordeUnitM = (H + L) / 1000.0;
  } else if (typeKey === 'PORTE_FENETRE') {
    // Porte fenêtre 1 vantail : dimension fixe = H, plis calculés sur L
    dimensionPertinenteForPlis = L;
    dimensionFixeEst = 'H';
    dimensionFixeRequise = H;
    dimensionCordes = H;
    formuleCordeUnitM = ((H * 1.3) + L) / 1000.0;
  } else if (typeKey === 'CENTRALE') {
    // Centrale : dimension fixe = H, plis calculés sur L
    dimensionPertinenteForPlis = L;
    dimensionFixeEst = 'H';
    dimensionFixeRequise = H;
    dimensionCordes = H;
    formuleCordeUnitM = ((H * 2.0) + L) / 1000.0;
  } else if (typeKey === 'FIXE') {
    // Fixe : dimension fixe = L, plis calculés sur H
    dimensionPertinenteForPlis = H;
    dimensionFixeEst = 'L';
    dimensionFixeRequise = L;
    dimensionCordes = L;
    formuleCordeUnitM = ((L * 1.5) + H) / 1000.0;
  } else {
    // Fenêtre standard : dimension fixe = L, plis calculés sur H
    dimensionPertinenteForPlis = H;
    dimensionFixeEst = 'L';
    dimensionFixeRequise = L;
    dimensionCordes = L;
    formuleCordeUnitM = ((L * 1.5) + H) / 1000.0;
  }

  const nbPlis = Math.round(dimensionPertinenteForPlis / 25.0) + MARGE_SECURITE_PLIS;
  const nbFils = determinerNbFilsGuidage(dimensionCordes);

  // Formule exacte de la colonne H du fichier Excel OPTIMISATION DEVELOPPEE.xlsx
  let distanceCordes = (dimensionCordes > 400) ? (dimensionCordes - 400) : dimensionCordes;
  const dimUtile = Math.max(0, dimensionCordes - 400);
  let distanceTrouvee = false;
  for (let n = 2; n <= 8; n++) {
    const ratio = dimUtile / n;
    if (ratio >= 250 && ratio <= 370) {
      distanceCordes = ratio;
      distanceTrouvee = true;
      break;
    }
  }
  if (!distanceTrouvee) {
    for (let n = 2; n <= 8; n++) {
      const ratio = dimUtile / n;
      if (ratio >= 200 && ratio < 250) {
        distanceCordes = ratio;
        distanceTrouvee = true;
        break;
      }
    }
  }

  const totalCordes = nbFils * Q;
  const longueurCordeTotaleM = formuleCordeUnitM * totalCordes;
  const superficieM2 = (L * H / 1000000.0) * Q;

  return {
    dimension_fixe_requise: dimensionFixeRequise,
    dimension_fixe_est: dimensionFixeEst,
    nb_plis_requis: nbPlis,
    nb_fils_guidage: nbFils,
    distance_cordes: Math.round(distanceCordes * 10) / 10,
    longueur_corde_unitaire_m: Math.round(formuleCordeUnitM * 100) / 100,
    longueur_corde_totale_m: Math.round(longueurCordeTotaleM * 100) / 100,
    superficie_m2: Math.round(superficieM2 * 1000) / 1000
  };
}

export function chercherChuteCompatible(
  dimensionFixeRequise: number,
  nbPlisRequis: number,
  chutesDisponibles: ChuteMaille[],
  toleranceDimension: number = 20.0
): ChuteMaille | null {
  const candidates = chutesDisponibles.filter(c => {
    const diffDim = Math.abs(c.dimension_fixe - dimensionFixeRequise);
    return diffDim <= toleranceDimension && c.plis >= nbPlisRequis;
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, curr) => {
    const diffCurr = curr.plis - nbPlisRequis;
    const diffBest = best.plis - nbPlisRequis;
    return diffCurr < diffBest ? curr : best;
  }, candidates[0]);
}

export function calculerMoustiquaire(
  besoin: BesoinMoustiquaire,
  chutesDisponibles: ChuteMaille[]
): ResultatMoustiquaire {
  const {
    dimension_fixe_requise,
    dimension_fixe_est,
    nb_plis_requis,
    nb_fils_guidage,
    distance_cordes,
    longueur_corde_unitaire_m,
    longueur_corde_totale_m,
    superficie_m2
  } = calculerBesoinMaille(besoin);

  const chuteTrouvee = chercherChuteCompatible(
    dimension_fixe_requise,
    nb_plis_requis,
    chutesDisponibles
  );

  const typeKey = normalizeTypeOuverture(besoin.typeOuverture);
  const L = besoin.largeur;
  const H = besoin.hauteur;
  const Q = Math.max(1, besoin.quantite);

  const piecesProfiles: { longueur: number; quantite: number; label: string; repere?: string; refCommande?: string }[] = [];

  // Déductions exactes selon option Barre Inférieure
  const dedCadreH = besoin.avecBarreInferieure ? DEDUCTION_CADRE_HAUTEUR_AVEC_BARRE_INF_MM : DEDUCTION_CADRE_HAUTEUR_STANDARD_MM; // -37mm si avec barre inf, -62mm sinon
  const dedCadreL = DEDUCTION_CADRE_LARGEUR_MM; // -62mm
  const dedCoulisse = besoin.avecBarreInferieure ? DEDUCTION_COULISSE_AVEC_BARRE_INF_MM : DEDUCTION_COULISSE_STANDARD_MM; // -33mm si avec barre inf, -46mm sinon
  const dedBarreInf = DEDUCTION_BARRE_INF_MM; // -13mm

  // 1. BARRES COULISSES (tirage / coulisseau)
  let qtyCoulisses = 1;
  let lenCoulisse = H + dedCoulisse;

  if (typeKey === 'DOUBLE_VANTAUX' || typeKey === 'CENTRALE') {
    qtyCoulisses = 2;
    lenCoulisse = H + dedCoulisse;
  } else if (typeKey === 'FIXE') {
    qtyCoulisses = 0; // Aucune coulisse pour un cadre fixe
  } else if (typeKey === 'FENETRE') {
    qtyCoulisses = 1;
    lenCoulisse = L + dedCoulisse; // Tirage horizontal
  } else {
    qtyCoulisses = 1;
    lenCoulisse = H + dedCoulisse;
  }

  if (qtyCoulisses > 0) {
    piecesProfiles.push({
      longueur: lenCoulisse,
      quantite: qtyCoulisses * Q,
      label: `${besoin.repere}-CS (Barre Coulisse ${lenCoulisse}mm [marge ${dedCoulisse}mm])`,
      repere: `${besoin.repere}-CS`,
      refCommande: besoin.refCommande
    });
  }

  // 2. CADRE DORMANT
  const lenMontantCadre = H + dedCadreH;
  const lenTraverseCadre = L + dedCadreL;

  // 2 Montants verticaux (Ha et Hb)
  piecesProfiles.push({
    longueur: lenMontantCadre,
    quantite: 1 * Q,
    label: `Ha-${besoin.repere} (Montant Cadre A H=${lenMontantCadre}mm [marge ${dedCadreH}mm])`,
    repere: `Ha-${besoin.repere}`,
    refCommande: besoin.refCommande
  });
  piecesProfiles.push({
    longueur: lenMontantCadre,
    quantite: 1 * Q,
    label: `Hb-${besoin.repere} (Montant Cadre B H=${lenMontantCadre}mm [marge ${dedCadreH}mm])`,
    repere: `Hb-${besoin.repere}`,
    refCommande: besoin.refCommande
  });

  // Traverse Haute (La)
  piecesProfiles.push({
    longueur: lenTraverseCadre,
    quantite: 1 * Q,
    label: `La-${besoin.repere} (Traverse Haute Cadre L=${lenTraverseCadre}mm [marge ${dedCadreL}mm])`,
    repere: `La-${besoin.repere}`,
    refCommande: besoin.refCommande
  });

  // Traverse Basse (Lb OU Barre Inférieure Optionnelle)
  if (besoin.avecBarreInferieure) {
    const lenBarreInf = L + dedBarreInf;
    piecesProfiles.push({
      longueur: lenBarreInf,
      quantite: 1 * Q,
      label: `BI-${besoin.repere} (Barre Inférieure L=${lenBarreInf}mm [marge ${dedBarreInf}mm])`,
      repere: `BI-${besoin.repere}`,
      refCommande: besoin.refCommande
    });
  } else {
    piecesProfiles.push({
      longueur: lenTraverseCadre,
      quantite: 1 * Q,
      label: `Lb-${besoin.repere} (Traverse Basse Cadre L=${lenTraverseCadre}mm [marge ${dedCadreL}mm])`,
      repere: `Lb-${besoin.repere}`,
      refCommande: besoin.refCommande
    });
  }

  return {
    besoin,
    dimension_fixe_requise,
    dimension_fixe_est,
    nb_plis_requis,
    nb_fils_guidage,
    distance_cordes,
    longueur_corde_unitaire_m,
    longueur_corde_totale_m,
    superficie_m2,
    chute_trouvee: chuteTrouvee,
    pieces_cadre_coulisse: piecesProfiles
  };
}
