<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  
  const navigation = [
    { href: base, label: 'Classements', icon: '📊' },
    { href: `${base}/prenom`, label: 'Détails d\'un prénom', icon: '📈' },
    { href: `${base}/comparaison`, label: 'Comparaison', icon: '⚖️' }
  ];
</script>

<svelte:head>
  <meta name="description" content="Analyse des prénoms français basée sur les données INSEE" />
</svelte:head>

<div class="app">
  <header>
    <nav>
      <div class="nav-content">
        <div class="nav-brand">
          <h1>👶 PrénomScope</h1>
          <p>Statistiques des prénoms français - Données INSEE</p>
        </div>
        
        <ul class="nav-links">
          {#each navigation as item}
            <li>
              <a 
                href={item.href}
                class:active={item.href === base ? ($page.url.pathname.replace(/\/$/, '') === base) : ($page.url.pathname === item.href || $page.url.pathname.startsWith(item.href))}
              >
                <span class="icon">{item.icon}</span>
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </nav>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <p>
      Données issues de l'<strong>INSEE</strong> (Institut National de la Statistique et des Études Économiques)
    </p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #f8fafc;
    color: #334155;
    line-height: 1.6;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    background: #475569;
    color: white;
    padding: 1.5rem 2rem;
  }

  nav {
    max-width: 1000px;
    margin: 0 auto;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .nav-brand h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .nav-brand p {
    margin: 0;
    opacity: 0.9;
    font-size: 1rem;
  }

  .nav-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .nav-links a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease;
    font-weight: 500;
    background: transparent;
  }

  .nav-links a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-links a.active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 1.2rem;
  }

  main {
    flex: 1;
    max-width: 1000px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
    width: 100%;
  }

  footer {
    background: #475569;
    color: white;
    text-align: center;
    padding: 1.5rem;
    margin-top: auto;
  }

  footer p {
    margin: 0;
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    header {
      padding: 1rem;
    }

    .nav-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .nav-brand h1 {
      font-size: 1.5rem;
    }

    .nav-brand p {
      font-size: 0.9rem;
    }

    .nav-links {
      justify-content: flex-start;
      width: 100%;
    }

    .nav-links a {
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
    }

    main {
      padding: 1rem;
    }
  }

  /* Global utility classes */
  :global(.card) {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  }

  :global(.btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.btn:hover) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  :global(.btn:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  :global(.btn-secondary) {
    background: #64748b;
  }

  :global(.btn-secondary:hover) {
    background: #475569;
  }

  :global(.input) {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  :global(.input:focus) {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  :global(.select) {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    cursor: pointer;
  }

  :global(.loading) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #64748b;
    font-style: italic;
  }

  :global(.error) {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }

  /* Grouping toggle styles for other pages */
  :global(.grouping-toggle) {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

</style> 