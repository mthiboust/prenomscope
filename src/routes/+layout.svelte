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
      <div class="nav-brand">
        <h1>🎯 PrénomScope</h1>
        <p>Statistiques des prénoms français - Données INSEE</p>
      </div>
      
      <ul class="nav-links">
        {#each navigation as item}
          <li>
            <a 
              href={item.href}
              class:active={$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== base)}
            >
              <span class="icon">{item.icon}</span>
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  nav {
    max-width: 1200px;
    margin: 0 auto;
  }

  .nav-brand h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
  }

  .nav-brand p {
    margin: 0 0 1.5rem 0;
    opacity: 0.9;
    font-size: 1.1rem;
  }

  .nav-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .nav-links a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .nav-links a:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .nav-links a.active {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 1.2rem;
  }

  main {
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
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

    .nav-brand h1 {
      font-size: 1.5rem;
    }

    .nav-brand p {
      font-size: 1rem;
    }

    .nav-links {
      justify-content: center;
    }

    .nav-links a {
      padding: 0.5rem 1rem;
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

  /* Grouping toggle styles */
  :global(.grouping-toggle) {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  :global(.checkbox-label) {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #374151;
    line-height: 1.4;
  }

  :global(.checkbox-label input[type="checkbox"]) {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: #3b82f6;
    margin-top: 0.125rem;
    flex-shrink: 0;
  }

  :global(.checkbox-text) {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  :global(.checkbox-text strong) {
    color: #1f2937;
    font-weight: 600;
  }

  :global(.checkbox-text small) {
    color: #6b7280;
    font-size: 0.8rem;
    line-height: 1.3;
  }
</style> 