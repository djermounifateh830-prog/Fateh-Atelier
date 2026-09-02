import { Article, ChuteItem, ChuteMaille, MappingChutes } from '../types';

export const INITIAL_ARTICLES: Article[] = [
  // --- CAISSONS TUNNEL (CT) ---
  {
    code_art: 'ART0010',
    designation: 'CT SOMO 25 ARRONDI',
    statut: 'NORMAL',
    hauteur: 25,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 42,
    quantite_reservee: 5,
    prix_unitaire: 3800,
    stock_min: 10
  },
  {
    code_art: 'ART0011',
    designation: 'CT SOMO 30 ARRONDI',
    statut: 'NORMAL',
    hauteur: 30,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 36,
    quantite_reservee: 4,
    prix_unitaire: 4500,
    stock_min: 8
  },
  {
    code_art: 'ART0012',
    designation: 'CT SOMO 25 FIBRAGLO',
    statut: 'NORMAL',
    hauteur: 25,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 28,
    quantite_reservee: 2,
    prix_unitaire: 4900,
    stock_min: 8
  },
  {
    code_art: 'ART0013',
    designation: 'CT SOMO 30 FIBRAGLO',
    statut: 'NORMAL',
    hauteur: 30,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 22,
    quantite_reservee: 3,
    prix_unitaire: 5600,
    stock_min: 6
  },
  {
    code_art: 'ART0014',
    designation: 'CT SOMO 25 NORMAL',
    statut: 'NORMAL',
    hauteur: 25,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 30,
    quantite_reservee: 2,
    prix_unitaire: 3600,
    stock_min: 8
  },
  {
    code_art: 'ART0015',
    designation: 'CT SOMO 30 NORMAL',
    statut: 'NORMAL',
    hauteur: 30,
    longeur: 6500,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 25,
    quantite_reservee: 4,
    prix_unitaire: 4300,
    stock_min: 8
  },
  {
    code_art: 'ART0016',
    designation: 'CT SOMO 250 RECTANGULAIRE',
    statut: 'NORMAL',
    hauteur: 250,
    longeur: 6500,
    lame: 5.0,
    debordement: 0,
    refus_min: 400,
    refus_max: 1500,
    stock_physique: 18,
    quantite_reservee: 2,
    prix_unitaire: 6200,
    stock_min: 5
  },
  {
    code_art: 'ART0017',
    designation: 'CT SOMO 300 RECTANGULAIRE',
    statut: 'NORMAL',
    hauteur: 300,
    longeur: 6500,
    lame: 5.0,
    debordement: 0,
    refus_min: 400,
    refus_max: 1500,
    stock_physique: 15,
    quantite_reservee: 1,
    prix_unitaire: 7100,
    stock_min: 5
  },
  // --- SOUS-FACES (SF) ---
  {
    code_art: 'ART0020',
    designation: 'SF 200',
    statut: 'NORMAL',
    hauteur: 200,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 35,
    quantite_reservee: 4,
    prix_unitaire: 2900,
    stock_min: 8
  },
  {
    code_art: 'ART0021',
    designation: 'SF 250',
    statut: 'NORMAL',
    hauteur: 250,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 25,
    quantite_reservee: 3,
    prix_unitaire: 3400,
    stock_min: 6
  },
  {
    code_art: 'ART0022',
    designation: 'SF 300',
    statut: 'NORMAL',
    hauteur: 300,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 28,
    quantite_reservee: 3,
    prix_unitaire: 3900,
    stock_min: 6
  },
  {
    code_art: 'ART0023',
    designation: 'SF 200 7024',
    statut: 'NORMAL',
    hauteur: 200,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 20,
    quantite_reservee: 2,
    prix_unitaire: 3200,
    stock_min: 5
  },
  {
    code_art: 'ART0024',
    designation: 'SF 250 7024',
    statut: 'NORMAL',
    hauteur: 250,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 18,
    quantite_reservee: 3,
    prix_unitaire: 3700,
    stock_min: 5
  },
  {
    code_art: 'ART0025',
    designation: 'SF 300 7024',
    statut: 'NORMAL',
    hauteur: 300,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 22,
    quantite_reservee: 2,
    prix_unitaire: 4200,
    stock_min: 5
  },
  // --- AUTRES ARTICLES ---
  {
    code_art: 'ART0040',
    designation: 'TBL 43 BL',
    statut: 'NORMAL',
    hauteur: 43,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 250,
    refus_max: 1000,
    stock_physique: 120,
    quantite_reservee: 20,
    prix_unitaire: 1450,
    stock_min: 30
  },
  {
    code_art: 'ART0048',
    designation: 'TAB 55 7024',
    statut: 'NORMAL',
    hauteur: 55,
    longeur: 5770,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1100,
    stock_physique: 85,
    quantite_reservee: 12,
    prix_unitaire: 1850,
    stock_min: 20
  },
  {
    code_art: 'ART0045',
    designation: 'LAME FINALE 43',
    statut: 'NORMAL',
    hauteur: 43,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 250,
    refus_max: 1000,
    stock_physique: 45,
    quantite_reservee: 5,
    prix_unitaire: 1650,
    stock_min: 10
  },
  {
    code_art: 'ART0046',
    designation: 'LAME FINALE 55 ALU 7024',
    statut: 'NORMAL',
    hauteur: 55,
    longeur: 6000,
    lame: 4.5,
    debordement: 0,
    refus_min: 300,
    refus_max: 1100,
    stock_physique: 38,
    quantite_reservee: 4,
    prix_unitaire: 1950,
    stock_min: 10
  },
  {
    code_art: 'ART0047',
    designation: 'COULISSE 43 9007',
    statut: 'NORMAL',
    hauteur: 30,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 28,
    quantite_reservee: 4,
    prix_unitaire: 2100,
    stock_min: 8
  },
  // --- MOUSTIQUAIRES (MSTQ) ---
  {
    code_art: 'ART0051',
    designation: 'MSTQ MAILLE PLISSÉE 20mm',
    statut: 'NORMAL',
    hauteur: 20,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 200,
    refus_max: 1000,
    stock_physique: 50,
    quantite_reservee: 0,
    prix_unitaire: 1200,
    stock_min: 10
  },
  {
    code_art: 'ART0052',
    designation: 'CADRE MSTQ 7024',
    statut: 'NORMAL',
    hauteur: 20,
    longeur: 6000,
    lame: 4.0,
    debordement: -62,
    refus_min: 350,
    refus_max: 1200,
    stock_physique: 34,
    quantite_reservee: 6,
    prix_unitaire: 1950,
    stock_min: 10
  },
  {
    code_art: 'ART0053',
    designation: 'BARRE COULISSE MSTQ 7024',
    statut: 'NORMAL',
    hauteur: 14,
    longeur: 6000,
    lame: 4.0,
    debordement: -46,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 42,
    quantite_reservee: 8,
    prix_unitaire: 850,
    stock_min: 15
  },
  {
    code_art: 'ART0054',
    designation: 'BARRE INFERIEURE MSTQ 7024',
    statut: 'NORMAL',
    hauteur: 10,
    longeur: 6000,
    lame: 4.0,
    debordement: -13,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 25,
    quantite_reservee: 3,
    prix_unitaire: 650,
    stock_min: 10
  },
  {
    code_art: 'ART0060',
    designation: 'PRÉCADRE PRC 43',
    statut: 'NORMAL',
    hauteur: 43,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 45,
    quantite_reservee: 0,
    prix_unitaire: 2450,
    stock_min: 10
  },
  {
    code_art: 'ART0061',
    designation: 'PRÉCADRE PRC 55',
    statut: 'NORMAL',
    hauteur: 55,
    longeur: 6000,
    lame: 4.0,
    debordement: 0,
    refus_min: 300,
    refus_max: 1200,
    stock_physique: 38,
    quantite_reservee: 0,
    prix_unitaire: 2850,
    stock_min: 10
  },
  {
    code_art: 'ART0065',
    designation: 'BOUCHON PRECADRE 43',
    statut: 'NORMAL',
    hauteur: 43,
    longeur: 6000,
    lame: 4.0,
    debordement: -10,
    refus_min: 200,
    refus_max: 1000,
    stock_physique: 200,
    quantite_reservee: 0,
    prix_unitaire: 150,
    stock_min: 50
  },
  {
    code_art: 'ART0066',
    designation: 'BOUCHON PRECADRE 55',
    statut: 'NORMAL',
    hauteur: 55,
    longeur: 6000,
    lame: 4.0,
    debordement: -10,
    refus_min: 200,
    refus_max: 1000,
    stock_physique: 200,
    quantite_reservee: 0,
    prix_unitaire: 180,
    stock_min: 50
  }
];

export const INITIAL_CHUTES_STOCK: Record<string, ChuteItem[]> = {
  // --- CAISSONS TUNNEL (CT) ---
  'CT SOMO 25 ARRONDI': [
    { id: 'ct25-1', longueur: 2450, quantite: 2 },
    { id: 'ct25-2', longueur: 1820, quantite: 1 },
    { id: 'ct25-3', longueur: 1450, quantite: 3 },
    { id: 'ct25-4', longueur: 950, quantite: 1 }
  ],
  'CT SOMO 30 ARRONDI': [
    { id: 'ct30-1', longueur: 2200, quantite: 2 },
    { id: 'ct30-2', longueur: 1650, quantite: 1 },
    { id: 'ct30-3', longueur: 1100, quantite: 2 }
  ],
  'CT SOMO 25 FIBRAGLO': [
    { id: 'cf25-1', longueur: 2100, quantite: 1 },
    { id: 'cf25-2', longueur: 1550, quantite: 2 }
  ],
  'CT SOMO 30 FIBRAGLO': [
    { id: 'cf30-1', longueur: 2300, quantite: 1 },
    { id: 'cf30-2', longueur: 1400, quantite: 2 }
  ],
  'CT SOMO 25 NORMAL': [
    { id: 'cn25-1', longueur: 2250, quantite: 2 },
    { id: 'cn25-2', longueur: 1600, quantite: 1 }
  ],
  'CT SOMO 30 NORMAL': [
    { id: 'cn30-1', longueur: 2400, quantite: 2 },
    { id: 'cn30-2', longueur: 1350, quantite: 2 }
  ],
  'CT SOMO 250 RECTANGULAIRE': [
    { id: 'cr250-1', longueur: 2150, quantite: 1 },
    { id: 'cr250-2', longueur: 1500, quantite: 2 }
  ],
  'CT SOMO 300 RECTANGULAIRE': [
    { id: 'cr300-1', longueur: 2350, quantite: 1 },
    { id: 'cr300-2', longueur: 1450, quantite: 1 }
  ],

  // --- SOUS-FACES ALU (SF) ---
  'SF 200': [
    { id: 'sf20-1', longueur: 2100, quantite: 2 },
    { id: 'sf20-2', longueur: 1450, quantite: 1 },
    { id: 'sf20-3', longueur: 980, quantite: 2 }
  ],
  'SF 250': [
    { id: 'sf25-1', longueur: 1950, quantite: 2 },
    { id: 'sf25-2', longueur: 1400, quantite: 1 },
    { id: 'sf25-3', longueur: 1100, quantite: 3 }
  ],
  'SF 300': [
    { id: 'sf30-1', longueur: 2250, quantite: 1 },
    { id: 'sf30-2', longueur: 1600, quantite: 2 },
    { id: 'sf30-3', longueur: 850, quantite: 2 }
  ],
  'SF 200 7024': [
    { id: 'sf20g-1', longueur: 2050, quantite: 2 },
    { id: 'sf20g-2', longueur: 1350, quantite: 1 }
  ],
  'SF 250 7024': [
    { id: 'sf25g-1', longueur: 1900, quantite: 1 },
    { id: 'sf25g-2', longueur: 1420, quantite: 2 }
  ],
  'SF 300 7024': [
    { id: 'sf30g-1', longueur: 2180, quantite: 1 },
    { id: 'sf30g-2', longueur: 1550, quantite: 2 }
  ],

  // --- TABLIERS & VOLETS ---
  'TBL 43 BL': [
    { id: 'tbl43-1', longueur: 2150, quantite: 4 },
    { id: 'tbl43-2', longueur: 1780, quantite: 2 },
    { id: 'tbl43-3', longueur: 1350, quantite: 5 },
    { id: 'tbl43-4', longueur: 850, quantite: 2 }
  ],
  'TAB 55 7024': [
    { id: 'tab55-1', longueur: 2850, quantite: 1 },
    { id: 'tab55-2', longueur: 2200, quantite: 3 },
    { id: 'tab55-3', longueur: 1650, quantite: 2 }
  ],
  'LAME FINALE 43': [
    { id: 'lf43-1', longueur: 2100, quantite: 2 },
    { id: 'lf43-2', longueur: 1650, quantite: 1 }
  ],
  'LAME FINALE 55 ALU 7024': [
    { id: 'lf55-1', longueur: 2200, quantite: 1 },
    { id: 'lf55-2', longueur: 1500, quantite: 2 }
  ],
  'COULISSE 43 9007': [
    { id: 'gl43-1', longueur: 2100, quantite: 2 },
    { id: 'gl43-2', longueur: 1540, quantite: 1 },
    { id: 'gl43-3', longueur: 1200, quantite: 3 }
  ],

  // --- MOUSTIQUAIRES ---
  'CADRE MSTQ 7024': [
    { id: 'mstq-c1', longueur: 2350, quantite: 1 },
    { id: 'mstq-c2', longueur: 1680, quantite: 2 },
    { id: 'mstq-c3', longueur: 1100, quantite: 1 }
  ],
  'BARRE COULISSE MSTQ 7024': [
    { id: 'mstq-t1', longueur: 2100, quantite: 2 },
    { id: 'mstq-t2', longueur: 1450, quantite: 2 }
  ],
  'BARRE INFERIEURE MSTQ 7024': [
    { id: 'mstq-b1', longueur: 1950, quantite: 1 },
    { id: 'mstq-b2', longueur: 1350, quantite: 2 }
  ],

  // --- PRÉCADRES ---
  'PRÉCADRE PRC 43': [
    { id: 'prc43-1', longueur: 2300, quantite: 2 },
    { id: 'prc43-2', longueur: 1550, quantite: 1 },
    { id: 'prc43-3', longueur: 1150, quantite: 3 }
  ],
  'PRÉCADRE PRC 55': [
    { id: 'prc55-1', longueur: 2450, quantite: 1 },
    { id: 'prc55-2', longueur: 1650, quantite: 2 }
  ]
};

export const INITIAL_MAILLE_CHUTES: ChuteMaille[] = [
  { id: 'm1', dimension_fixe: 1940, plis: 57 },
  { id: 'm2', dimension_fixe: 1090, plis: 56 },
  { id: 'm3', dimension_fixe: 2150, plis: 62 },
  { id: 'm4', dimension_fixe: 1400, plis: 45 },
  { id: 'm5', dimension_fixe: 850, plis: 38 },
  { id: 'm6', dimension_fixe: 1200, plis: 50 },
  { id: 'm7', dimension_fixe: 1750, plis: 60 },
  { id: 'm8', dimension_fixe: 2250, plis: 72 }
];

export const INITIAL_MAPPING: MappingChutes = {
  // Caissons Tunnel
  ART0010: 'CT SOMO 25 ARRONDI',
  ART0011: 'CT SOMO 30 ARRONDI',
  ART0012: 'CT SOMO 25 FIBRAGLO',
  ART0013: 'CT SOMO 30 FIBRAGLO',
  ART0014: 'CT SOMO 25 NORMAL',
  ART0015: 'CT SOMO 30 NORMAL',
  ART0016: 'CT SOMO 250 RECTANGULAIRE',
  ART0017: 'CT SOMO 300 RECTANGULAIRE',

  // Sous-Faces Alu
  ART0020: 'SF 200',
  ART0021: 'SF 250',
  ART0022: 'SF 300',
  ART0023: 'SF 200 7024',
  ART0024: 'SF 250 7024',
  ART0025: 'SF 300 7024',

  // Tabliers & Volets
  ART0040: 'TBL 43 BL',
  ART0048: 'TAB 55 7024',
  ART0045: 'LAME FINALE 43',
  ART0046: 'LAME FINALE 55 ALU 7024',
  ART0047: 'COULISSE 43 9007',

  // Moustiquaires
  ART0052: 'CADRE MSTQ 7024',
  ART0053: 'BARRE COULISSE MSTQ 7024',
  ART0054: 'BARRE INFERIEURE MSTQ 7024',
  // Précadres
  ART0060: 'PRÉCADRE PRC 43',
  ART0061: 'PRÉCADRE PRC 55',
};
