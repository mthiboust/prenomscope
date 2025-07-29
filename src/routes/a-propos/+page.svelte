<script>
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>À propos - PrénomScope</title>
  <meta name="description" content="Informations sur les données des prénoms français et leur source INSEE" />
</svelte:head>

<div class="about-page">
  <div class="card">
    <h1>À propos de PrénomScope</h1>
    
    <p>
      <strong>PrénomScope</strong> est un outil d'analyse des prénoms français basé sur les données officielles de l'INSEE 
      (Institut National de la Statistique et des Études Économiques). Ce <a href="https://github.com/mthiboust/prenomscope" target="_blank" rel="noopener noreferrer">projet open source</a> rend ces données 
      publiques plus accessibles et visuelles pour tous.
    </p>

    <h2>📊 Source des données</h2>
    
    <p>
      Les données proviennent de l'<strong>INSEE</strong> (Institut National de la Statistique et des Études Économiques).
    </p>

    <p>
      Pour plus d'informations détaillées sur la méthodologie et les définitions, 
      consultez la <a href="https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113" 
       target="_blank" 
       rel="noopener noreferrer">📋 page officielle de l'INSEE</a>.
    </p>

    <h2>📈 Ce que représentent les données</h2>

    <p>
      Les statistiques présentées ici correspondent aux <strong>naissances enregistrées à l'état civil</strong> 
      en France métropolitaine et dans les départements et régions d'outre-mer (DROM). 
      Il s'agit donc du nombre de bébés ayant reçu un prénom donné lors de leur déclaration de naissance.
    </p>

    <div class="info-box">
      <h3>🔄 Évolution de la méthode de diffusion</h3>
      <p>
        À partir de cette année, la méthode de diffusion des prénoms évolue afin de fournir davantage 
        d'informations tout en respectant le secret statistique.
      </p>
      <p>
        <strong>Nouvelles données disponibles :</strong>
      </p>
      <ul>
        <li>Données régionales détaillées</li>
        <li>Liste des prénoms par sexe donnés au moins 3 fois depuis 1900</li>
      </ul>
      <p>
        <strong>Méthode de secrétisation modifiée :</strong> Les effectifs sont arrondis au multiple de 5 
        le plus proche. Les effectifs arrondis nuls ne sont pas diffusés. Les prénoms ayant les mêmes 
        effectifs arrondis sont classés suivant l'ordre alphabétique.
      </p>
    </div>

    <div class="important-note">
      <h3>⚠️ Important</h3>
      <ul>
        <li>Les fichiers recensent les <strong>naissances</strong> et non les personnes vivantes</li>
        <li>Seules les personnes nées en France métropolitaine et DROM sont incluses</li>
        <li>Les personnes nées à l'étranger sont exclues</li>
      </ul>
    </div>

    <h2>🔍 Utilisation des données</h2>

    <p>
      Ces données sont utilisées pour :
    </p>

    <ul>
      <li>L'élaboration de statistiques démographiques</li>
      <li>La participation à la fonction de veille sanitaire</li>
      <li>La mise à jour des répertoires administratifs</li>
      <li>L'analyse des tendances sociétales</li>
    </ul>


  </div>
</div>

<style>
  .about-page {
    max-width: 800px;
    margin: 0 auto;
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  }

  h1 {
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-size: 2rem;
    font-weight: 700;
  }

  h2 {
    color: #334155;
    margin: 2rem 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  h3 {
    color: #475569;
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  p {
    margin-bottom: 1rem;
    line-height: 1.7;
    color: #475569;
  }

  ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
    color: #475569;
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .info-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }

  .important-note {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1.5rem 0;
  }

  .important-note h3 {
    color: #92400e;
    margin-top: 0;
  }

  .important-note ul {
    color: #92400e;
  }

  .footer-note {
    background: #ecfdf5;
    border: 1px solid #10b981;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0 0 0;
  }

  .footer-note p {
    margin: 0;
    color: #065f46;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #64748b;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 1rem;
  }

  .btn:hover {
    background: #475569;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .btn-secondary {
    background: #64748b;
  }

  .btn-secondary:hover {
    background: #475569;
  }

  @media (max-width: 768px) {
    .card {
      padding: 1.5rem;
    }

    h1 {
      font-size: 1.75rem;
    }

    h2 {
      font-size: 1.25rem;
    }
  }
</style> 