<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  
  const navigation = [
    { href: base, label: 'Classements', icon: '📊' },
    { href: `${base}/prenom`, label: 'Détails d\'un prénom', icon: '📈' },
    { href: `${base}/comparaison`, label: 'Comparaison', icon: '⚖️' },
    { href: `${base}/a-propos`, label: 'À propos', icon: 'ℹ️' }
  ];

  let starCount = null;

  onMount(async () => {
    try {
      const response = await fetch('https://api.github.com/repos/mthiboust/prenomscope');
      if (response.ok) {
        const data = await response.json();
        starCount = data.stargazers_count;
        
        // Update the stars element
        const starsSmallElement = document.getElementById('github-stars-small');
        
        if (starsSmallElement) {
          starsSmallElement.textContent = `⭐ ${starCount}`;
        }
      }
    } catch (error) {
      console.error('Failed to fetch GitHub stars:', error);
    }
  });
</script>

<svelte:head>
  <meta name="description" content="Statistiques officielles des prénoms français basées sur les données INSEE. Découvrez les prénoms les plus populaires, leur évolution et analysez les tendances." />
  <meta name="keywords" content="prénoms français, statistiques prénoms, INSEE, classement prénoms, prénoms populaires, évolution prénoms, données naissances, gabriel, raphaël, louis, louise, jade, ambre" />
  <meta name="author" content="Matthieu Thiboust" />
  <meta name="copyright" content="© 2025 Matthieu Thiboust" />
  
  <!-- Additional SEO -->
  <meta name="application-name" content="PrénomScope" />
  <meta name="apple-mobile-web-app-title" content="PrénomScope" />
  <meta name="msapplication-TileColor" content="#393B45" />

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
    <div class="footer-content">
      <p class="copyright">
        © 2025 Matthieu Thiboust - Open Source project hosted on&nbsp;
        <a href="https://github.com/mthiboust/prenomscope" target="_blank" rel="noopener noreferrer" class="inline-github">
          <svg class="github-icon-small" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
          <span class="stars-small" id="github-stars-small">⭐</span>
        </a>
      </p>
    </div>
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
    max-width: 1100px;
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
    gap: 0.25rem;
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

  .footer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .copyright {
    margin: 0;
    opacity: 0.9;
    text-align: center;
  }



  .inline-github {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: white;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
  }

  .inline-github:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .github-icon-small {
    width: 16px;
    height: 16px;
  }

  .stars-small {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    opacity: 0.8;
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