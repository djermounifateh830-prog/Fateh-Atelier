# SYNTHÈSE PROJET — Refonte du système d'optimisation atelier 3M

**Date de rédaction :** 24/08/2026
**Statut :** Document vivant — audit + spécification en cours de construction
**Objectif du document :** figer par écrit tout ce qui a été compris, décidé, et tout ce qui reste à trancher, pour servir de référence unique avant le développement.

---

## 1. CONTEXTE GÉNÉRAL

L'atelier 3M Alger (joinerie aluminium, groupe Somodal/Cristal) dispose aujourd'hui d'un outil Python/Tkinter (`3M_ATELIER_MAILLE_3.py`) qui gère :
- l'optimisation de découpe de barres aluminium (1 onglet générique),
- les devis clients,
- le calcul spécifique des moustiquaires (maille, fils, profilés).

Cet outil fonctionne mais souffre de limites structurelles identifiées lors de l'audit, et surtout ne reflète pas encore la richesse des traitements métier réels (tablier, caisson, précadre, etc.). L'objectif de ce projet est de **refondre le système** pour :
1. corriger les défauts structurels identifiés,
2. intégrer fidèlement toutes les règles métier propres à chaque famille de produit,
3. donner à l'atelier un vrai choix de stratégie d'optimisation (matière vs temps),
4. supprimer la ressaisie manuelle des paramètres déjà connus (fichiers article/chutes),
5. réorganiser l'interface en un onglet dédié par famille de produit.

---

## 2. AUDIT DU CODE EXISTANT (`3M_ATELIER_MAILLE_3.py`, 1652 lignes)

### 2.1 Ce que fait le code actuellement
- **`OptimiseurDeCoupe`** (classe séparée, propre) : recycle d'abord les chutes en stock, puis génère des patrons de coupe sur barres neuves par tirage aléatoire répété (heuristique, pas de garantie d'optimalité), avec une zone de "refus" interdite entre `refus_min` et `refus_max`.
- **`Application`** (classe unique, 1400+ lignes) : contient tout le reste — 3 onglets Tkinter (Optimisation, Devis, Maille), la logique métier moustiquaire, la génération HTML d'impression, les accès Excel.

### 2.2 Anomalies confirmées, par sévérité

**BLOQUANT**
| # | Description | Localisation |
|---|---|---|
| 1 | `calculer_moustiquaire_unique` **consomme réellement une chute du stock en mémoire** (`self.mesh_stock.pop(i)`) alors qu'elle est appelée à 3 moments différents : simple clic de prévisualisation (`maille_on_select`), calcul global (`maille_calculate_all`), et impression (`imprimer_fiche_maille_groupée`). Résultat : la fiche imprimée peut afficher une chute différente de ce qui a été calculé à l'écran, le stock affiché n'est pas fiable. | lignes 1389, 1427, 1519-1526, 1626 |
| 2 | Méthodes dupliquées dans la classe `Application` — seule la dernière définition s'exécute, la première devient du code mort invisible. Cas grave : `add_chute` (2e version perd la validation `float(l) > 0`), `opt_print` (2 versions produisant des fichiers et titres différents, 73 lignes mortes). | `add_chute` 714/1012, `opt_print` 784/1048, `get_logo_html` 757/1598, `opt_add` 741/1029, `opt_edit` 747/1000, `edit_chute` 731/981 |
| 3 | Le moteur d'optimisation actuel raisonne **longueur par longueur** (`Counter` par longueur exacte dans `_trouver_patrons_stricts`), pas sur l'ensemble de la commande. Confirmé par les fiches réelles fournies (voir §5) : des barres de 5770mm coupées pour une seule pièce isolée, laissant plus de 3000mm de chute, alors que d'autres pièces isolées auraient pu être combinées dans la même barre. | `OptimiseurDeCoupe._trouver_patrons_stricts`, ligne 125-199 |

**MOYEN**
- `except: pass` généralisé (validation silencieuse, aucun message à l'opérateur en cas de saisie invalide).
- Aucune sauvegarde automatique de l'état en cours (pièces, devis, liste maille) — perte de travail si fermeture/crash.
- Pas de validation du nom de matière avant écriture Excel (nom d'onglet).
- `determiner_nb_fils` retombe silencieusement sur `n=2` par défaut si aucune valeur entre 2 et 7 ne convient — aucun avertissement affiché.
- Classe `Application` = God Object (UI + métier + export + Excel dans la même classe).
- **La comparaison de chute de maille actuelle ignore la dimension fixe** : `if c['plis'] >= nb_plis_requis` ne vérifie jamais que la largeur (ou hauteur) connue de la chute correspond à celle requise par la nouvelle pièce — **à confirmer/corriger dans la refonte**.

**MINEUR**
- Longueurs affichées dans les rapports incluent déjà la marge sans le préciser visuellement.
- `print()` de debug qui reste actif en usage normal.
- Fichiers de sortie HTML écrasés à chaque impression, aucune archive/historique.

### 2.3 Ce que confirme le fichier Excel original
`OPTIMISATION_DEVELOPPEE.xlsx` est le fichier Excel dont `calculer_moustiquaire_unique` a été traduit en Python — les formules (`IF(AND(F/n>=250, F/n<=370)...)` pour le nombre de fils, `(E/2)/25+2` pour les plis) correspondent exactement au code Python. Le moteur actuel de calcul moustiquaire est donc **fidèle à la source métier d'origine** — le problème n'est pas la formule, mais l'architecture autour (consommation de stock, absence de contrôle dimension fixe).

---

## 3. STRUCTURE DES DONNÉES RÉELLES (fichiers fournis)

### 3.1 `articles_stock.xlsx` — stock matière première (barres neuves)
Une ligne par référence article, colonnes : `code_art`, `designation`, `statut` (NORMAL/ALERTE), `hauteur`, `longeur`, `lame` (épaisseur de coupe), `debordement` (marge, souvent négative pour les MSTQ), `refus_min`, `refus_max`, `stock_physique`, `quantite_reservee`, `prix_unitaire`, `stock_min`.

➡️ **Ces paramètres existent déjà par article** et ne devraient donc **jamais être ressaisis manuellement** lors d'un calcul d'optimisation — c'est le point central de la demande du §6.2.

### 3.2 `stok_chutes.xlsx` — stock de chutes, 20 onglets = 20 matières
Un onglet par référence (`CH SF GR 30`, `CDR MST 7024`, `TBL 55`, `BAR COULIS`, `MAILLE MSTQ`, etc.), format `Longueur × Quantité`.

⚠️ **Divergence de format détectée** : l'onglet `MAILLE MSTQ` a pour colonnes `Longueur cm | × | Quantité`, où la quantité est stockée en texte avec suffixe `"P"` (ex. `"57P"` = 57 plis) — alors que le code actuel attend un fichier séparé (`Gestion_Stock_Mailles.xlsx`) avec 3 colonnes `ID/Longueur/Plis` en entier pur. **Ce mapping est à refaire entièrement dans la refonte** (voir §4.1).

### 3.3 Fiches réelles fournies (PDF)
Deux "Ordres de Fabrication" réels ont été analysés (`TAB 55 7024` — 218 barres, et `BARRE COULISSE 7024` + `CADRE MSTQ 7024`). Ils confirment concrètement la faiblesse #3 ci-dessus : présence répétée de barres neuves largement sous-utilisées en toute fin de plan de coupe (ex. 1 seule pièce de 1304mm coupée dans une barre de 5770mm, laissant 3154mm de chute), faute de recombinaison entre les restes de groupes de longueurs différentes.

---

## 4. RÈGLES MÉTIER PAR FAMILLE DE PRODUIT

### 4.1 Moustiquaire — maille (toile)
- La toile n'est **jamais** stockée en Largeur × Hauteur complètes : elle est stockée avec **une seule dimension physique connue** + **un nombre de plis** qui représente l'autre dimension.
  - Moustiquaire à ouverture **bas → haut** : Largeur connue, Hauteur remplacée par le nombre de plis.
  - Moustiquaire à ouverture **droite → gauche** : Hauteur connue, Largeur remplacée par le nombre de plis.
- Calcul du nombre de plis : `ceil(dimension_pertinente / pli_de_25mm) + 2` (marge de sécurité de 2 plis), cohérent avec `OPTIMISATION_DEVELOPPEE.xlsx`.
- **Règle de correspondance à implémenter** (absente du code actuel) : une chute de maille ne doit être proposée que si **sa dimension fixe connue correspond** à la dimension fixe requise par la nouvelle pièce, **en plus** d'avoir suffisamment de plis. Actuellement le code ne compare que les plis — c'est un trou de logique métier confirmé, à corriger.
- Cadre et coulisse de la moustiquaire : **ne relèvent pas** du moteur "maille" — ce sont des profilés alu coupés dans une barre (plusieurs petits morceaux par cadre), donc traités par le moteur de découpe 1D (comme le caisson/structure), avec leurs propres marges de débordement (`-62` pour le cadre, `-46` pour la coulisse, visibles dans `articles_stock.xlsx`).

### 4.2 Tablier roulant
- Calcul **à la commande**, pas de pièces pré-calculées en stock.
- Le client donne Hauteur + Largeur + modèle de lame (ex. lame "43" = 43mm de haut).
- `nb_lame = Hauteur / hauteur_lame` (règle d'arrondi à confirmer — cf. §7, question ouverte).
- Chaque tablier de la commande devient : **Largeur + nombre de lames** (remplace Largeur × Hauteur).
- Chaque lame physique à couper a pour longueur = **la Largeur du tablier**, répétée `nb_lame` fois.
- Toutes les lames de tous les tabliers de la commande (potentiellement largeurs différentes) sont envoyées **ensemble** dans le moteur d'optimisation 1D commun, avec le stock de chutes correspondant (`TBL 43` / `TBL 55`).
- ⚠️ Attention au **conflit de vocabulaire** : le mot "lame" désigne déjà, dans `OptimiseurDeCoupe` et dans `articles_stock.xlsx`, l'épaisseur de la scie (4 à 8mm). Il faudra bien distinguer dans le code et le nommage : `epaisseur_scie` (lame de coupe) vs `lame_tablier` (latte physique du tablier).

### 4.3 Caisson, structure, barres classiques
- Découpe 1D classique, sans transformation de dimension (pas de plis, pas de nombre de lames) — directement Largeur ou Hauteur → longueur de coupe.
- C'est la famille "de référence" pour valider le moteur de découpe 1D avant de l'appliquer aux cas particuliers (maille, tablier).

### 4.4 Précadre, sous-face, volet
- Familles mentionnées comme onglets futurs distincts — spécificités **à définir** (pas encore détaillées dans nos échanges, à faire au fur et à mesure comme pour maille/tablier).

---

## 5. MOTEUR D'OPTIMISATION 1D CIBLE (le cœur du système)

### 5.1 Deux modes de pilotage, au choix de l'atelier

**Mode "Optimisation Matière"** (existant, à corriger) :
- Objectif unique : minimiser la chute totale.
- Explore toutes les combinaisons possibles de coupes sur toutes les chutes disponibles, avant de passer aux barres neuves — sur l'ensemble de la commande, pas ligne par ligne ni longueur par longueur (correction du bug §2.2 #3).

**Mode "Optimisation Temps"** (nouveau) :
- Objectif : limiter le nombre de changements de cote sur la même barre, pour que l'opérateur machine n'ait pas à re-régler sa cote à chaque pièce.
- **Décision validée par l'atelier** : ce n'est **pas** un simple tri par mesure identique, mais un **vrai compromis chiffré** — un algorithme qui continue à limiter la chute, mais qui **pénalise fortement** (par un poids ajustable) le fait de mélanger des mesures différentes dans une même barre.
- **Dosage réglable** : le poids de pénalisation "changement de cote" doit être un paramètre ajustable (curseur ou champ), pas une constante fixe, pour permettre à l'atelier de doser lui-même l'équilibre entre gain de temps machine et perte de matière selon le contexte (urgence de commande, prix de la matière du jour, etc.).
- Ce mode doit rester **basé sur le même moteur 1D global** que le mode Matière — seule la fonction de score change (chute pure vs chute + pénalité de changement de cote).

### 5.2 Choix de l'interface
Sélecteur (checkbox ou bouton radio) **Matière / Temps** visible sur chaque onglet produit, avec le curseur de dosage disponible uniquement en mode Temps.

---

## 6. ARCHITECTURE CIBLE DE L'APPLICATION

### 6.1 Un onglet dédié par famille de produit
Confirmé par l'atelier — pas d'onglet générique "Optimisation" unique. Onglets prévus (liste ouverte, à compléter) :
- **Caisson & sous-face**
- **Volet / Tablier**
- **Précadre**
- **Moustiquaire**

Chaque onglet a son propre traitement métier en amont (calcul plis, calcul nb lames, etc.), mais tous s'appuient sur le **même moteur d'optimisation 1D commun** en arrière-plan (avec les 2 modes Matière/Temps du §5).

### 6.2 Suppression de la ressaisie manuelle des paramètres
Aujourd'hui l'atelier retape à la main Barre / Lame / Débordement / Refus min/max à chaque calcul, alors que ces informations existent déjà par article dans `articles_stock.xlsx`. Le système cible doit :
- proposer une **liste des articles existants** (au lieu d'un champ texte libre type "CT30"),
- charger **automatiquement** ses paramètres de coupe dès sélection de l'article,
- charger **automatiquement** son stock de chutes associé (depuis `stok_chutes.xlsx`, onglet correspondant),
- ne garder la saisie manuelle **que pour les quantités/mesures de la commande client**, jamais pour les paramètres matière déjà connus.

---

## 6.3 Glossaire (vocabulaire atelier → vocabulaire système)

À utiliser tel quel dans le code et toute documentation future, pour éviter les ambiguïtés déjà repérées :

| Terme atelier | Sens précis | À ne pas confondre avec |
|---|---|---|
| Lame (scie) → `epaisseur_scie` | Épaisseur de la lame de scie (4 à 8mm), consommée à chaque coupe | `lame_tablier` |
| Lame (tablier) → `lame_tablier` | Latte physique du tablier roulant (ex. 43mm ou 55mm de haut) | `epaisseur_scie` |
| Pli | Unité de mesure de la toile moustiquaire (25mm), remplace une dimension physique | `lame_tablier` |
| Chute | Reste réutilisable d'une barre déjà coupée, stocké pour réemploi futur | `Déchet` |
| Déchet / Sacrifice | Reste trop petit pour être réutilisé (en dessous de `refus_min`), perdu | `Chute` |
| Refus (min/max) | Intervalle de longueur de reste **interdit** : ni gardé comme chute utile, ni assez petit pour être un déchet négligeable — zone à éviter par l'algorithme | — |
| Débordement | Marge ajoutée à la longueur de coupe demandée (peut être négative pour MSTQ, ce qui *retire* de la longueur — cas réel observé : `-62` pour cadre MSTQ, `-46` pour barre coulisse) | Marge de sécurité des plis (`+2`) |
| Découpe 1D | Problème de découpe de barres en une seule dimension (longueur), par opposition à une découpe de panneau en 2D | — |
| Mode Matière | Stratégie d'optimisation : minimiser la chute totale | Mode Temps |
| Mode Temps | Stratégie d'optimisation : minimiser les changements de cote machine, quitte à perdre plus de matière | Mode Matière |
| Ordre de Fabrication (OF) | Document imprimé listant le plan de coupe réel à exécuter, par commande | Fiche de Coupe |

---

## 6.4 Annexe technique — extraits de code réels (ancrage vérifiable)

Cette section cite le code source exact pour que toute affirmation du document soit vérifiable ligne par ligne, sans dépendre de la mémoire d'une conversation.

**Configuration des 5 modèles de moustiquaire, telle qu'elle existe dans le code (`3M_ATELIER_MAILLE_3.py`, lignes 23-38) :**
```python
CONFIG_MAILLES = {
    "Fenetre cadre complet":         {"pli": 25, "base": "H", "diviseur_toile": 1, "nb_toiles": 1},
    "Porte fenetre cadre complet":   {"pli": 25, "base": "L", "diviseur_toile": 1, "nb_toiles": 1},
    "Centrale":                      {"pli": 25, "base": "L", "diviseur_toile": 1, "nb_toiles": 1},
    "2 ventaux":                     {"pli": 25, "base": "L", "diviseur_toile": 2, "nb_toiles": 2},
    "Porte fenetre barre inferieure":{"pli": 25, "base": "L", "diviseur_toile": 1, "nb_toiles": 1}
}

COMPOSANTS_PROFILES = {
    "Fenetre cadre complet":          {"coulisse": "L", "qty_coulisse": 1},
    "Porte fenetre cadre complet":    {"coulisse": "H", "qty_coulisse": 1},
    "Centrale":                       {"coulisse": "H", "qty_coulisse": 2},
    "2 ventaux":                      {"coulisse": "H", "qty_coulisse": 2},
    "Porte fenetre barre inferieure": {"coulisse": "H", "qty_coulisse": 1}
}
```
`base` = la dimension qui sert au calcul du nombre de plis ("H" = Hauteur, "L" = Largeur). C'est la traduction en code de la règle "ouverture bas→haut donne Largeur connue + plis" / "ouverture droite→gauche donne Hauteur connue + plis" décrite en §4.1 — **un seul de ces 5 modèles a `diviseur_toile: 2`** ("2 ventaux"), les 4 autres ont une seule toile.

**Fichiers de données actuellement codés en dur (avant refonte) :**
```python
FICHIER_STOCK_MAILLE = "Gestion_Stock_Mailles.xlsx"   # ligne 47 — à remplacer par lecture de stok_chutes.xlsx / onglet "MAILLE MSTQ"
FICHIER_STOCK        = "Gestion_Stock_Chutes.xlsx"    # ligne 66 — à remplacer par lecture directe de stok_chutes.xlsx
```

**Structure réelle des fichiers Excel fournis (vérifiée par lecture directe, pas supposée) :**

`articles_stock.xlsx` — 1 feuille `articles_stock`, 45 lignes, colonnes (A→M) :
`code_art | designation | statut | hauteur | longeur | lame | debordement | refus_min | refus_max | stock_physique | quantite_reservee | prix_unitaire | stock_min`

`stok_chutes.xlsx` — 20 feuilles, une par référence article. Format commun à toutes sauf `MAILLE MSTQ` :
```
Longueur | × | Quantité
2500     | × | 1
2260     | × | 1
```
Feuille `MAILLE MSTQ` (156 lignes), format différent :
```
Longueur cm | × | Quantité
1940        | × | 57P
1090        | × | 56P
```
La colonne quantité contient une chaîne texte avec suffixe `"P"` (nombre de plis), **pas un entier pur** — un `int(valeur)` direct provoquerait une exception `ValueError`. Le parsing cible doit faire un `strip("P")` puis `int(...)` sur cette colonne spécifiquement.

**Formules Excel d'origine retrouvées dans `OPTIMISATION_DEVELOPPEE.xlsx` (onglet `BASE DES DONNEES`), confirmant la fidélité du code Python :**
- Nombre de fils : cascade `SI(ET(F/n>=250; F/n<=370); n; ...)` testée pour n de 2 à 7 → traduite en Python par `determiner_nb_fils` (boucle `for n in range(2,8)`).
- Nombre de plis, exemple "2 ventaux" : `=(E13/2)/25+2` → traduit par `math.ceil((L/2)/25) + 2` (le `math.ceil` est un ajout du Python, absent de la formule Excel brute, jugé cohérent pour une découpe physique réelle).

---

## 6.5 Algorithme cible du moteur 1D — spécification détaillée

**Entrée commune (indépendante de Matière/Temps) :**
- Liste des pièces à couper pour **toute la commande** (pas juste une ligne) : `[(longueur_finale, quantité), ...]`, longueur déjà majorée du débordement de l'article.
- Stock de chutes disponibles pour cet article : `[(longueur_chute, quantité), ...]`.
- Paramètres article : `longueur_barre_neuve`, `epaisseur_scie`, `refus_min`, `refus_max`.
- Mode choisi : `"matiere"` ou `"temps"`, et si `"temps"` : poids de pénalité `w` (dosage réglable).

**Étape 1 — Recyclage des chutes (les deux modes) :**
Pour chaque chute disponible, chercher la meilleure combinaison de pièces restantes qui y tient (somme des longueurs + traits de scie ≤ longueur de la chute), en excluant les combinaisons qui laisseraient un reste dans l'intervalle interdit `]refus_min, refus_max[`, sauf si le reste est nul ou proche de zéro. **Contrairement au code actuel**, cette recherche doit se faire sur l'ensemble du pool de pièces restantes (toutes longueurs confondues), pas seulement sur un groupe de longueur identique.

**Étape 2 — Barres neuves, Mode Matière :**
Répéter : prendre le sous-ensemble de pièces restantes qui minimise la chute sur une barre neuve (recherche combinatoire/heuristique élargie, incluant les pièces de longueurs différentes ensemble), jusqu'à épuisement de toutes les pièces. **C'est ici que le bug §2.2 #3 doit être corrigé** : ne jamais isoler une pièce seule sur une barre neuve si une autre pièce restante, même de longueur différente, pourrait tenir avec elle sur la même barre.

**Étape 2 bis — Barres neuves, Mode Temps :**
Même logique que Mode Matière, mais la fonction de score à minimiser devient :
```
score = chute_generée + w × nb_changements_de_cote
```
où `nb_changements_de_cote` = nombre de longueurs différentes présentes sur une même barre moins 1 (une barre mono-longueur a un coût de pénalité nul). Le poids `w` est fourni par l'atelier via un curseur ou un champ numérique — **valeur par défaut à définir avec l'atelier** (question ouverte, voir §7).

**Sortie commune :** structure de résultat identique dans les deux modes (liste de barres neuves utilisées avec leur contenu, liste de chutes utilisées avec leur reste, statut `Dechet`/`STOCK`/`SACRIFICE` selon position par rapport à `refus_min`/`refus_max`), pour que l'impression (Ordre de Fabrication / Fiche de Coupe) reste inchangée quel que soit le mode.

---

## 7. QUESTIONS OUVERTES / POINTS À TRANCHER AVANT DÉVELOPPEMENT

1. **Tablier — règle d'arrondi du nombre de lames** : `Hauteur / hauteur_lame` est-il toujours arrondi au supérieur (comme les plis de maille, avec ou sans marge de sécurité additionnelle) ou existe-t-il une autre règle métier ? *(question posée, réponse en attente)*
2. **Maille — correspondance dimension fixe** : confirmer que le système doit bien rejeter une chute de maille si sa dimension fixe connue ne correspond pas à celle requise (et pas seulement le nombre de plis), avant de considérer ça comme une anomalie bloquante à corriger.
3. **Précadre / sous-face / volet** : spécificités de traitement à détailler (comme cela a été fait pour maille et tablier).
4. **Mode Temps** : la pénalité de changement de cote doit-elle être un poids additif simple dans le score (ex. `score = chute + poids × nb_changements_cote`), ou une autre forme de compromis (ex. limite dure du nombre de mesures différentes autorisées par barre, en plus du poids) ?
5. **Format cible du stock chutes maille** : le fichier `stok_chutes.xlsx` (onglet `MAILLE MSTQ`, format `Longueur cm | Quantité+suffixe P`) remplace-t-il définitivement l'ancien `Gestion_Stock_Mailles.xlsx`, ou faut-il migrer/fusionner les deux sources ?

---

## 8. PROCHAINES ÉTAPES

- [ ] Valider les questions ouvertes du §7 avec l'atelier.
- [ ] Détailler les spécificités des familles restantes (précadre, sous-face, volet) comme cela a été fait pour maille et tablier.
- [ ] Concevoir précisément l'algorithme du moteur 1D corrigé (recombinaison globale + double mode Matière/Temps avec dosage).
- [ ] Concevoir le mapping de lecture directe `articles_stock.xlsx` + `stok_chutes.xlsx` (remplaçant la ressaisie manuelle).
- [ ] Concevoir la maquette des onglets par famille de produit.
- [ ] Une fois tout validé : phase de développement (correction du moteur existant + nouvelle architecture), livraison en ZIP par lot de fichiers impactés, avec vérification systématique avant livraison — conformément à la méthode de travail déjà en place.

---

*Ce document sera mis à jour au fur et à mesure des échanges. Toute nouvelle règle métier ou décision doit y être ajoutée avant d'entamer le développement correspondant.*

---

## 9. ÉTAT DES DÉCISIONS (à lire en premier par toute IA reprenant ce projet)

Cette section distingue ce qui est **validé par l'atelier** (à respecter tel quel) de ce qui reste **une proposition de l'auditeur** (à confirmer avant de coder).

**✅ Validé par l'atelier (ne pas remettre en question sans nouvel échange) :**
- Le principe des deux modes Matière/Temps, avec le Mode Temps comme compromis chiffré (poids de pénalité), pas un simple tri — confirmé explicitement.
- Le dosage du poids de pénalité doit être réglable par l'atelier, pas figé en dur.
- La règle de stockage de la maille (dimension unique + plis selon le sens d'ouverture).
- La règle du tablier (Largeur + nombre de lames calculé à la commande, lames coupées à la Largeur, envoyées dans le moteur 1D commun).
- La liste des 4 onglets produit à créer (Caisson & sous-face, Volet/Tablier, Précadre, Moustiquaire), sans onglet générique.
- Le besoin de lire directement `articles_stock.xlsx` et `stok_chutes.xlsx` au lieu de ressaisir les paramètres.
- Le principe de recombinaison globale des pièces sur l'ensemble de la commande (pas longueur par longueur), confirmé par l'atelier sur la base des fiches réelles.

**🟡 Proposé par l'auditeur, pas encore confirmé par l'atelier :**
- La correspondance dimension fixe pour les chutes de maille (§2.2 anomalie moyenne, §7 question 2) — l'atelier n'a pas encore validé que c'est bien un manque à corriger.
- La formule exacte `score = chute + w × nb_changements_de_cote` (§6.5) — l'atelier a validé le *principe* d'un compromis chiffré, pas cette formule précise ; une variante avec limite dure du nombre de mesures par barre reste une option concurrente (question 4, §7).
- Toute règle pour Précadre, Sous-face, Volet — **non abordées à ce stade**, ne rien supposer sur leur fonctionnement.
- La règle d'arrondi exacte du nombre de lames du tablier (question 1, §7) — l'exemple donné (2500/43) n'a pas encore reçu de réponse sur l'arrondi.

**❌ Explicitement écarté :**
- Un onglet unique générique "Optimisation" pour tous les produits — l'atelier a refusé cette approche et demandé des onglets séparés par famille.
- Un Mode Temps en simple tri sans notion de score/poids — écarté au profit du compromis chiffré.

**Règle de méthode pour toute IA reprenant ce document :** ne jamais transformer une entrée "🟡 Proposé" en règle appliquée dans le code sans qu'elle soit d'abord passée en "✅ Validé" suite à une confirmation explicite de l'atelier. En cas de doute sur un point non couvert ici, poser la question plutôt que supposer — c'est la méthode de travail explicitement demandée par l'atelier depuis le début de l'audit.
