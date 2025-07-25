<script>
  import { onMount } from 'svelte';
  import { getDataBySexYear, getAvailableYears } from '$lib/data.js';

  let years = [];
  let selectedYear = 2024;
  let selectedSex = 1; // 1 = male, 2 = female
  let currentPage = 1;
  let itemsPerPage = 50;
  let data = [];
  let totalItems = 0;
  let loading = false;
  let error = null;

  $: totalPages = Math.ceil(totalItems / itemsPerPage);
  $: sexLabel = selectedSex === 1 ? 'masculins' : 'féminins';

  onMount(async () => {
    try {
      years = await getAvailableYears();
      selectedYear = years[0] || 2024;
      await loadData();
    } catch (err) {
      error = err.message;
    }
  });

  async function loadData() {
    loading = true;
    error = null;
    
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const result = await getDataBySexYear(selectedSex, selectedYear, offset, itemsPerPage);
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
    loadData();
  }

  function handleSexChange() {
    currentPage = 1;
    loadData();
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
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
          <div>Rang</div>
          <div>Prénom</div>
          <div>Naissances</div>
        </div>
        
        {#each data as item, index}
          {@const rank = (currentPage - 1) * itemsPerPage + index + 1}
          <div class="ranking-row" class:top-3={rank <= 3}>
            <div class="rank">
              {getRankEmoji(rank)}
            </div>
            <div class="name">
              <a href="/prenom?nom={encodeURIComponent(item.prenom)}" class="name-link">
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
    grid-template-columns: 80px 1fr 120px;
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
    grid-template-columns: 80px 1fr 120px;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s ease;
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
  }

  .name-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
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

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }

    .filters {
      grid-template-columns: 1fr;
    }

    .ranking-header,
    .ranking-row {
      grid-template-columns: 60px 1fr 80px;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .pagination-controls {
      flex-direction: column;
      gap: 1rem;
    }

    .page-numbers {
      order: -1;
    }
  }
</style> 