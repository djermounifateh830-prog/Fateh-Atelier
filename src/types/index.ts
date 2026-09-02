export interface Article {
  code_art: string;
  designation: string;
  statut: 'NORMAL' | 'ALERTE' | string;
  hauteur: number;
  longeur: number;          // longueur de barre neuve en mm
  lame: number;             // épaisseur de lame de scie en mm (epaisseur_scie)
  debordement: number;      // marge ajoutée à chaque coupe (mm, peut être négative)
  refus_min: number;        // seuil max de déchet (<= refus_min = Déchet)
  refus_max: number;        // seuil min de chute réutilisable (>= refus_max = Chute Stock)
  stock_physique: number;   // nombre de barres neuves en stock
  quantite_reservee: number;
  prix_unitaire: number;    // DZD
  stock_min: number;        // seuil d'alerte stock
}

export interface ChuteItem {
  id?: string;
  longueur: number;
  quantite: number;
}

export interface ChuteMaille {
  id?: string;
  dimension_fixe: number; // en mm (ou cm converti en mm)
  plis: number;           // nombre de plis disponibles
}

export type ChutesStockMap = {
  [nomFeuille: string]: ChuteItem[] | ChuteMaille[];
};

export type MappingChutes = {
  [code_art: string]: string; // code_art -> nomFeuille dans stok_chutes
};

export interface CommandeHeader {
  refCommande: string;     // ex: S-A26736, AO261543, A260498
  nomClient: string;       // ex: SARL MCB ALUMINIUM, HAMEL NABIL
  donneurOrdre?: string;   // ex: SOMADAL Alger, CRISTAL Oran, ATELIER Alger
  dateCommande: string;     // ex: 09/08/2026
  lieuLivraison?: string;  // ex: MEGRINE, BIRKHADEM, KOUBA
  agence?: string;         // SOMADAL Alger, CRISTAL Constantine, etc.
}

export interface PieceACouper {
  id: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  longueur: number; // Longueur brute saisie
  longueurAvecDebord: number; // Longueur + debordement article
  quantite: number;
  label?: string; // Repère (ex: SA-1, 1R1, H1)
  repere?: string;
  designation?: string;
  optionsSpecs?: string; // e.g. "Avec Sous-Face Montée, Avec Peinture"
}

export interface PieceCoupee {
  id: string;
  longueur: number;
  label: string;
  repere?: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  originalIndex?: number;
}

export interface ResultatBarre {
  id: string;
  pieces: PieceCoupee[];
  longueur_barre: number;
  utilise: number;
  chute: number;
  statut: 'Dechet' | 'STOCK' | 'SACRIFICE';
  motifRepete?: number;            // Quantité de barres identiques à couper selon ce même plan
  patternSignature?: string;       // Signature unique du plan de coupe pour regroupement en paquet
  nombreReglagesButee?: number;    // Nombre de positions de butée requises sur cette barre
  eboutage?: number;               // Éboutage / affranchissement tête en mm
}

export interface ResultatChute {
  id: string;
  pieces: PieceCoupee[];
  longueur_chute_depart: number;
  utilise: number;
  reste: number;
  nombreReglagesButee?: number;
}

export interface ResultatOptimisation {
  barres_neuves: ResultatBarre[];
  chutes_utilisees: ResultatChute[];
  pieces_non_placees: PieceCoupee[];
  total_chute_mm: number;
  total_dechet_mm: number;
  total_barres_neuves: number;
  total_chutes_recyclees: number;
  taux_rendement: number; // Pourcentage matière utile / matière totale engagée
  dateCalcul: string;
  articleCode?: string;
  articleDesignation?: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  coloris?: string;
  mode: 'matiere' | 'temps';
  poidsTemps?: number;
  optionsDetails?: string[];
  // Indicateurs avancés d'intelligence & d'atelier
  borneTheoriqueBarres?: number;      // Minimum physique absolu mathématique incompressible
  isOptimumAbsolu?: boolean;          // Vrai si le nombre de barres = borne inférieure
  reglagesButeeTotal?: number;        // Nombre total de réglages butée nécessaires
  reglagesButeeEconomises?: number;   // Nombre de réglages de butée épargnés grâce aux groupements
  nombrePaquetsCoupe?: number;        // Nombre de séries de barres coupées en paquet/identiques
  tempsEstimeMinutes?: number;        // Temps estimé d'usinage / sciage
  gainTempsPourcent?: number;         // Gain de productivité par rapport au placement naïf
}

export interface CommandeTablier {
  id: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  largeur: number;
  hauteur: number;
  hauteur_lame_tablier: number; // 43, 55, etc.
  quantite: number;
  repere: string; // ex: SA-1, SB-1, 1R1
  nb_lame?: number;
  typeOuvrant?: string; // ex: Ouvrant à Droite, Gauche, etc.
  // Options métier spécifiques atelier 3M
  typeFabrication: 'TABLIER_SEUL' | 'VOLET_COMPLET'; // Juste le tablier OU Volet complet avec 2 coulisses
  avecLameFinale: boolean; // Avec lame finale extrudée alu + joint OU Sans lame finale
  avecCoulisses?: boolean;
  articleCode?: string;
  articleDesignation?: string;
  lfArticleCode?: string;
  lfArticleDesignation?: string;
  glArticleCode?: string;
  glArticleDesignation?: string;
}

export type TypeOuvertureMoustiquaire = 'FENETRE' | 'PORTE_FENETRE' | 'DOUBLE_VANTAUX' | 'CENTRALE' | 'FIXE';
export type TypeFabricationMoustiquaire = 'COMPLET' | 'SEMI_FINI_MAILLE' | 'PROFILES_SEULS';

export interface BesoinMoustiquaire {
  id?: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  modele: string;
  typeOuverture: TypeOuvertureMoustiquaire | string; // FENETRE, PORTE_FENETRE, DOUBLE_VANTAUX, CENTRALE, FIXE
  typeFabrication: TypeFabricationMoustiquaire; // SEMI_FINI_MAILLE, PROFILES_SEULS, COMPLET
  avecBarreInferieure: boolean; // Barre inférieure fine & esthétique optionnelle pour la traverse basse
  largeur: number;
  hauteur: number;
  quantite: number;
  repere: string; // ex: H1, H2, M1
  articleCodeMaille?: string;
  articleDesignationMaille?: string;
  articleCodeCadre?: string;
  articleDesignationCadre?: string;
  articleCodeCoulisse?: string;
  articleDesignationCoulisse?: string;
  articleCodeBarreInf?: string;
  articleDesignationBarreInf?: string;
}

export interface CommandeCaisson {
  id: string;
  refCommande?: string;
  sfRefCommande?: string; // N° de commande propre à la sous-face si distinct du caisson
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  longueur: number; // Longueur caisson en mm
  quantite: number;
  repere: string; // ex: SF-1, C-1
  // Options métier caisson & Découpe
  articleCode?: string; // Code article Caisson Tunnel (ex: ART0010, ART0011...)
  articleDesignation?: string; // ex: "CT SOMO 25 ARRONDI", "CT SOMO 30 FIBRAGLO"
  sfArticleCode?: string; // Code article Sous-Face (ex: ART0020, ART0022...)
  sfArticleDesignation?: string; // ex: "SF 250 ALU BL", "SF 300 ALU 7024"
  typeCaisson: 'TUNNEL_SIMPLE' | 'EXTERIEUR'; // Caisson tunnel (coupe + montage des 2 joues latérales)
  typePrestation?: 'CAISSON_ET_SOUS_FACE' | 'CAISSON_SEUL' | 'SOUS_FACE_SEULE'; // Mode de commande
  isSousFaceSeule?: boolean; // Vrai si commande uniquement de sous-face (sans caisson tunnel)
  avecSousFace: boolean; // Avec sous-face OU Sans sous-face
  montageSousFace: 'MONTEE_ATELIER' | 'NON_MONTEE'; // Montée sur caisson en atelier OU Livrée séparément
  avecPeinture: boolean; // Avec peinture / laquage couleur OU Brut
}

export type FigurePrecadre = 'VIDE' | 'RENFORT_L1' | 'RENFORT_H1' | 'RENFORT_CROISE';
export type ModeDebordementPrecadre = 'SUPERIEUR_INFERIEUR' | 'SUPERIEUR_SEUL' | 'INFERIEUR_SEUL' | 'SANS_DEBORDEMENT';

export interface CommandePrecadre {
  id: string;
  refCommande?: string;
  nomClient?: string;
  donneurOrdre?: string;
  dateCommande?: string;
  largeur: number;
  hauteur: number;
  quantite: number;
  repere: string;
  figure: FigurePrecadre;
  modeDebordement: ModeDebordementPrecadre;
  debordementSuperieur: number; // ex: 100mm
  debordementInferieur: number; // ex: 300mm
  typeCoupe?: '45' | '90'; // Fixed 90° straight cut
  jeuMaconnerie?: number; // Obsolete / 0mm
  articleCode?: string;
  articleDesignation?: string;
  bouchonArticleCode?: string;
  bouchonArticleDesignation?: string;
  typeAssemblage?: 'BOUCHON' | 'EQUERRE';
}

export type FamilleProduit = 'TABLIER' | 'MOUSTIQUAIRE' | 'CAISSON' | 'PRECADRE';

export type StatutDossier = 'BROUILLON' | 'EN_ATTENTE' | 'EN_COURS' | 'OPTIMISE' | 'FABRIQUE' | 'CLOTURE' | 'LIVRE' | 'TERMINE';

export interface DossierCommandeGlobal {
  id: string;
  donneurOrdre: string; // ex: "SOMADAL Alger", "CRISTAL Alger", "ATELIER Alger"
  nomClientFinal: string; // ex: "SARL MCB ALUMINIUM"
  dateCommande: string; // ex: "09/08/2026"
  refCommande: string; // ex: "S-A26736" (Référence générale du dossier ou première commande)
  // Numéros de commandes propres et distincts par famille de produit au sein du même dossier :
  numCommandeCaisson?: string;
  numCommandeSousFace?: string;
  numCommandeTablier?: string;
  numCommandeMoustiquaire?: string;
  numCommandePrecadre?: string;
  articlesTabliers: CommandeTablier[];
  articlesMoustiquaires: BesoinMoustiquaire[];
  articlesCaissons: CommandeCaisson[];
  articlesPrecadres: CommandePrecadre[];
  notes?: string;
  statut: StatutDossier;
  ficheTransfertId?: string; // ID de la fiche de transfert associée lors de la livraison
  dateLivraison?: string;    // Date de remise au transporteur
  nomChauffeur?: string;     // Nom du chauffeur transporteur
}

// ============================================================================
// FICHE DE TRANSFERT / BON DE LIVRAISON TRANSPORTEUR
// ============================================================================

export interface LigneFicheTransfert {
  id: string;
  dossierId?: string;
  ofId?: string;
  nomChauffeur: string;
  numCommande: string;
  clientDeMonClient: string; // Le client final du client
  familleProduit: FamilleProduit | string; // PRÉCADRE, MOUSTIQUAIRE, CAISSON, TABLIER...
  quantiteArticles: number;  // Nombre de pièces / unités
  designationDetail?: string; // ex: "4 Précadres (dim 1200x1400)", "2 Caissons + 2 Sous-faces"
  remarques?: string;
}

export interface FicheTransfert {
  id: string;
  numeroFiche: string;       // ex: "FT-2026-001"
  monClient: string;         // Nom de mon client (Donneur d'ordre, ex: SOMADAL Alger, CRISTAL Oran)
  nomChauffeurPrincipal?: string; // Nom du chauffeur
  matriculeVehicule?: string;// Matricule véhicule (optionnel)
  telephoneChauffeur?: string; // Téléphone chauffeur (optionnel)
  dateLivraison: string;     // Date de livraison (DD/MM/YYYY)
  lignes: LigneFicheTransfert[];
  visaChauffeur?: string;    // Nom / Signature chauffeur
  visaAtelier?: string;      // Nom / Visa responsable atelier
  statut: 'VALIDEE' | 'EN_PREPARATION' | 'ANNULEE';
  notes?: string;
  createdAt?: string;
}

export interface ResultatMoustiquaire {
  besoin: BesoinMoustiquaire;
  dimension_fixe_requise: number;
  dimension_fixe_est: 'L' | 'H';
  nb_plis_requis: number;
  nb_fils_guidage: number;
  distance_cordes: number;
  longueur_corde_unitaire_m: number;
  longueur_corde_totale_m: number;
  superficie_m2: number;
  chute_trouvee: ChuteMaille | null;
  pieces_cadre_coulisse: {
    longueur: number;
    quantite: number;
    label: string;
    repere?: string;
    refCommande?: string;
    nomClient?: string;
  }[];
}

export interface ModeleMoustiquaireConfig {
  pli: number;
  base: 'H' | 'L';
  diviseur_toile: number;
  nb_toiles: number;
  description: string;
}

// ============================================================================
// GESTION DES STOCKS — CYCLE DE VIE DES ORDRES DE FABRICATION
// ============================================================================

/** État d'avancement d'un Ordre de Fabrication */
export type StatutOF = 'EMIS' | 'RETOUR_EN_ATTENTE' | 'CLOTURE';

/**
 * Ligne de retour opérateur pour une barre/chute utilisée dans l'OF.
 * L'opérateur écrit dans la colonne "Nouvelle Chute" sur le papier.
 * On transcrit ici ce qu'il a écrit.
 */
export interface LigneRetourOF {
  /** Identifiant unique de la ligne */
  id: string;
  /** Repère de la pièce (ex: CT-1, SA-1, H1) ou liste si coupes multiples */
  repere: string;
  /** Type de support prévu par l'algorithme */
  typeSupport: 'BARRE_NEUVE' | 'CHUTE_BARRE' | 'CHUTE_MAILLE';
  articleCode?: string;
  /** Longueur/dimension du support prévu (mm) */
  longueurPrevue: number;
  /** Reste prévu après coupe (mm) — calculé par l'optimiseur */
  restePrevuMm: number;
  /** Ce que l'opérateur a écrit dans la colonne "Nouvelle Chute" (vide = conforme) */
  saisieOperateur: string;
  /**
   * Si l'opérateur a écrit "BAR" → il a utilisé une barre neuve à la place d'une chute.
   * Dimension du résidu de la barre neuve utilisée (mm).
   */
  residuBarreNeuve?: number;
  /** Source réelle utilisée par l'opérateur */
  sourceReelle?: 'CONFORME' | 'BARRE_NEUVE' | 'AUTRE_CHUTE' | 'CHUTE_NON_INVENTORIEE';
  /** Longueur réelle du support utilisé si différent du prévu (mm) */
  longueurSourceReelle?: number;
  /** Longueur réelle mesurée de la chute restante après toutes les coupes de cette barre/chute (mm) */
  resteReelMesureMm?: number;
  /** Destination de la chute restante */
  actionReste?: 'A_STOCKER' | 'DECHET';
  /** Détails des pièces découpées sur cette barre/chute (ex: "CT-1 (2100mm) + CT-2 (1500mm)") */
  piecesInfoStr?: string;
  /** Remarque libre (optionnel) */
  remarque?: string;
}

/**
 * Suivi complet d'un Ordre de Fabrication depuis son émission jusqu'à sa clôture.
 */
export interface SuiviOF {
  id: string;
  /** Référence de la commande (ex: S-A26736) */
  numCommande: string;
  /** Nom du client final */
  nomClient: string;
  /** Donneur d'ordre */
  donneurOrdre: string;
  /** Famille du produit fabriqué */
  famille: FamilleProduit;
  /** Section / désignation article (ex: Cadre MSTQ, CT SOMO 30) */
  titreSection: string;
  /** État courant de l'OF */
  statut: StatutOF;
  /** Date d'émission (DD/MM/YYYY) */
  dateEmission: string;
  /** Date de retour opérateur (DD/MM/YYYY) — renseignée lors de la saisie retour */
  dateRetour?: string;
  /** Lignes de retour (une par ligne du plan d'optimisation) */
  lignesRetour: LigneRetourOF[];
  /** Remarque générale de l'opérateur sur l'OF */
  remarqueGlobale?: string;
  /** Snapshot du plan d'optimisation au moment de l'émission (référence) */
  totalBarresNeuvesPrevu: number;
  totalChutesUtiliseesPrevu: number;
}

/**
 * Log d'un mouvement de stock confirmé (sortie, entrée, ajustement).
 */
export type TypeMouvement =
  | 'SORTIE_BARRE_NEUVE'        // Barre neuve consommée
  | 'SORTIE_CHUTE'             // Chute consommée
  | 'ENTREE_CHUTE'             // Nouvelle chute créée / stockée après coupe
  | 'AJUSTEMENT_CHUTE'         // Dimension chute modifiée (abîmée → débitage)
  | 'AJUSTEMENT_INVENTAIRE';   // Correction manuelle stock

export interface MouvementStock {
  id: string;
  date: string;          // DD/MM/YYYY HH:mm
  type: TypeMouvement;
  ofId?: string;         // SuiviOF.id si lié à un OF
  numCommande?: string;
  nomClient?: string;
  articleCode?: string;
  designation?: string;
  longueurMm?: number;   // Pour barres/chutes
  quantite?: number;     // Pour barres neuves
  remarque?: string;
}

// ============================================================================
// CODIFICATION CLIENTS & PRÉFIXES AUTOMATIQUES
// ============================================================================

export interface ClientCodification {
  id: string;
  code: string;               // ex: "CRISTAL-ORAN", "SOMODAL-ORAN"
  nom: string;                // ex: "CRISTAL Oran", "SOMODAL Oran"
  prefixeCommande: string;    // ex: "O-", "SO-", "A-", "SA-", "D-", "SC-", "AO-", "Y-"
  prefixeRepereSpecial?: string; // ex: 'C' pour CRISTAL Alger, 'D' pour CRISTAL CNE, ou vide pour hériter de prefixeCommande sans tiret
  type: 'SOMADAL' | 'CRISTAL' | 'ATELIER' | 'AUTRE';
  badgeColor?: string;
  badgeBg?: string;
  description?: string;
  actif: boolean;
  ordre?: number;
}


