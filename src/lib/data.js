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
    console.log("Loading parquet file with accent-agnostic names...");
    
    const response = await fetch("./data/names_with_variants.parquet");
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    console.log("Fetched parquet file into ArrayBuffer, size:", buffer.byteLength);

    // Register the parquet file using the ArrayBuffer
    await db.registerFileBuffer('names_with_variants.parquet', new Uint8Array(buffer));
    console.log("Parquet file registered with DuckDB via buffer.");

    // Create a view from the parquet file
    await conn.query("CREATE VIEW prenoms AS SELECT * FROM read_parquet('names_with_variants.parquet')");

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
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<{data: Array, total: number}>} Array of matching records and total count
 */
export async function getDataBySexYear(sex, year, offset = 0, limit = 50, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    let groupByClause, selectClause;
    
    switch (searchMode) {
      case 'exact':
        groupByClause = 'prenom';
        selectClause = 'prenom, valeur, sexe, periode';
        break;
      case 'accent_agnostic':
        groupByClause = 'prenom_accent_normalized';
        selectClause = 'prenom_accent_normalized as prenom, SUM(valeur) as valeur, sexe, periode';
        break;
      case 'similar':
        groupByClause = 'prenom_phonetic_normalized';
        selectClause = 'prenom_phonetic_normalized as prenom, SUM(valeur) as valeur, sexe, periode';
        break;
      default:
        groupByClause = 'prenom';
        selectClause = 'prenom, valeur, sexe, periode';
    }
    
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
      ${searchMode !== 'exact' ? `GROUP BY ${groupByClause}, sexe, periode` : ''}
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
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<Array>} Array of matching records
 */
export async function getDataByNameSexYear(name, sex, year, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    let whereClause;
    
    switch (searchMode) {
      case 'exact':
        whereClause = `UPPER(prenom) = UPPER('${name}')`;
        break;
      case 'accent_agnostic':
        whereClause = `UPPER(prenom_accent_normalized) = UPPER('${name.toLowerCase()}')`;
        break;
      case 'similar':
        whereClause = `UPPER(prenom_phonetic_normalized) = UPPER('${name.toLowerCase()}')`;
        break;
      default:
        whereClause = `UPPER(prenom) = UPPER('${name}')`;
    }
    
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
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<Array>} Array of records for the name
 */
export async function getDataByName(name, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    console.log('getDataByName called with:', { name, searchMode });
    
    let query;
    
    switch (searchMode) {
      case 'exact':
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
        
      case 'accent_agnostic':
        // For accent-agnostic, find all variants with the same accent-normalized version
        query = `
          WITH target_accent_normalized AS (
            SELECT DISTINCT prenom_accent_normalized
            FROM prenoms
            WHERE UPPER(prenom) = UPPER('${name}')
          )
          SELECT 
            p.prenom,
            p.valeur,
            p.sexe,
            p.periode
          FROM prenoms p
          INNER JOIN target_accent_normalized ta ON p.prenom_accent_normalized = ta.prenom_accent_normalized
          ORDER BY p.prenom, p.periode ASC, p.sexe
        `;
        
        console.log('Trying to find accent-normalized version query:', query);
        let accentResult = await conn.query(query);
        let accentData = accentResult.toArray();
        console.log('Accent-normalized version search results:', accentData.length);
        
        // If no results found, try fuzzy search in accent-normalized field
        if (accentData.length === 0) {
          query = `
            SELECT 
              p.prenom,
              p.valeur,
              p.sexe,
              p.periode
            FROM prenoms p
            WHERE UPPER(p.prenom_accent_normalized) LIKE UPPER('%${name.toLowerCase()}%')
            ORDER BY p.prenom, p.periode ASC, p.sexe
            LIMIT 100
          `;
          
          console.log('Trying fuzzy accent-normalized search query:', query);
          accentResult = await conn.query(query);
          accentData = accentResult.toArray();
          console.log('Fuzzy accent-normalized search results:', accentData.length);
        }
        
        console.log('Final data for accent_agnostic:', accentData);
        return accentData.map(row => ({
          ...row,
          prenom: formatName(row.prenom),
          valeur: Number(row.valeur),
          sexe: Number(row.sexe),
          periode: Number(row.periode)
        }));
        
      case 'similar':
        // For similar sound, find all individual variants of the phonetic-normalized name
        // First try to find the phonetic-normalized version using SQL
        query = `
          WITH target_phonetic_normalized AS (
            SELECT DISTINCT prenom_phonetic_normalized
            FROM prenoms
            WHERE UPPER(prenom) = UPPER('${name}')
          )
          SELECT 
            p.prenom,
            p.valeur,
            p.sexe,
            p.periode
          FROM prenoms p
          INNER JOIN target_phonetic_normalized tn ON p.prenom_phonetic_normalized = tn.prenom_phonetic_normalized
          ORDER BY p.prenom, p.periode ASC, p.sexe
        `;
        
        console.log('Trying to find phonetic-normalized version query:', query);
        let similarResult = await conn.query(query);
        let similarData = similarResult.toArray();
        console.log('Phonetic-normalized version search results:', similarData.length);
        
        // If no results found, try fuzzy search in phonetic-normalized field
        if (similarData.length === 0) {
          query = `
            SELECT 
              p.prenom,
              p.valeur,
              p.sexe,
              p.periode
            FROM prenoms p
            WHERE UPPER(p.prenom_phonetic_normalized) LIKE UPPER('%${name.toLowerCase()}%')
            ORDER BY p.prenom, p.periode ASC, p.sexe
            LIMIT 100
          `;
          
          console.log('Trying fuzzy phonetic-normalized search query:', query);
          similarResult = await conn.query(query);
          similarData = similarResult.toArray();
          console.log('Fuzzy phonetic-normalized search results:', similarData.length);
        }
        
        console.log('Final data for similar:', similarData);
        return similarData.map(row => ({
          ...row,
          prenom: formatName(row.prenom),
          valeur: Number(row.valeur),
          sexe: Number(row.sexe),
          periode: Number(row.periode)
        }));
        
      default:
        throw new Error(`Invalid search mode: ${searchMode}`);
    }
  } catch (err) {
    console.error("Error getting data by name:", err);
    throw err;
  }
}

/**
 * Get data for multiple names for comparison
 * @param {Array<string>} names - Array of names to compare
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<Array>} Array of records for all names
 */
export async function getDataByNames(names, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    let query;
    
    let upperNames, namesList;
    
    switch (searchMode) {
      case 'exact':
        // For exact spelling, use the original names
        upperNames = names.map(name => `'${name.toUpperCase()}'`);
        namesList = upperNames.join(',');
        
        query = `
          SELECT prenom, valeur, sexe, periode 
          FROM prenoms
          WHERE prenom IN (${namesList})
          ORDER BY prenom, periode ASC, sexe
        `;
        break;
        
      case 'accent_agnostic':
        // For accent-agnostic, we need to find names that match the accent-normalized versions
        upperNames = names.map(name => `'${name.toUpperCase()}'`);
        namesList = upperNames.join(',');
        
        query = `
          WITH target_accent_normalized AS (
            SELECT DISTINCT prenom_accent_normalized
            FROM prenoms
            WHERE prenom IN (${namesList})
          )
          SELECT 
            p.prenom_accent_normalized as prenom,
            SUM(p.valeur) as valeur,
            p.sexe,
            p.periode
          FROM prenoms p
          INNER JOIN target_accent_normalized ta ON p.prenom_accent_normalized = ta.prenom_accent_normalized
          GROUP BY p.prenom_accent_normalized, p.sexe, p.periode
          ORDER BY p.prenom_accent_normalized, p.periode ASC, p.sexe
        `;
        break;
        
      case 'similar':
        // For similar sound, we need to find names that match the phonetic-normalized versions
        upperNames = names.map(name => `'${name.toUpperCase()}'`);
        namesList = upperNames.join(',');
        
        query = `
          WITH target_phonetic_normalized AS (
            SELECT DISTINCT prenom_phonetic_normalized
            FROM prenoms
            WHERE prenom IN (${namesList})
          )
          SELECT 
            p.prenom_phonetic_normalized as prenom,
            SUM(p.valeur) as valeur,
            p.sexe,
            p.periode
          FROM prenoms p
          INNER JOIN target_phonetic_normalized tn ON p.prenom_phonetic_normalized = tn.prenom_phonetic_normalized
          GROUP BY p.prenom_phonetic_normalized, p.sexe, p.periode
          ORDER BY p.prenom_phonetic_normalized, p.periode ASC, p.sexe
        `;
        break;
        
      default:
        throw new Error(`Invalid search mode: ${searchMode}`);
    }
    
    console.log('getDataByNames query:', query);
    console.log('getDataByNames names:', names);
    console.log('getDataByNames searchMode:', searchMode);
    
    const result = await conn.query(query);
    console.log('getDataByNames raw result:', result.toString());
    
    let data = result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
    
    // If grouping is enabled, get the variations for each grouped name
    if (searchMode !== 'exact') {
      const groupedNames = [...new Set(data.map(item => item.prenom.toLowerCase()))];
      const groupedNamesList = groupedNames.map(name => `'${name}'`).join(',');
      
      if (groupedNamesList) {
        const columnName = searchMode === 'accent_agnostic' ? 'prenom_accent_normalized' : 'prenom_phonetic_normalized';
        
        const variationsData = await conn.query(`
          SELECT 
            ${columnName},
            prenom,
            sexe,
            COUNT(*) as count
          FROM prenoms
          WHERE ${columnName} IN (${groupedNamesList})
          GROUP BY ${columnName}, prenom, sexe
          ORDER BY ${columnName}, sexe, count DESC
        `);
        
        const variationsMap = {};
        variationsData.toArray().forEach(row => {
          const key = `${row[columnName]}_${row.sexe}`;
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
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<Array>} Array of matching names
 */
export async function searchNamesByPattern(pattern, year = null, sex = null, limit = 20, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    let groupByClause, selectClause, whereClause;
    
    switch (searchMode) {
      case 'exact':
        groupByClause = 'prenom';
        selectClause = 'prenom, SUM(valeur) as total_valeur';
        whereClause = `UPPER(prenom) LIKE UPPER('%${pattern}%')`;
        break;
        
      case 'accent_agnostic':
        groupByClause = 'prenom_accent_normalized';
        selectClause = 'prenom_accent_normalized as prenom, SUM(valeur) as total_valeur';
        // Normalize the pattern for accent-normalized search
        const accentNormalizedPattern = pattern.toLowerCase()
          .replace(/[éèêë]/g, 'e')
          .replace(/[àâä]/g, 'a')
          .replace(/[îï]/g, 'i')
          .replace(/[ôö]/g, 'o')
          .replace(/[ûüù]/g, 'u')
          .replace(/[ç]/g, 'c');
        whereClause = `UPPER(prenom_accent_normalized) LIKE UPPER('%${accentNormalizedPattern}%')`;
        break;
        
      case 'similar':
        groupByClause = 'prenom_phonetic_normalized';
        selectClause = 'prenom_phonetic_normalized as prenom, SUM(valeur) as total_valeur';
        // Normalize the pattern for phonetic-normalized search
        const phoneticNormalizedPattern = pattern.toLowerCase()
          .replace(/[éèêë]/g, 'e')
          .replace(/[àâä]/g, 'a')
          .replace(/[îï]/g, 'i')
          .replace(/[ôö]/g, 'o')
          .replace(/[ûüù]/g, 'u')
          .replace(/[ç]/g, 'c');
        whereClause = `UPPER(prenom_phonetic_normalized) LIKE UPPER('%${phoneticNormalizedPattern}%')`;
        break;
        
      default:
        throw new Error(`Invalid search mode: ${searchMode}`);
    }
    
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
    
    // If grouping is enabled, get the variations for each grouped name
    if (searchMode !== 'exact' && data.length > 0) {
      const groupedNames = [...new Set(data.map(item => item.prenom.toLowerCase()))];
      const groupedNamesList = groupedNames.map(name => `'${name}'`).join(',');
      
      if (groupedNamesList) {
        const columnName = searchMode === 'accent_agnostic' ? 'prenom_accent_normalized' : 'prenom_phonetic_normalized';
        
        const variationsData = await conn.query(`
          SELECT 
            ${columnName},
            prenom,
            COUNT(*) as count
          FROM prenoms
          WHERE ${columnName} IN (${groupedNamesList})
          GROUP BY ${columnName}, prenom
          ORDER BY ${columnName}, count DESC
        `);
        
        const variationsMap = {};
        variationsData.toArray().forEach(row => {
          const key = row[columnName];
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
 * @param {string} searchMode - Search mode: 'exact', 'accent_agnostic', or 'similar'
 * @returns {Promise<{data: Array, total: number}>} Array of matching records and total count
 */
export async function getDataBySexYearWithRanking(sex, year, offset = 0, limit = 50, searchMode = 'exact') {
  await ensureDatabase();
  
  try {
    const previousYear = year - 1;
    const fiveYearsAgo = year - 5;
    const tenYearsAgo = year - 10;
    
    let groupByClause, selectClause;
    
    switch (searchMode) {
      case 'exact':
        groupByClause = 'prenom';
        selectClause = 'prenom, valeur, sexe, periode';
        break;
      case 'accent_agnostic':
        groupByClause = 'prenom_accent_normalized';
        selectClause = 'prenom_accent_normalized as prenom, SUM(valeur) as valeur, sexe, periode';
        break;
      case 'similar':
        groupByClause = 'prenom_phonetic_normalized';
        selectClause = 'prenom_phonetic_normalized as prenom, SUM(valeur) as valeur, sexe, periode';
        break;
      default:
        groupByClause = 'prenom';
        selectClause = 'prenom, valeur, sexe, periode';
    }
    
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
          ROW_NUMBER() OVER (ORDER BY ${searchMode !== 'exact' ? 'SUM(valeur)' : 'valeur'} DESC) as current_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${year}
        ${searchMode !== 'exact' ? `GROUP BY ${groupByClause}, sexe, periode` : ''}
      ),
      previous_year AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${searchMode !== 'exact' ? 'SUM(valeur)' : 'valeur'} DESC) as previous_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${previousYear}
        ${searchMode !== 'exact' ? `GROUP BY ${groupByClause}` : ''}
      ),
      five_years_ago AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${searchMode !== 'exact' ? 'SUM(valeur)' : 'valeur'} DESC) as five_years_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${fiveYearsAgo}
        ${searchMode !== 'exact' ? `GROUP BY ${groupByClause}` : ''}
      ),
      ten_years_ago AS (
        SELECT 
          ${groupByClause} as prenom,
          ROW_NUMBER() OVER (ORDER BY ${searchMode !== 'exact' ? 'SUM(valeur)' : 'valeur'} DESC) as ten_years_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${tenYearsAgo}
        ${searchMode !== 'exact' ? `GROUP BY ${groupByClause}` : ''}
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

    // If grouping is enabled, get the variations for each grouped name
    if (searchMode !== 'exact') {
      const columnName = searchMode === 'accent_agnostic' ? 'prenom_accent_normalized' : 'prenom_phonetic_normalized';
      
      const variationsData = await conn.query(`
        SELECT 
          ${columnName},
          prenom,
          valeur,
          ROW_NUMBER() OVER (PARTITION BY ${columnName} ORDER BY valeur DESC) as freq_rank
        FROM prenoms
        WHERE sexe = ${sex} AND periode = ${year}
        ORDER BY ${columnName}, valeur DESC
      `);
      
      const variationsMap = {};
      variationsData.toArray().forEach(row => {
        const grouped = row[columnName];
        if (!variationsMap[grouped]) {
          variationsMap[grouped] = [];
        }
        variationsMap[grouped].push({
          name: row.prenom,
          value: Number(row.valeur),
          rank: Number(row.freq_rank)
        });
      });

      // Update the data to include variations
      data = data.map(item => {
        const grouped = item.prenom.toLowerCase();
        const variations = variationsMap[grouped] || [];
        
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