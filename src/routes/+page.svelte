<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { getDataBySexYearWithRanking, getAvailableYears } from '$lib/data.js';

  let years = [];
  let selectedYear = 2024;
  let selectedSex = 1; // 1 = male, 2 = female
  let groupSimilar = false; // New toggle for grouping similar names
  let currentPage = 1;
  let itemsPerPage = 50;
  let data = [];
  let totalItems = 0;
  let loading = false;
  let error = null;
  let isInitialized = false; // Track if the component has been initialized

  $: totalPages = Math.ceil(totalItems / itemsPerPage);
  $: sexLabel = selectedSex === 1 ? 'masculins' : 'féminins';
  $: if (isInitialized && (selectedYear || selectedSex || currentPage || groupSimilar)) saveState(); // Only save after initialization
  $: if (data.length > 0 && totalItems > 0) {
    // Ensure current page is valid after data loads
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
      if (isInitialized) saveState();
    }
  }

  // State persistence functions
  function saveState() {
    if (typeof window !== 'undefined') {
      const state = {
        selectedYear,
        selectedSex,
        currentPage,
        groupSimilar
      };
      console.log('Saving state:', state);
      localStorage.setItem('prenomscope-state', JSON.stringify(state));
    }
  }

  function loadState() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prenomscope-state');
      console.log('Attempting to load state, saved data:', saved);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          console.log('Loading saved state:', state);
          selectedYear = state.selectedYear || 2024;
          selectedSex = state.selectedSex || 1;
          currentPage = state.currentPage || 1;
          groupSimilar = state.groupSimilar || false;
          console.log('State loaded - selectedYear:', selectedYear, 'selectedSex:', selectedSex, 'currentPage:', currentPage, 'groupSimilar:', groupSimilar);
        } catch (err) {
          console.error('Error loading saved state:', err);
        }
      } else {
        console.log('No saved state found, using defaults');
      }
    }
  }

  onMount(async () => {
    try {
      // Load saved state first
      loadState();
      
      years = await getAvailableYears();
      
      // Only override selectedYear if it's not in the available years
      if (!years.includes(selectedYear)) {
        selectedYear = years[0] || 2024;
        saveState(); // Save the corrected year
      }
      
      // Load data first to get total items
      await loadData();
      
      // After loading data, validate and adjust current page if needed
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
        saveState();
      }
      
      isInitialized = true; // Mark as initialized after successful mount
    } catch (err) {
      error = err.message;
      isInitialized = true; // Mark as initialized even on error
    }
  });

  async function loadData() {
    loading = true;
    error = null;
    
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const result = await getDataBySexYearWithRanking(selectedSex, selectedYear, offset, itemsPerPage, groupSimilar);
      data = result.data;
      totalItems = result.total;
    } catch (err) {
      error = err.message;
      data = [];
      totalItems = 0;
    } finally {
      loading = false;
    }
  }

  function handleYearChange() {
    currentPage = 1;
    saveState();
    loadData();
  }

  function handleSexChange() {
    currentPage = 1;
    saveState();
    loadData();
  }

  function handleGroupSimilarChange() {
    currentPage = 1;
    saveState();
    loadData();
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      saveState();
      loadData();
    }
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  }

  function getRankingDifference(item, rankField) {
    if (!item[rankField]) return null;
    
    const difference = item[rankField] - item.current_rank;
    return difference;
  }

  function formatRankingDifference(difference) {
    if (difference === null) return '-';
    if (difference === 0) return '0';
    if (difference > 0) return `+${difference}`;
    if (difference < 0) return `${difference}`;
  }

  function getRankingDifferenceClass(difference) {
    if (difference === null) return '';
    if (difference === 0) return 'no-change';
    if (difference > 0) return 'improved';
    if (difference < 0) return 'declined';
  }
</script>

<svelte:head>
  <title>Classements des prénoms - PrénomScope</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>📊 Classements des prénoms</h1>
    <p>Découvrez les prénoms les plus populaires par année et par sexe</p>
  </header>

  <div class="filters card">
    <div class="filter-group">
      <label for="year-select">
        <strong>📅 Année</strong>
      </label>
      <select 
        id="year-select"
        class="select"
        bind:value={selectedYear}
        on:change={handleYearChange}
      >
        {#each years as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label for="sex-select">
        <strong>👤 Sexe</strong>
      </label>
      <select 
        id="sex-select"
        class="select"
        bind:value={selectedSex}
        on:change={handleSexChange}
      >
        <option value={1}>👦 Prénoms masculins</option>
        <option value={2}>👧 Prénoms féminins</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="group-similar" class="checkbox-label">
        <input 
          type="checkbox" 
          id="group-similar"
          bind:checked={groupSimilar}
          on:change={handleGroupSimilarChange}
        />
        <span class="checkbox-text">
          <strong>🔗 Grouper les prénoms similaires</strong>
          <small>Combine les variantes avec/sans accents (ex: Émilie/Emilie)</small>
        </span>
      </label>
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
      Chargement des données...
    </div>
  {:else if data.length > 0}
    <div class="results">
      <div class="results-header card">
        <h2>
          Top des prénoms {sexLabel} en {selectedYear}
        </h2>
        <p>
          {formatNumber(totalItems)} prénoms au total
          • Page {currentPage} sur {totalPages}
        </p>
      </div>

      <div class="ranking card">
        <div class="ranking-header">
          <div class="header-cell">Rang</div>
          <div class="header-delta-section">
            <div class="header-main">Δ</div>
            <div class="delta-group">
              <div class="sub-header">1 an</div>
              <div class="sub-header">5 ans</div>
              <div class="sub-header">10 ans</div>
            </div>
          </div>
          <div class="header-cell">Prénom</div>
          <div class="header-cell">Naissances</div>
        </div>
        
        {#each data as item, index}
          {@const rank = (currentPage - 1) * itemsPerPage + index + 1}
          {@const rankingDiff1 = getRankingDifference(item, 'previous_rank')}
          {@const rankingDiff5 = getRankingDifference(item, 'five_years_rank')}
          {@const rankingDiff10 = getRankingDifference(item, 'ten_years_rank')}
          <div class="ranking-row" class:top-3={rank <= 3}>
            <div class="rank">
              {getRankEmoji(rank)}
            </div>
            <div class="delta-group">
              <div class="ranking-diff" class:no-change={rankingDiff1 === 0} class:improved={rankingDiff1 > 0} class:declined={rankingDiff1 < 0}>
                {formatRankingDifference(rankingDiff1)}
              </div>
              <div class="ranking-diff" class:no-change={rankingDiff5 === 0} class:improved={rankingDiff5 > 0} class:declined={rankingDiff5 < 0}>
                {formatRankingDifference(rankingDiff5)}
              </div>
              <div class="ranking-diff" class:no-change={rankingDiff10 === 0} class:improved={rankingDiff10 > 0} class:declined={rankingDiff10 < 0}>
                {formatRankingDifference(rankingDiff10)}
              </div>
            </div>
            <div class="name">
              <a href="{base}/prenom?nom={encodeURIComponent(item.prenom)}" class="name-link">
                {item.prenom}
              </a>
            </div>
            <div class="count">
              {formatNumber(item.valeur)}
            </div>
          </div>
        {/each}
      </div>

      {#if totalPages > 1}
        <div class="pagination card">
          <div class="pagination-info">
            Page {currentPage} sur {totalPages}
          </div>
          
          <div class="pagination-controls">
            <button 
              class="btn btn-secondary"
              disabled={currentPage === 1}
              on:click={() => goToPage(1)}
            >
              ⏮️ Première
            </button>
            
            <button 
              class="btn btn-secondary"
              disabled={currentPage === 1}
              on:click={() => goToPage(currentPage - 1)}
            >
              ◀️ Précédente
            </button>
            
            <span class="page-numbers">
              {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                return startPage + i;
              }).filter(page => page <= totalPages) as page}
                <button 
                  class="btn"
                  class:active={page === currentPage}
                  on:click={() => goToPage(page)}
                >
                  {page}
                </button>
              {/each}
            </span>
            
            <button 
              class="btn btn-secondary"
              disabled={currentPage === totalPages}
              on:click={() => goToPage(currentPage + 1)}
            >
              ▶️ Suivante
            </button>
            
            <button 
              class="btn btn-secondary"
              disabled={currentPage === totalPages}
              on:click={() => goToPage(totalPages)}
            >
              ⏭️ Dernière
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-results card">
      <p>Aucun résultat trouvé pour l'année {selectedYear}.</p>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 800px;
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

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  .results-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .results-header h2 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
  }

  .results-header p {
    margin: 0;
    color: #64748b;
  }

  .ranking {
    margin-bottom: 2rem;
  }

  .ranking-header {
    display: grid;
    grid-template-columns: 80px 180px 1fr 120px;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px 8px 0 0;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e2e8f0;
  }

  .ranking-row {
    display: grid;
    grid-template-columns: 80px 180px 1fr 120px;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s ease;
  }

  .header-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    padding-right: 1rem;
  }

  .header-main {
    font-size: 1.1rem;
    font-weight: 700;
    text-align: center;
  }

  .header-sub {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
  }

  .sub-header {
    font-size: 0.7rem;
    font-weight: 500;
    text-align: center;
    color: #6b7280;
  }

  .header-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delta-group {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.25rem;
    width: 100%;
  }

  .header-delta-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }

  .ranking-row:hover {
    background: #f8fafc;
  }

  .ranking-row.top-3 {
    background: linear-gradient(90deg, #fef9c3 0%, #fefce8 100%);
  }

  .ranking-row:last-child {
    border-bottom: none;
    border-radius: 0 0 8px 8px;
  }

  .rank {
    font-weight: 600;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
  }

  .name {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 2.5rem;
    line-height: 1.2;
  }

  .name-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
    text-align: center;
    word-break: break-word;
    hyphens: auto;
  }

  .name-link:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }

  .count {
    font-weight: 600;
    color: #059669;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .ranking-diff {
    font-weight: 600;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-width: 0;
  }

  .ranking-diff.improved {
    color: #059669;
  }

  .ranking-diff.declined {
    color: #dc2626;
  }

  .ranking-diff.no-change {
    color: #6b7280;
  }

  .pagination {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .pagination-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
  }

  .page-numbers {
    display: flex;
    gap: 0.25rem;
  }

  .page-numbers .btn {
    min-width: 40px;
    padding: 0.5rem;
  }

  .page-numbers .btn.active {
    background: #1e293b;
  }

  .pagination-info {
    color: #64748b;
    font-weight: 500;
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
    font-style: italic;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    color: #374151;
  }

  .checkbox-label input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: #3b82f6; /* Customize checkbox color */
  }

  .checkbox-text {
    font-size: 0.9rem;
    color: #64748b;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }

    .filters {
      grid-template-columns: 1fr;
    }

    .ranking-header,
    .ranking-row {
      grid-template-columns: 28px 140px 1fr 50px;
      gap: 0.4rem;
      padding: 0.5rem;
    }

    .header-sub {
      gap: 0.2rem;
    }

    .sub-header {
      font-size: 0.62rem;
    }

    .delta-group {
      gap: 0.2rem;
    }

    .ranking-diff {
      font-size: 0.75rem;
    }

    .name-link {
      font-size: 0.95rem;
    }

    .count {
      font-size: 0.85rem;
    }

    .rank {
      font-size: 1rem;
    }

    .pagination-controls {
      flex-direction: column;
      gap: 1rem;
    }

    .page-numbers {
      order: -1;
    }
  }

  @media (max-width: 480px) {
    .ranking-header,
    .ranking-row {
      grid-template-columns: 25px 120px 1fr 45px;
      gap: 0.3rem;
      padding: 0.4rem;
    }

    .sub-header {
      font-size: 0.58rem;
    }

    .ranking-diff {
      font-size: 0.7rem;
    }

    .name-link {
      font-size: 0.85rem;
    }

    .count {
      font-size: 0.75rem;
    }

    .rank {
      font-size: 0.9rem;
    }
  }
</style> 