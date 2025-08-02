<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let data = [];
  export let title = '';
  export let height = 400;

  let chartContainer;
  let chart;

  onMount(async () => {
    if (browser && data.length > 0) {
      await createChart();
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  $: if (browser && chart && data) {
    updateChart();
  }

  async function createChart() {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const ctx = chartContainer.getContext('2d');
    
    chart = new Chart(ctx, {
      type: 'line',
      data: getChartData(),
      options: getChartOptions()
    });
  }

  function updateChart() {
    if (!chart) return;
    
    chart.data = getChartData();
    chart.update();
  }

  function getChartData() {
    if (data.length > 0) {
      // Group data by name and sex
      const groupedData = {};
      
      data.forEach(item => {
        const key = `${item.prenom} (${item.sexe === 1 ? 'M' : 'F'})`;
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push({
          x: item.periode,
          y: item.rank
        });
      });

      // Find the year range from all data
      const allYears = data.map(item => item.periode);
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);

      // Calculate the worst ranking across all curves
      let globalMaxRank = 1;
      Object.values(groupedData).forEach(points => {
        const maxRank = Math.max(...points.map(point => point.y));
        if (maxRank > globalMaxRank) {
          globalMaxRank = maxRank;
        }
      });
      
      // Fill missing years with the global worst ranking
      Object.keys(groupedData).forEach(key => {
        const existingYears = groupedData[key].map(point => point.x);
        const missingYears = [];
        
        for (let year = minYear; year <= maxYear; year++) {
          if (!existingYears.includes(year)) {
            missingYears.push(year);
          }
        }
        
        // Add the global worst ranking for missing years
        missingYears.forEach(year => {
          groupedData[key].push({
            x: year,
            y: globalMaxRank
          });
        });
      });

      // Use the same colors as the main Chart component
      const colors = [
        'rgb(59, 130, 246)',   // blue
        'rgb(236, 72, 153)',   // pink
        'rgb(34, 197, 94)',    // green
        'rgb(234, 179, 8)',    // yellow
        'rgb(168, 85, 247)',   // purple
        'rgb(239, 68, 68)',    // red
        'rgb(20, 184, 166)',   // teal
        'rgb(245, 101, 101)',  // orange
      ];

      // Sort datasets alphabetically by label name
      const sortedEntries = Object.entries(groupedData).sort(([a], [b]) => {
        return a.localeCompare(b);
      });

      const datasets = sortedEntries.map(([name, points], index) => ({
        label: name,
        data: points.sort((a, b) => a.x - b.x),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        spanGaps: true
      }));

      return { datasets };
    }

    return { datasets: [] };
  }

  function getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: 20
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            title: function(tooltipItems) {
              return `Année ${tooltipItems[0].parsed.x}`;
            },
            label: function(context) {
              const rank = context.parsed.y;
              if (rank === null) return `${context.dataset.label}: Pas de données`;
              // For logarithmic scale, we need to ensure we get the actual rank value
              const actualRank = Math.round(rank);
              return `${context.dataset.label}: ${actualRank}${getOrdinalSuffix(actualRank)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Année',
            font: {
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          max: 2024
        },
        y: {
          type: 'logarithmic',
          reverse: true, // Invert Y-axis so lower numbers (better ranks) are at the top
          min: 1, // Always show rank 1
          title: {
            display: true,
            text: 'Classement',
            font: {
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              if (value === 0) return '';
              const rank = Math.round(value);
              return rank + getOrdinalSuffix(rank);
            }
          }
        }
      }
    };
  }

  function getOrdinalSuffix(num) {
    if (num === 1) return 'er';
    if (num === 2) return 'e';
    return 'e';
  }
</script>

<div class="chart-container" style="height: {height}px">
  <canvas bind:this={chartContainer}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
  }
</style> 