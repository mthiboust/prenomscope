// ========================================
// DATABASE CONNECTION FUNCTIONS
// ========================================

// Global variables for database connection
let db, conn;
let isInitialized = false;

/**
 * Initialize DuckDB connection
 */
export async function initDatabase() {
  if (isInitialized) return { db, conn };
  
  try {
    console.log("Initializing database connection...");
    
    // Import DuckDB module
    const duckdb = await import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29/+esm");
    
    // Choose a WebAssembly bundle
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());

    // Create the worker
    const worker = await duckdb.createWorker(bundle.mainWorker);

    // Create the database and connect it to the worker
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    conn = await db.connect();
    
    console.log("Database connection initialized");
    isInitialized = true;
    return { db, conn };
  } catch (err) {
    console.error("Error initializing database:", err);
    throw err;
  }
}

/**
 * Load and attach the Parquet file with normalized names
 */
export async function loadDatabaseFile() {
  try {
    console.log("Loading parquet file with normalized names...");
    
    const response = await fetch("./data/names_with_normalized.parquet");
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    console.log("Fetched parquet file into ArrayBuffer, size:", buffer.byteLength);

    // Register the parquet file using the ArrayBuffer
    await db.registerFileBuffer('names_with_normalized.parquet', new Uint8Array(buffer));
    console.log("Parquet file registered with DuckDB via buffer.");

    // Create a view from the parquet file
    await conn.query("CREATE VIEW prenoms AS SELECT * FROM read_parquet('names_with_normalized.parquet')");

    const debug = await conn.query(`
      SELECT COUNT(*) as total_rows FROM prenoms;
    `);
    console.log(debug.toString());
    
    console.log("Parquet file loaded successfully");
  } catch (err) {
    console.error("Error loading parquet file:", err);
    throw err;
  }
}

/**
 * Ensure database is initialized
 */
async function ensureDatabase() {
  if (!isInitialized) {
    await initDatabase();
    await loadDatabaseFile();
  }
}

/**
 * Format name for display (proper case)
 * Capitalizes first letter and letters following a dash
 */
export function formatName(name) {
  if (!name) return '';
  
  // Split by dash, capitalize each part, then join back
  return name.split('-').map(part => {
    if (!part) return part; // Handle empty parts (e.g., "Jean--Pierre")
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('-');
}

// ========================================
// DATA RETRIEVAL FUNCTIONS
// ========================================

/**
 * Get data for a specific sex and year with optional grouping
 * @param {number} sex - Sex (1 = male, 2 = female)
 * @param {number} year - The year to search in
 * @param {number} offset - Offset for pagination
 * @param {number} limit - Number of results per page
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<{data: Array, total: number}>} Array of matching records and total count
 */
export async function getDataBySexYear(sex, year, offset = 0, limit = 50, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    let groupByClause = groupSimilar ? 'prenom_normalized' : 'prenom';
    let selectClause = groupSimilar 
      ? 'prenom_normalized as prenom, SUM(valeur) as valeur, sexe, periode'
      : 'prenom, valeur, sexe, periode';
    
    // Get total count
    const countResult = await conn.query(`
      SELECT COUNT(DISTINCT ${groupByClause}) as total
      FROM prenoms
      WHERE sexe = ${sex} AND periode = ${year}
    `);
    const total = Number(countResult.toArray()[0].total);

    // Get data with pagination
    const result = await conn.query(`
      SELECT ${selectClause}
      FROM prenoms
      WHERE sexe = ${sex} AND periode = ${year}
      ${groupSimilar ? 'GROUP BY prenom_normalized, sexe, periode' : ''}
      ORDER BY valeur DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    const data = result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
    
    return { data, total };
  } catch (err) {
    console.error("Error getting data by sex and year:", err);
    throw err;
  }
}

/**
 * Get data for a specific name, sex, and year
 * @param {string} name - The name to search for
 * @param {number} sex - Sex (1 = male, 2 = female)
 * @param {number} year - The year to search in
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<Array>} Array of matching records
 */
export async function getDataByNameSexYear(name, sex, year, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    let whereClause = groupSimilar 
      ? `UPPER(prenom_normalized) = UPPER('${name.toLowerCase()}')`
      : `UPPER(prenom) = UPPER('${name}')`;
    
    const result = await conn.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM prenoms
      WHERE ${whereClause} AND sexe = ${sex} AND periode = ${year}
    `);
    
    return result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
  } catch (err) {
    console.error("Error getting data by name, sex, year:", err);
    throw err;
  }
}

/**
 * Get data for a specific name across all years and sexes
 * @param {string} name - The name to search for
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<Array>} Array of records for the name
 */
export async function getDataByName(name, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    console.log('getDataByName called with:', { name, groupSimilar });
    
    let query;
    
    if (groupSimilar) {
      // For similar sound, find all individual variants of the normalized name
      // First try to find the normalized version using SQL
      query = `
        WITH target_normalized AS (
          SELECT DISTINCT prenom_normalized
          FROM prenoms
          WHERE UPPER(prenom) = UPPER('${name}')
        )
        SELECT 
          p.prenom,
          p.valeur,
          p.sexe,
          p.periode
        FROM prenoms p
        INNER JOIN target_normalized tn ON p.prenom_normalized = tn.prenom_normalized
        ORDER BY p.prenom, p.periode ASC, p.sexe
      `;
      
      console.log('Trying to find normalized version query:', query);
      let result = await conn.query(query);
      let data = result.toArray();
      console.log('Normalized version search results:', data.length);
      
      // If no results found, try fuzzy search in normalized field
      if (data.length === 0) {
        query = `
          SELECT 
            p.prenom,
            p.valeur,
            p.sexe,
            p.periode
          FROM prenoms p
          WHERE UPPER(p.prenom_normalized) LIKE UPPER('%${name.toLowerCase()}%')
          ORDER BY p.prenom, p.periode ASC, p.sexe
          LIMIT 100
        `;
        
        console.log('Trying fuzzy normalized search query:', query);
        result = await conn.query(query);
        data = result.toArray();
        console.log('Fuzzy normalized search results:', data.length);
      }
      
      console.log('Final data for groupSimilar=true:', data);
      return data.map(row => ({
        ...row,
        prenom: formatName(row.prenom),
        valeur: Number(row.valeur),
        sexe: Number(row.sexe),
        periode: Number(row.periode)
      }));
    } else {
      // For exact spelling, use the original name
      query = `
        SELECT prenom, valeur, sexe, periode 
        FROM prenoms
        WHERE UPPER(prenom) = UPPER('${name}')
        ORDER BY periode ASC, sexe
      `;
      
      console.log('Exact spelling query:', query);
      const result = await conn.query(query);
      const data = result.toArray();
      console.log('Exact spelling results:', data.length);
      
      return data.map(row => ({
        ...row,
        prenom: formatName(row.prenom),
        valeur: Number(row.valeur),
        sexe: Number(row.sexe),
        periode: Number(row.periode)
      }));
    }
  } catch (err) {
    console.error("Error getting data by name:", err);
    throw err;
  }
}

/**
 * Get data for multiple names for comparison
 * @param {Array<string>} names - Array of names to compare
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<Array>} Array of records for all names
 */
export async function getDataByNames(names, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    let query;
    
    if (groupSimilar) {
      // For similar sound, we need to find names that match the normalized versions
      // We'll use a subquery to find the normalized versions first
      const upperNames = names.map(name => `'${name.toUpperCase()}'`);
      const namesList = upperNames.join(',');
      
      query = `
        WITH target_normalized AS (
          SELECT DISTINCT prenom_normalized
          FROM prenoms
          WHERE prenom IN (${namesList})
        )
        SELECT 
          p.prenom_normalized as prenom,
          SUM(p.valeur) as valeur,
          p.sexe,
          p.periode
        FROM prenoms p
        INNER JOIN target_normalized tn ON p.prenom_normalized = tn.prenom_normalized
        GROUP BY p.prenom_normalized, p.sexe, p.periode
        ORDER BY p.prenom_normalized, p.periode ASC, p.sexe
      `;
    } else {
      // For exact spelling, use the original names
      const upperNames = names.map(name => `'${name.toUpperCase()}'`);
      const namesList = upperNames.join(',');
      
      query = `
        SELECT prenom, valeur, sexe, periode 
        FROM prenoms
        WHERE prenom IN (${namesList})
        ORDER BY prenom, periode ASC, sexe
      `;
    }
    
    console.log('getDataByNames query:', query);
    console.log('getDataByNames names:', names);
    console.log('getDataByNames groupSimilar:', groupSimilar);
    
    const result = await conn.query(query);
    console.log('getDataByNames raw result:', result.toString());
    
    let data = result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
    
    // If grouping is enabled, get the variations for each normalized name
    if (groupSimilar) {
      // Get all variations for the normalized names we found
      const normalizedNames = [...new Set(data.map(item => item.prenom.toLowerCase()))];
      const normalizedNamesList = normalizedNames.map(name => `'${name}'`).join(',');
      
      if (normalizedNamesList) {
        const variationsData = await conn.query(`
          SELECT 
            prenom_normalized,
            prenom,
            sexe,
            COUNT(*) as count
          FROM prenoms
          WHERE prenom_normalized IN (${normalizedNamesList})
          GROUP BY prenom_normalized, prenom, sexe
          ORDER BY prenom_normalized, sexe, count DESC
        `);
        
        const variationsMap = {};
        variationsData.toArray().forEach(row => {
          const key = `${row.prenom_normalized}_${row.sexe}`;
          if (!variationsMap[key]) {
            variationsMap[key] = [];
          }
          variationsMap[key].push({
            name: row.prenom,
            count: Number(row.count)
          });
        });

        // Update the data to include variations
        data = data.map(item => {
          const key = `${item.prenom.toLowerCase()}_${item.sexe}`;
          const variations = variationsMap[key] || [];
          
          if (variations.length > 1) {
            // Sort by frequency (most popular first) and join with "/"
            const sortedVariations = variations
              .sort((a, b) => b.count - a.count)
              .map(v => formatName(v.name));
            
            return {
              ...item,
              prenom: sortedVariations.join(' / ')
            };
          } else if (variations.length === 1) {
            // If only one variation, use the original name
            return {
              ...item,
              prenom: formatName(variations[0].name)
            };
          }
          return item;
        });
      }
    }
    
    console.log('getDataByNames result:', data);
    return data;
  } catch (err) {
    console.error("Error getting data by names:", err);
    throw err;
  }
}

/**
 * Get all available years in the database
 * @returns {Promise<Array>} Array of years
 */
export async function getAvailableYears() {
  await ensureDatabase();
  
  try {
    const result = await conn.query(`
      SELECT DISTINCT periode 
      FROM prenoms
      ORDER BY periode DESC
    `);
    return result.toArray().map(row => Number(row.periode));
  } catch (err) {
    console.error("Error getting available years:", err);
    throw err;
  }
}

/**
 * Search names by pattern
 * @param {string} pattern - Pattern to search for
 * @param {number} year - Year to search in (optional)
 * @param {number} sex - Sex filter (optional)
 * @param {number} limit - Maximum number of results
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<Array>} Array of matching names
 */
export async function searchNamesByPattern(pattern, year = null, sex = null, limit = 20, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    let groupByClause = groupSimilar ? 'prenom_normalized' : 'prenom';
    let selectClause = groupSimilar 
      ? 'prenom_normalized as prenom, SUM(valeur) as total_valeur'
      : 'prenom, SUM(valeur) as total_valeur';
    
    // Normalize the pattern for similar sound search
    const normalizedPattern = groupSimilar 
      ? pattern.toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûüù]/g, 'u').replace(/[ç]/g, 'c')
      : pattern;
    
    let whereClause = groupSimilar 
      ? `UPPER(prenom_normalized) LIKE UPPER('%${normalizedPattern}%')`
      : `UPPER(prenom) LIKE UPPER('%${pattern}%')`;
    
    let query = `
      SELECT ${selectClause}
      FROM prenoms
      WHERE ${whereClause}
    `;
    
    if (year) {
      query += ` AND periode = ${year}`;
    }
    
    if (sex) {
      query += ` AND sexe = ${sex}`;
    }
    
    query += ` GROUP BY ${groupByClause} ORDER BY total_valeur DESC LIMIT ${limit}`;
    
    const result = await conn.query(query);
    let data = result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      total_valeur: Number(row.total_valeur)
    }));
    
    // If grouping is enabled, get the variations for each normalized name
    if (groupSimilar && data.length > 0) {
      const normalizedNames = [...new Set(data.map(item => item.prenom.toLowerCase()))];
      const normalizedNamesList = normalizedNames.map(name => `'${name}'`).join(',');
      
      if (normalizedNamesList) {
        const variationsData = await conn.query(`
          SELECT 
            prenom_normalized,
            prenom,
            COUNT(*) as count
          FROM prenoms
          WHERE prenom_normalized IN (${normalizedNamesList})
          GROUP BY prenom_normalized, prenom
          ORDER BY prenom_normalized, count DESC
        `);
        
        const variationsMap = {};
        variationsData.toArray().forEach(row => {
          const key = row.prenom_normalized;
          if (!variationsMap[key]) {
            variationsMap[key] = [];
          }
          variationsMap[key].push({
            name: row.prenom,
            count: Number(row.count)
          });
        });

        // Update the data to include variations
        data = data.map(item => {
          const key = item.prenom.toLowerCase();
          const variations = variationsMap[key] || [];
          
          if (variations.length > 1) {
            // Sort by frequency (most popular first) and join with "/"
            const sortedVariations = variations
              .sort((a, b) => b.count - a.count)
              .map(v => formatName(v.name));
            
            return {
              ...item,
              prenom: sortedVariations.join(' / ')
            };
          } else if (variations.length === 1) {
            // If only one variation, use the original name
            return {
              ...item,
              prenom: formatName(variations[0].name)
            };
          }
          return item;
        });
      }
    }
    
    return data;
  } catch (err) {
    console.error("Error searching names by pattern:", err);
    throw err;
  }
}

/**
 * Get data for a specific sex and year with ranking and optional grouping
 * @param {number} sex - Sex (1 = male, 2 = female)
 * @param {number} year - The year to search in
 * @param {number} offset - Offset for pagination
 * @param {number} limit - Number of results per page
 * @param {boolean} groupSimilar - Whether to group similar names
 * @returns {Promise<{data: Array, total: number}>} Array of matching records and total count
 */
export async function getDataBySexYearWithRanking(sex, year, offset = 0, limit = 50, groupSimilar = false) {
  await ensureDatabase();
  
  try {
    const previousYear = year - 1;
    const fiveYearsAgo = year - 5;
    const tenYearsAgo = year - 10;
    
    let groupByClause = groupSimilar ? 'prenom_normalized' : 'prenom';
    let selectClause = groupSimilar 
      ? 'prenom_normalized as prenom, SUM(valeur) as valeur, sexe, periode'
      : 'prenom, valeur, sexe, periode';
    
    // Get total count
    const countResult = await conn.query(`
      SELECT COUNT(DISTINCT ${groupByClause}) as total
      FROM prenoms
      WHERE sexe = ${sex} AND periode = ${year}
    `);
    const total = Number(countResult.toArray()[0].total);

    // Get current year data with ranking comparisons
    const result = await conn.query(`
      WITH current_year AS (
        SELECT 
          ${selectClause},
          ROW_NUMBER() OVER (ORDER BY ${groupSimilar ? 'SUM(valeur)' : 'valeur'} DESC) as current_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${year}
        ${groupSimilar ? `GROUP BY ${groupByClause}, sexe, periode` : ''}
      ),
      previous_year AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${groupSimilar ? 'SUM(valeur)' : 'valeur'} DESC) as previous_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${previousYear}
        ${groupSimilar ? `GROUP BY ${groupByClause}` : ''}
      ),
      five_years_ago AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${groupSimilar ? 'SUM(valeur)' : 'valeur'} DESC) as five_years_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${fiveYearsAgo}
        ${groupSimilar ? `GROUP BY ${groupByClause}` : ''}
      ),
      ten_years_ago AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${groupSimilar ? 'SUM(valeur)' : 'valeur'} DESC) as ten_years_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${tenYearsAgo}
        ${groupSimilar ? `GROUP BY ${groupByClause}` : ''}
      )
      SELECT 
        c.prenom,
        c.valeur,
        c.sexe,
        c.periode,
        c.current_rank,
        COALESCE(p.previous_rank, NULL) as previous_rank,
        COALESCE(f.five_years_rank, NULL) as five_years_rank,
        COALESCE(t.ten_years_rank, NULL) as ten_years_rank
      FROM current_year c
      LEFT JOIN previous_year p ON UPPER(c.prenom) = UPPER(p.prenom)
      LEFT JOIN five_years_ago f ON UPPER(c.prenom) = UPPER(f.prenom)
      LEFT JOIN ten_years_ago t ON UPPER(c.prenom) = UPPER(t.prenom)
      ORDER BY c.current_rank
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    let data = result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode),
      current_rank: Number(row.current_rank),
      previous_rank: row.previous_rank ? Number(row.previous_rank) : null,
      five_years_rank: row.five_years_rank ? Number(row.five_years_rank) : null,
      ten_years_rank: row.ten_years_rank ? Number(row.ten_years_rank) : null
    }));

    // If grouping is enabled, get the variations for each normalized name
    if (groupSimilar) {
      const variationsData = await conn.query(`
        SELECT 
          prenom_normalized,
          prenom,
          valeur,
          ROW_NUMBER() OVER (PARTITION BY prenom_normalized ORDER BY valeur DESC) as freq_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${year}
        ORDER BY prenom_normalized, valeur DESC
      `);
      
      const variationsMap = {};
      variationsData.toArray().forEach(row => {
        const normalized = row.prenom_normalized;
        if (!variationsMap[normalized]) {
          variationsMap[normalized] = [];
        }
        variationsMap[normalized].push({
          name: row.prenom,
          value: Number(row.valeur),
          rank: Number(row.freq_rank)
        });
      });

      // Update the data to include variations
      data = data.map(item => {
        const normalized = item.prenom.toLowerCase();
        const variations = variationsMap[normalized] || [];
        
        if (variations.length > 1) {
          // Sort by frequency (most popular first) and join with "/"
          const sortedVariations = variations
            .sort((a, b) => b.value - a.value)
            .map(v => formatName(v.name));
          
          return {
            ...item,
            prenom: sortedVariations.join(' / ')
          };
        } else if (variations.length === 1) {
          // If only one variation, use the original name
          return {
            ...item,
            prenom: formatName(variations[0].name)
          };
        }
        return item;
      });
    }
    
    return { data, total };
  } catch (err) {
    console.error("Error getting data by sex and year with ranking:", err);
    throw err;
  }
} 