# 🎯 PrénomScope

Une application web moderne pour explorer les statistiques des prénoms français basées sur les données de l'INSEE.

## ✨ Fonctionnalités

- **📊 Classements** : Découvrez les prénoms les plus populaires par année et par sexe avec pagination
- **📈 Détails d'un prénom** : Analysez l'évolution d'un prénom spécifique avec des graphiques interactifs
- **⚖️ Comparaison** : Comparez jusqu'à 8 prénoms côte à côte sur le même graphique

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ 
- npm ou yarn

### Installation

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur de développement :
```bash
npm run dev
```

3. Ouvrez votre navigateur sur `http://localhost:5173`

### Build pour la production

```bash
npm run build
```

Le site sera généré dans le dossier `build/`.

## 🗂️ Structure du projet

```
src/
├── lib/
│   ├── components/
│   │   └── Chart.svelte          # Composant de graphiques
│   └── data.js                   # Fonctions d'accès aux données
├── routes/
│   ├── +layout.svelte            # Layout principal avec navigation
│   ├── +page.svelte              # Page classements (accueil)
│   ├── prenom/
│   │   └── +page.svelte          # Page détails d'un prénom
│   └── comparaison/
│       └── +page.svelte          # Page de comparaison
└── app.html                      # Template HTML principal

static/
└── data/
    └── clean.duckdb              # Base de données DuckDB
```

## 🛠️ Technologies utilisées

- **SvelteKit** : Framework web moderne et performant
- **DuckDB WASM** : Base de données in-browser pour les données INSEE
- **Chart.js** : Bibliothèque de graphiques interactifs
- **CSS moderne** : Design responsive avec animations

## 📊 Source des données

Les données proviennent de l'**INSEE** (Institut National de la Statistique et des Études Économiques) et contiennent les statistiques officielles des prénoms français.

## 🎨 Fonctionnalités détaillées

### Page Classements
- Sélection d'année (1900-2024)
- Choix du sexe (masculin/féminin)
- Pagination avec 50 résultats par page
- Liens directs vers le détail de chaque prénom

### Page Détails
- Recherche avec suggestions automatiques
- Statistiques complètes (total, répartition par sexe, années de pic)
- Graphique d'évolution temporelle
- Tableau détaillé des données

### Page Comparaison
- Ajout de jusqu'à 8 prénoms
- Suggestions intelligentes
- Graphique de comparaison multi-courbes
- Tableau récapitulatif des statistiques

## 🔧 Développement

Pour modifier l'application :

1. Les composants Svelte sont dans `src/routes/` et `src/lib/components/`
2. Les fonctions de données sont dans `src/lib/data.js`
3. Les styles globaux sont dans `src/routes/+layout.svelte`

Le hot reload est activé en mode développement pour une expérience fluide.

---

*Développé avec ❤️ pour explorer la richesse des prénoms français* 