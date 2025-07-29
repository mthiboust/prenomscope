<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getDataByName, searchNamesByPattern } from '$lib/data.js';
  import Chart from '$lib/components/Chart.svelte';

  let nameQuery = '';
  let selectedName = '';
  let groupSimilar = false; // New toggle for grouping similar names
  let data = [];
  let suggestions = [];
  let loading = false;
  let error = null;
  let showSuggestions = false;
  let suggestionTimeout;

  $: stats = calculateStats(data);
  $: if (nameQuery || selectedName || groupSimilar) saveState(); // Save state when relevant variables change

  // State persistence functions
  function saveState() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prenomscope-prenom-state', JSON.stringify({
        nameQuery,
        selectedName,
        groupSimilar
      }));
    }
  }

  function loadState() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prenomscope-prenom-state');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          nameQuery = state.nameQuery || '';
          selectedName = state.selectedName || '';
          groupSimilar = state.groupSimilar || false;
        } catch (err) {
          console.error('Error loading saved state:', err);
        }
      }
    }
  }

  onMount(() => {
    // Load saved state first
    loadState();
    
    // Check if name is provided in URL query (takes precedence)
    const urlName = $page.url.searchParams.get('nom');
    if (urlName) {
      // Extract only the first name if it contains "/" (from grouped names)
      const firstName = urlName.split(' / ')[0].trim();
      nameQuery = firstName;
      selectedName = firstName;
      loadNameData(firstName);
    } else if (selectedName) {
      // If no URL param but we have saved state, load the saved name
      loadNameData(selectedName);
    }
  });

  function calculateStats(data) {
    if (!data.length) return null;

    const maleData = data.filter(d => d.sexe === 1);
    const femaleData = data.filter(d => d.sexe === 2);
    
    const totalMale = maleData.reduce((sum, d) => sum + d.valeur, 0);
    const totalFemale = femaleData.reduce((sum, d) => sum + d.valeur, 0);
    const total = totalMale + totalFemale;

    const years = [...new Set(data.map(d => d.periode))].sort();
    const firstYear = Math.min(...years);
    const lastYear = Math.max(...years);

    // Peak year for each sex
    const malePeak = maleData.length > 0 ? maleData.reduce((max, d) => d.valeur > max.valeur ? d : max) : null;
    const femalePeak = femaleData.length > 0 ? femaleData.reduce((max, d) => d.valeur > max.valeur ? d : max) : null;

    return {
      total,
      totalMale,
      totalFemale,
      years: years.length,
      firstYear,
      lastYear,
      malePeak,
      femalePeak,
      hasMale: maleData.length > 0,
      hasFemale: femaleData.length > 0
    };
  }

  async function loadNameData(name) {
    if (!name.trim()) return;
    
    loading = true;
    error = null;
    
    try {
      data = await getDataByName(name.trim(), groupSimilar);
      selectedName = name.trim();
      saveState();
      
      if (data.length === 0) {
        error = `Aucune donnée trouvée pour le prénom "${name}". Vérifiez l'orthographe ou essayez une variante.`;
      }
    } catch (err) {
      error = err.message;
      data = [];
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    if (nameQuery.trim()) {
      await loadNameData(nameQuery);
      showSuggestions = false;
    }
  }

  async function handleInputChange() {
    clearTimeout(suggestionTimeout);
    
    if (nameQuery.length >= 2) {
      suggestionTimeout = setTimeout(async () => {
        try {
          // For autocomplete, always use individual names (not grouped)
          suggestions = await searchNamesByPattern(nameQuery, null, null, 20, false);
          showSuggestions = suggestions.length > 0;
        } catch (err) {
          suggestions = [];
          showSuggestions = false;
        }
      }, 300);
    } else {
      suggestions = [];
      showSuggestions = false;
    }
  }

  function selectSuggestion(name) {
    nameQuery = name;
    loadNameData(name);
    showSuggestions = false;
  }

  function handleGroupSimilarChange() {
    if (selectedName) {
      loadNameData(selectedName);
    }
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  function formatPercentage(part, total) {
    if (total === 0) return '0%';
    return `${((part / total) * 100).toFixed(1)}%`;
  }
</script>

<svelte:head>
  <title>Détails du prénom {selectedName || ''} - PrénomScope</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>📈 Statistiques détaillées</h1>
    <p>Explorez l'évolution d'un prénom à travers les années</p>
  </header>

  <div class="search-section card">
    <div class="search-container">
      <label for="name-input">
        <strong>🔍 Rechercher un prénom</strong>
      </label>
      
      <div class="input-container">
        <input
          id="name-input"
          type="text"
          class="input"
          placeholder="Tapez un prénom (ex: Marie, Pierre...)"
          bind:value={nameQuery}
          on:input={handleInputChange}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        <button class="btn" on:click={handleSearch} disabled={!nameQuery.trim()}>
          Analyser
        </button>
      </div>

      <div class="grouping-toggle">
        <label for="group-similar-prenom">
          <strong>🔗 Variantes</strong>
        </label>
        <select 
          id="group-similar-prenom"
          class="select"
          bind:value={groupSimilar}
          on:change={handleGroupSimilarChange}
        >
          <option value={false}>Orthographe exacte</option>
          <option value={true}>Sonorité similaire</option>
        </select>
      </div>

      {#if showSuggestions && suggestions.length > 0}
        <div class="suggestions">
          {#each suggestions.slice(0, 8) as suggestion}
            <button
              class="suggestion-item"
              on:click={() => selectSuggestion(suggestion.prenom)}
            >
              <span class="suggestion-name">{suggestion.prenom}</span>
              <span class="suggestion-count">{formatNumber(suggestion.total_valeur)} naissances</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error">
      <strong>Erreur :</strong> {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading card">
      <div class="spinner"></div>
      Chargement des données pour "{nameQuery}"...
    </div>
  {:else if selectedName && stats}
    <div class="results">
      <!-- Statistics Summary -->
      <div class="stats-summary card">
        <h2>📊 Résumé pour "{selectedName}"</h2>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{formatNumber(stats.total)}</div>
            <div class="stat-label">Naissances totales</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{stats.years}</div>
            <div class="stat-label">Années de données</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">{stats.firstYear} - {stats.lastYear}</div>
            <div class="stat-label">Période</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-number">
              {stats.hasMale && stats.hasFemale ? '👫' : stats.hasMale ? '👦' : '👧'}
            </div>
            <div class="stat-label">
              {stats.hasMale && stats.hasFemale ? 'Mixte' : stats.hasMale ? 'Masculin' : 'Féminin'}
            </div>
          </div>
        </div>
      </div>

      <!-- Gender Breakdown -->
      {#if stats.hasMale && stats.hasFemale}
        <div class="gender-breakdown card">
          <h3>⚖️ Répartition par sexe</h3>
          
          <div class="gender-stats">
            <div class="gender-stat male">
              <div class="gender-icon">👦</div>
              <div class="gender-info">
                <div class="gender-count">{formatNumber(stats.totalMale)}</div>
                <div class="gender-label">Garçons ({formatPercentage(stats.totalMale, stats.total)})</div>
              </div>
            </div>
            
            <div class="gender-stat female">
              <div class="gender-icon">👧</div>
              <div class="gender-info">
                <div class="gender-count">{formatNumber(stats.totalFemale)}</div>
                <div class="gender-label">Filles ({formatPercentage(stats.totalFemale, stats.total)})</div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Peak Years -->
      <div class="peaks card">
        <h3>🏆 Années de pic</h3>
        
        <div class="peaks-grid">
          {#if stats.malePeak}
            <div class="peak-card male">
              <div class="peak-year">{stats.malePeak.periode}</div>
              <div class="peak-count">{formatNumber(stats.malePeak.valeur)} garçons</div>
              <div class="peak-label">Pic masculin</div>
            </div>
          {/if}
          
          {#if stats.femalePeak}
            <div class="peak-card female">
              <div class="peak-year">{stats.femalePeak.periode}</div>
              <div class="peak-count">{formatNumber(stats.femalePeak.valeur)} filles</div>
              <div class="peak-label">Pic féminin</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-section card">
        <h3>📈 Évolution dans le temps</h3>
        <Chart 
          data={data} 
          title="Nombre de naissances par année"
          height={400}
        />
      </div>

      <!-- Data Table -->
      <div class="data-table card">
        <h3>📋 Données détaillées</h3>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Année</th>
                <th>Sexe</th>
                <th>Naissances</th>
              </tr>
            </thead>
            <tbody>
              {#each data.sort((a, b) => b.periode - a.periode || a.sexe - b.sexe) as item}
                <tr>
                  <td>{item.periode}</td>
                  <td>{item.sexe === 1 ? '👦 Masculin' : '👧 Féminin'}</td>
                  <td class="number">{formatNumber(item.valeur)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {:else if selectedName}
    <div class="no-results card">
      <p>🔍 Aucune donnée trouvée pour le prénom "{selectedName}".</p>
      <p>Essayez une autre orthographe ou un prénom différent.</p>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem 0;
    color: #1e293b;
  }

  .page-header p {
    font-size: 1.1rem;
    color: #64748b;
    margin: 0;
  }

  .search-section {
    margin-bottom: 2rem;
  }

  .search-container label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    position: relative;
  }

  .input-container .input {
    flex: 1;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 80px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10;
    max-height: 300px;
    overflow-y: auto;
  }

  .suggestion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s ease;
    border-bottom: 1px solid #f1f5f9;
  }

  .suggestion-item:hover {
    background: #f8fafc;
  }

  .suggestion-item:last-child {
    border-bottom: none;
  }

  .suggestion-name {
    font-weight: 500;
    color: #1e293b;
  }

  .suggestion-count {
    font-size: 0.875rem;
    color: #64748b;
  }

  .stats-summary h2 {
    margin: 0 0 1.5rem 0;
    color: #1e293b;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .gender-breakdown h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
  }

  .gender-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .gender-stat {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    border: 2px solid;
  }

  .gender-stat.male {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%);
  }

  .gender-stat.female {
    border-color: #ec4899;
    background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%);
  }

  .gender-icon {
    font-size: 2rem;
  }

  .gender-count {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  .gender-label {
    font-size: 0.875rem;
    color: #64748b;
  }

  .peaks h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
  }

  .peaks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .peak-card {
    text-align: center;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid;
  }

  .peak-card.male {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%);
  }

  .peak-card.female {
    border-color: #ec4899;
    background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%);
  }

  .peak-year {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.25rem;
  }

  .peak-count {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.25rem;
  }

  .peak-label {
    font-size: 0.875rem;
    color: #64748b;
  }

  .chart-section h3,
  .data-table h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    background: #f8fafc;
    font-weight: 600;
    color: #374151;
  }

  td.number {
    text-align: right;
    font-weight: 600;
    color: #059669;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .no-results {
    text-align: center;
    color: #64748b;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }

    .input-container {
      flex-direction: column;
    }

    .suggestions {
      right: 0;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .gender-stats {
      grid-template-columns: 1fr;
    }

    .peaks-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 