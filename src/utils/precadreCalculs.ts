import { ModeDebordementPrecadre } from '../types';

/**
 * Constante d'épaisseur du profilé de barre pour le précadre (fixée à 19 mm)
 */
export const EPAISSEUR_BARRE_PRECADRE_MM = 19;

/**
 * Calcul des dimensions exactes des profilés à débiter pour un précadre / dormant.
 * 
 * Règles métier :
 * 1. Largeur saisie = Largeur intérieure / coupe de la traverse :
 *    - Traverses horizontales (1 × TRH + 1 × TRB) : mesure L telle quelle.
 *    - Renfort horizontal seul (L1) : mesure L telle quelle.
 * 2. Montants extérieurs verticaux (2 × MT : Ha, Hb) :
 *    - La hauteur de coupe correspond à la Hauteur brute H (ex: 3000 mm).
 *    - Les débordements (haut 100mm, bas 300mm) définissent le positionnement des traverses sur le montant.
 * 3. Renfort vertical (H1) (seul ou croisé) :
 *    - Se loge à l'intérieur du cadre entre la traverse haute (positionnée à debSup) et la traverse basse (positionnée à debInf).
 *    - Hauteur nette entre traverses = Hauteur - debSup - debInf - 2 × épaisseur de traverse (2 × 19 mm = 38 mm).
 * 4. Renfort croisé (L1 + H1) :
 *    - Le montant central vertical H1 sépare la largeur en 2 parties.
 *    - Les 2 demi-renforts horizontaux (L1 et L2) valent chacun : (Largeur - 19 mm) / 2.
 */
export const getDimensionsPrecadrePiece = (
  largeur: number,
  hauteur: number,
  modeDebordement: ModeDebordementPrecadre,
  debSup: number = 100,
  debInf: number = 300,
  _deductionBouchonParCote: number = 0
) => {
  let addHaut = 0;
  let addBas = 0;
  if (modeDebordement === 'SUPERIEUR_INFERIEUR' || (modeDebordement as any) === 'DOUBLE') {
    addHaut = debSup;
    addBas = debInf;
  } else if (modeDebordement === 'SUPERIEUR_SEUL' || (modeDebordement as any) === 'SUPERIEUR') {
    addHaut = debSup;
  } else if (modeDebordement === 'INFERIEUR_SEUL' || (modeDebordement as any) === 'INFERIEUR') {
    addBas = debInf;
  }

  const sommeDebordements = addHaut + addBas;
  const hasDebordement = sommeDebordements > 0;
  const typeAssemblage: 'BOUCHON' | 'EQUERRE' = hasDebordement ? 'EQUERRE' : 'BOUCHON';

  // 1. Traverses horizontales (TRH + TRB) : L tel quel
  const lTraverse = Math.max(0, Math.round(largeur * 10) / 10);

  // 2. Montants verticaux extérieurs (2 × MT : Ha, Hb) :
  // La hauteur de débit reste la hauteur totale H (les débordements servent au positionnement des traverses)
  const hMontant = Math.max(0, Math.round(hauteur * 10) / 10);

  // 3. Renfort horizontal seul L1 : L tel quel
  const lRenfortSeul = Math.max(0, Math.round(largeur * 10) / 10);

  // 4. Demi-renforts horizontaux L1 et L2 (pour renfort croisé L1 + H1) :
  // Mesure = (Largeur intérieure - 19 mm épaisseur du montant central H1) / 2
  const lDemiRenfortCroise = Math.max(
    0,
    Math.round(((largeur - EPAISSEUR_BARRE_PRECADRE_MM) / 2) * 10) / 10
  );

  // 5. Renfort vertical H1 (seul ou croisé) :
  // Se loge entre la traverse haute (située à addHaut) et la traverse basse (située à addBas)
  // H1 = Hauteur - addHaut - addBas - 2 × épaisseur de traverse (2 × 19 mm)
  const hRenfort = Math.max(
    0,
    Math.round((hauteur - addHaut - addBas - 2 * EPAISSEUR_BARRE_PRECADRE_MM) * 10) / 10
  );

  return {
    hMontant,
    lTraverse,
    lRenfortSeul,
    lDemiRenfortCroise,
    hRenfort,
    typeAssemblage,
    hasDebordement,
    addHaut,
    addBas,
    sommeDebordements,
    epaisseurBarre: EPAISSEUR_BARRE_PRECADRE_MM
  };
};


