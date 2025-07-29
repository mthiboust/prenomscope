<script>
  import { onMount } from 'svelte';
  import { getDataByNames, searchNamesByPattern } from '$lib/data.js';
  import Chart from '$lib/components/Chart.svelte';

  let nameInput = '';
  let selectedNames = [];
  let groupSimilar = false; // New toggle for grouping similar names
  let selectedSex = null; // null = mixte, 1 = male, 2 = female
  let data = [];
  let suggestions = [];
  let loading = false;
  let error = null;
  let showSuggestions = false;
  let suggestionTimeout;

  $: comparisonStats = calculateComparisonStats(data);
  $: hasData = selectedNames.length > 0 && data.length > 0;
  $: if (selectedNames || groupSimilar || selectedSex !== null) saveState(); // Save state whenever relevant variables change

  // State persistence functions
  function saveState() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prenomscope-comparaison-state', JSON.stringify({
        selectedNames,
        groupSimilar,
        selectedSex
      }));
    }
  }

  function loadState() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prenomscope-comparaison-state');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          selectedNames = state.selectedNames || [];
          groupSimilar = state.groupSimilar || false;
          selectedSex = state.selectedSex !== undefined ? state.selectedSex : null;
        } catch (err) {
          console.error('Error loading saved state:', err);
        }
      }
    }
  }

  onMount(async () => {
    // Load saved state first
    loadState();
    
    // If we have saved names, load the comparison data
    if (selectedNames.length > 0) {
      await loadComparisonData();
    }
  });

  function calculateComparisonStats(data) {
    if (!data.length) return [];

    const nameStats = {};

    data.forEach(item => {
      const key = item.prenom;
      if (!nameStats[key]) {
        nameStats[key] = {
          name: item.prenom,
          totalMale: 0,
          totalFemale: 0,
          total: 0,
          years: new Set(),
          peakMale: null,
          peakFemale: null
        };
      }

      const stats = nameStats[key];
      stats.years.add(item.periode);

      if (item.sexe === 1) {
        stats.totalMale += item.valeur;
        if (!stats.peakMale || item.valeur > stats.peakMale.valeur) {
          stats.peakMale = item;
        }
      } else {
        stats.totalFemale += item.valeur;
        if (!stats.peakFemale || item.valeur > stats.peakFemale.valeur) {
          stats.peakFemale = item;
        }
      }

      stats.total = stats.totalMale + stats.totalFemale;
    });

    return Object.values(nameStats).map(stats => ({
      ...stats,
      years: stats.years.size
    }));
  }

  async function addName() {
    const name = nameInput.trim();
    if (!name) return;

    if (selectedNames.includes(name)) {
      error = `Le prénom "${name}" est déjà dans la comparaison.`;
      return;
    }

    if (selectedNames.length >= 8) {
      error = 'Vous pouvez comparer au maximum 8 prénoms.';
      return;
    }

    selectedNames = [...selectedNames, name];
    nameInput = '';
    showSuggestions = false;
    error = null;

    await loadComparisonData();
    saveState(); // Save state after adding a name
  }

  function removeName(name) {
    selectedNames = selectedNames.filter(n => n !== name);
    if (selectedNames.length > 0) {
      loadComparisonData();
    } else {
      data = [];
    }
    saveState(); // Save state after removing a name
  }

  function clearAll() {
    selectedNames = [];
    data = [];
    error = null;
    saveState(); // Save state after clearing all
  }

  async function loadComparisonData() {
    if (selectedNames.length === 0) {
      data = [];
      return;
    }

    loading = true;
    error = null;

    try {
      console.log('Loading comparison data for names:', selectedNames, 'groupSimilar:', groupSimilar, 'selectedSex:', selectedSex);
      data = await getDataByNames(selectedNames, groupSimilar);
      console.log('Loaded data:', data);
      
      // Filter by sex if selected
      if (selectedSex !== null) {
        data = data.filter(d => d.sexe === selectedSex);
        console.log('Filtered data by sex:', selectedSex, 'data length:', data.length);
      }
      
      // Check if some names have no data
      const namesWithData = [...new Set(data.map(d => d.prenom))];
      console.log('Names with data:', namesWithData);
      
      // When groupSimilar is true, we need to check differently since the data contains normalized names
      let missingNames = [];
      if (groupSimilar) {
        // For similar sound, we check if any of the input names have data
        // The data contains normalized names, so we need to check if any data was found
        if (data.length === 0) {
          missingNames = selectedNames;
        }
      } else {
        // For exact spelling, check if each input name has data
        missingNames = selectedNames.filter(name => 
          !namesWithData.some(dataName => dataName.toLowerCase() === name.toLowerCase())
        );
      }
      
      if (missingNames.length > 0) {
        const sexLabel = selectedSex === 1 ? 'masculin' : selectedSex === 2 ? 'féminin' : '';
        const sexText = sexLabel ? ` (${sexLabel})` : '';
        error = `Aucune donnée trouvée pour : ${missingNames.join(', ')}${sexText}`;
      }
    } catch (err) {
      console.error('Error loading comparison data:', err);
      error = err.message;
      data = [];
    } finally {
      loading = false;
    }
  }

  async function handleInputChange() {
    clearTimeout(suggestionTimeout);
    
    if (nameInput.length >= 2) {
      suggestionTimeout = setTimeout(async () => {
        try {
          // For autocomplete, always use individual names (not grouped)
          suggestions = await searchNamesByPattern(nameInput, null, null, 20, false);
          // Filter out already selected names
          suggestions = suggestions.filter(s => 
            !selectedNames.some(name => name.toLowerCase() === s.prenom.toLowerCase())
          );
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
    nameInput = name;
    showSuggestions = false;
    addName();
  }

  function handleGroupSimilarChange() {
    if (selectedNames.length > 0) {
      loadComparisonData();
    }
  }

  function handleSexChange() {
    if (selectedNames.length > 0) {
      loadComparisonData();
    }
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  function getNameColor(index) {
    const colors = [
      '#3b82f6', '#ec4899', '#10b981', '#f59e0b',
      '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'
    ];
    return colors[index % colors.length];
  }
</script>

<svelte:head>
  <title>Comparaison de prénoms - PrénomScope</title>
</svelte:head>

<div class="page">

  <div class="add-name-section card">
    <div class="add-name-container">
      <label for="name-input">
        <strong>➕ Ajouter un prénom à la comparaison</strong>
      </label>
      
      <div class="input-container">
        <input
          id="name-input"
          type="text"
          class="input"
          placeholder="Tapez un prénom..."
          bind:value={nameInput}
          on:input={handleInputChange}
          on:keydown={(e) => e.key === 'Enter' && addName()}
        />
        
        <button class="btn" on:click={addName} disabled={!nameInput.trim()}>
          Ajouter
        </button>
      </div>

      <div class="filters-row">
        <div class="filter-group">
          <label for="group-similar-comparaison">
            <strong>🔗 Variantes</strong>
          </label>
          <select 
            id="group-similar-comparaison"
            class="select"
            bind:value={groupSimilar}
            on:change={handleGroupSimilarChange}
          >
            <option value={false}>Orthographe exacte</option>
            <option value={true}>Sonorité similaire</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="sex-filter-comparaison">
            <strong>👤 Sexe</strong>
          </label>
          <select 
            id="sex-filter-comparaison"
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

    {#if selectedNames.length > 0}
      <div class="selected-names">
        <div class="selected-names-header">
          <strong>Prénoms sélectionnés ({selectedNames.length}/8) :</strong>
          <button class="btn btn-secondary" on:click={clearAll}>
            🗑️ Tout effacer
          </button>
        </div>
        
        <div class="name-tags">
          {#each selectedNames as name, index}
            <div class="name-tag" style="border-color: {getNameColor(index)}">
              <span class="name-tag-color" style="background-color: {getNameColor(index)}"></span>
              <span class="name-tag-text">{name}</span>
              <button class="name-tag-remove" on:click={() => removeName(name)}>
                ✕
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="error">
      <strong>Attention :</strong> {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading card">
      <div class="spinner"></div>
      Chargement des données de comparaison...
    </div>
  {:else if hasData}
    <div class="results">
      <!-- Summary Statistics -->
      <div class="comparison-summary card">
        <h2>📊 Résumé de la comparaison</h2>
        
        <div class="summary-table-container">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Prénom</th>
                <th>Total naissances</th>
                <th>Masculin</th>
                <th>Féminin</th>
                <th>Années de données</th>
                <th>Pic masculin</th>
                <th>Pic féminin</th>
              </tr>
            </thead>
            <tbody>
              {#each comparisonStats.sort((a, b) => b.total - a.total) as stat, index}
                <tr>
                  <td>
                    <div class="name-cell">
                      <span class="name-color" style="background-color: {getNameColor(selectedNames.indexOf(stat.name))}"></span>
                      <strong>{stat.name}</strong>
                    </div>
                  </td>
                  <td class="number">{formatNumber(stat.total)}</td>
                  <td class="number">{formatNumber(stat.totalMale)}</td>
                  <td class="number">{formatNumber(stat.totalFemale)}</td>
                  <td class="number">{stat.years}</td>
                  <td class="number">
                    {#if stat.peakMale}
                      {stat.peakMale.periode} ({formatNumber(stat.peakMale.valeur)})
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class="number">
                    {#if stat.peakFemale}
                      {stat.peakFemale.periode} ({formatNumber(stat.peakFemale.valeur)})
                    {:else}
                      -
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-section card">
        <h3>📈 Évolution comparative</h3>
        <Chart 
          data={data} 
          title="Comparaison de l'évolution des prénoms"
          height={500}
        />
      </div>
    </div>
  {:else if selectedNames.length > 0}
    <div class="no-results card">
      <p>❌ Aucune donnée trouvée pour les prénoms sélectionnés.</p>
      <p>Vérifiez l'orthographe ou essayez d'autres prénoms.</p>
    </div>
  {:else}
    <div class="instructions card">
      <h3>🎯 Comment comparer des prénoms</h3>
      <ol>
        <li><strong>Ajoutez des prénoms</strong> : Tapez un prénom dans le champ ci-dessus et cliquez sur "Ajouter"</li>
        <li><strong>Utilisez les suggestions</strong> : Commencez à taper pour voir des suggestions automatiques</li>
        <li><strong>Comparez jusqu'à 8 prénoms</strong> : Visualisez leur évolution sur le même graphique</li>
        <li><strong>Analysez les tendances</strong> : Découvrez les pics de popularité et les évolutions</li>
      </ol>
      
      <div class="example-names">
        <p><strong>💡 Suggestions pour commencer :</strong></p>
        <div class="example-buttons">
          {#each ['Marie', 'Pierre', 'Camille', 'Alex', 'Mathew', 'Matthew'] as exampleName}
            <button 
              class="btn btn-secondary" 
              on:click={() => {nameInput = exampleName; addName();}}
            >
              {exampleName}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1000px;
    margin: 0 auto;
  }



  .add-name-section {
    margin-bottom: 2rem;
  }

  .add-name-container {
    position: relative;
  }

  .add-name-container label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .input-container .input {
    flex: 1;
  }

  .suggestions {
    position: absolute;
    top: calc(100% - 1rem);
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

  .selected-names {
    margin-top: 1rem;
  }

  .selected-names-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    color: #374151;
  }

  .name-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .name-tag {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 2px solid;
    border-radius: 20px;
    font-weight: 500;
  }

  .name-tag-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .name-tag-remove {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-left: 0.25rem;
    color: #64748b;
    font-weight: bold;
    transition: color 0.2s ease;
  }

  .name-tag-remove:hover {
    color: #dc2626;
  }

  .comparison-summary h2 {
    margin: 0 0 1.5rem 0;
    color: #1e293b;
  }

  .summary-table-container {
    overflow-x: auto;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
  }

  .summary-table th,
  .summary-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  .summary-table th {
    background: #f8fafc;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
  }

  .summary-table td.number {
    text-align: right;
    font-weight: 500;
  }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .name-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .chart-section h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
  }

  .instructions {
    text-align: left;
  }

  .instructions h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
  }

  .instructions ol {
    margin: 0 0 2rem 0;
    padding-left: 1.5rem;
  }

  .instructions li {
    margin-bottom: 0.5rem;
    color: #4b5563;
  }

  .example-names {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .example-names p {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .example-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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

    .selected-names-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .summary-table-container {
      font-size: 0.875rem;
    }

    .example-buttons {
      justify-content: center;
    }
  }
</style> 