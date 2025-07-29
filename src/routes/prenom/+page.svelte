<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getDataByName, searchNamesByPattern } from '$lib/data.js';
  import Chart from '$lib/components/Chart.svelte';

  let nameQuery = '';
  let selectedName = '';
  let groupSimilar = false; // New toggle for grouping similar names
  let selectedSex = null; // null = mixte, 1 = male, 2 = female
  let data = [];
  let suggestions = [];
  let loading = false;
  let error = null;
  let showSuggestions = false;
  let suggestionTimeout;

  $: stats = calculateStats(data);
  $: if (nameQuery || selectedName || groupSimilar || selectedSex !== null) saveState(); // Save state when relevant variables change

  // State persistence functions
  function saveState() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prenomscope-prenom-state', JSON.stringify({
        nameQuery,
        selectedName,
        groupSimilar,
        selectedSex
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
          selectedSex = state.selectedSex !== undefined ? state.selectedSex : null;
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
      
      // Filter by sex if selected
      if (selectedSex !== null) {
        data = data.filter(d => d.sexe === selectedSex);
      }
      
      selectedName = name.trim();
      saveState();
      
      if (data.length === 0) {
        const sexLabel = selectedSex === 1 ? 'masculin' : selectedSex === 2 ? 'féminin' : '';
        const sexText = sexLabel ? ` (${sexLabel})` : '';
        error = `Aucune donnée trouvée pour le prénom "${name}"${sexText}. Vérifiez l'orthographe ou essayez une variante.`;
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

  function handleSexChange() {
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

      <div class="filters-row">
        <div class="filter-group">
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

        <div class="filter-group">
          <label for="sex-filter">
            <strong>👤 Sexe</strong>
          </label>
          <select 
            id="sex-filter"
            class="select"
            bind:value={selectedSex}
            on:change={handleSexChange}
          >
            <option value={null}>👫 Mixte</option>
            <option value={1}>👦 Masculin</option>
            <option value={2}>👧 Féminin</option>
          </select>
        </div>
      </div>
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
        <h3>📊 Résumé pour "{selectedName}"</h3>
        
        <div class="stats-table">
          
          <table class="summary-table">
            <thead>
              <tr>
                <th class="row-type"></th>
                {#if selectedSex === null || selectedSex === 1}
                  <th>👦 Garçons</th>
                {/if}
                {#if selectedSex === null || selectedSex === 2}
                  <th>👧 Filles</th>
                {/if}
                {#if selectedSex === null}
                  <th>👫 Total</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="row-type">Période {stats.firstYear}-{stats.lastYear}</td>
                {#if selectedSex === null || selectedSex === 1}
                  <td>
                    <div class="number-value">{formatNumber(stats.totalMale)}</div>
                    {#if selectedSex === null}
                      <div class="percentage-value">({formatPercentage(stats.totalMale, stats.total)})</div>
                    {/if}
                  </td>
                {/if}
                {#if selectedSex === null || selectedSex === 2}
                  <td>
                    <div class="number-value">{formatNumber(stats.totalFemale)}</div>
                    {#if selectedSex === null}
                      <div class="percentage-value">({formatPercentage(stats.totalFemale, stats.total)})</div>
                    {/if}
                  </td>
                {/if}
                {#if selectedSex === null}
                  <td class="total-cell">
                    <div class="number-value">{formatNumber(stats.total)}</div>
                  </td>
                {/if}
              </tr>
              {#if stats.malePeak || stats.femalePeak}
                <tr class="peak-row">
                  <td class="row-type">Maximum annuel</td>
                  {#if selectedSex === null || selectedSex === 1}
                    <td>
                      {#if stats.malePeak}
                        <div class="number-value">{formatNumber(stats.malePeak.valeur)}</div>
                        <div class="percentage-value">in {stats.malePeak.periode}</div>
                      {/if}
                    </td>
                  {/if}
                  {#if selectedSex === null || selectedSex === 2}
                    <td>
                      {#if stats.femalePeak}
                        <div class="number-value">{formatNumber(stats.femalePeak.valeur)}</div>
                        <div class="percentage-value">in {stats.femalePeak.periode}</div>
                      {/if}
                    </td>
                  {/if}
                  {#if selectedSex === null}
                    <td></td>
                  {/if}
                </tr>
              {/if}
            </tbody>
          </table>
          

        </div>
      </div>

      <!-- Chart -->
      <div class="chart-section card">
        <h3>📈 Évolution dans le temps</h3>
        <Chart 
          data={data} 
          height={400}
        />
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

  .stats-summary h3 {
    margin: 0 0 1.5rem 0;
    color: #1e293b;
  }

  .stats-table {
    margin-top: 1.5rem;
  }

  .table-header {
    margin-bottom: 1rem;
  }

  .period-info {
    font-size: 0.875rem;
    color: #64748b;
    font-style: italic;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .summary-table th {
    background: #f8fafc;
    padding: 0.75rem;
    text-align: center;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e2e8f0;
  }

  .summary-table td {
    padding: 0.75rem;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
  }

  .summary-table .total-cell {
    font-weight: 700;
    color: #1e293b;
    background: #f0f9ff;
  }

  .summary-table .row-type {
    font-weight: 600;
    color: #374151;
    background: transparent;
    border-right: 2px solid #e2e8f0;
  }

  .summary-table .number-value {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.125rem;
  }

  .summary-table .percentage-value {
    font-size: 0.875rem;
    color: #64748b;
    font-style: italic;
  }

  .summary-table .peak-row td {
    padding: 0.75rem;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
  }





  .chart-section {
    margin-top: 2rem;
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

  .filters-row {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filter-group {
    flex: 1;
    min-width: 200px;
  }

  .filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .filter-group .select {
    width: 100%;
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