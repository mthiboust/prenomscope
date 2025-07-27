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
 * Load and attach the Parquet file
 */
export async function loadDatabaseFile() {
  try {
    console.log("Loading parquet file...");
    
    const response = await fetch("./data/names.parquet");
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    console.log("Fetched parquet file into ArrayBuffer, size:", buffer.byteLength);

    // Register the parquet file using the ArrayBuffer
    await db.registerFileBuffer('names.parquet', new Uint8Array(buffer));
    console.log("Parquet file registered with DuckDB via buffer.");

    // Create a view from the parquet file
    await conn.query("CREATE VIEW prenoms AS SELECT * FROM read_parquet('names.parquet')");

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
 */
export function formatName(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// ========================================
// DATA RETRIEVAL FUNCTIONS
// ========================================

/**
 * Get data for a specific sex and year
 * @param {number} sex - Sex (1 = male, 2 = female)
 * @param {number} year - The year to search in
 * @param {number} offset - Offset for pagination
 * @param {number} limit - Number of results per page
 * @returns {Promise<{data: Array, total: number}>} Array of matching records and total count
 */
export async function getDataBySexYear(sex, year, offset = 0, limit = 50) {
  await ensureDatabase();
  
  try {
    // Get total count
    const countResult = await conn.query(`
      SELECT COUNT(*) as total
      FROM prenoms
      WHERE sexe = ${sex} AND periode = ${year}
    `);
    const total = Number(countResult.toArray()[0].total);

    // Get data with pagination
    const result = await conn.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM prenoms
      WHERE sexe = ${sex} AND periode = ${year}
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
 * @returns {Promise<Array>} Array of matching records
 */
export async function getDataByNameSexYear(name, sex, year) {
  await ensureDatabase();
  
  try {
    const result = await conn.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM prenoms
      WHERE UPPER(prenom) = UPPER('${name}') AND sexe = ${sex} AND periode = ${year}
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
 * @returns {Promise<Array>} Array of records for the name
 */
export async function getDataByName(name) {
  await ensureDatabase();
  
  try {
    const result = await conn.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM prenoms
      WHERE UPPER(prenom) = UPPER('${name}')
      ORDER BY periode ASC, sexe
    `);
    
    return result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
  } catch (err) {
    console.error("Error getting data by name:", err);
    throw err;
  }
}

/**
 * Get data for multiple names for comparison
 * @param {Array<string>} names - Array of names to compare
 * @returns {Promise<Array>} Array of records for all names
 */
export async function getDataByNames(names) {
  await ensureDatabase();
  
  try {
    const namesList = names.map(name => `'${name.toUpperCase()}'`).join(',');
    const result = await conn.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM prenoms
      WHERE UPPER(prenom) IN (${namesList})
      ORDER BY prenom, periode ASC, sexe
    `);
    
    return result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      valeur: Number(row.valeur),
      sexe: Number(row.sexe),
      periode: Number(row.periode)
    }));
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
 * @returns {Promise<Array>} Array of matching names
 */
export async function searchNamesByPattern(pattern, year = null, sex = null, limit = 20) {
  await ensureDatabase();
  
  try {
    let query = `
      SELECT DISTINCT prenom, SUM(valeur) as total_valeur
      FROM prenoms
      WHERE UPPER(prenom) LIKE UPPER('%${pattern}%')
    `;
    
    if (year) {
      query += ` AND periode = ${year}`;
    }
    
    if (sex) {
      query += ` AND sexe = ${sex}`;
    }
    
    query += ` GROUP BY prenom ORDER BY total_valeur DESC LIMIT ${limit}`;
    
    const result = await conn.query(query);
    return result.toArray().map(row => ({
      ...row,
      prenom: formatName(row.prenom),
      total_valeur: Number(row.total_valeur)
    }));
  } catch (err) {
    console.error("Error searching names by pattern:", err);
    throw err;
  }
} 