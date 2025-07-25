import{_ as p}from"./C1FmrZbK.js";let s,n,d=!1;async function y(){if(d)return{db:s,conn:n};try{console.log("Initializing database connection...");const e=await p(()=>import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29/+esm"),[],import.meta.url),r=await e.selectBundle(e.getJsDelivrBundles()),a=await e.createWorker(r.mainWorker),t=new e.ConsoleLogger;return s=new e.AsyncDuckDB(t,a),await s.instantiate(r.mainModule,r.pthreadWorker),n=await s.connect(),console.log("Database connection initialized"),d=!0,{db:s,conn:n}}catch(e){throw console.error("Error initializing database:",e),e}}async function E(){try{console.log("Loading database file...");const e=await fetch("/data/names.duckdb");if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);const r=await e.arrayBuffer();console.log("Fetched file into ArrayBuffer, size:",r.byteLength),await s.registerFileBuffer("readonly.duckdb",new Uint8Array(r)),console.log("File registered with DuckDB via buffer."),await n.query("ATTACH 'readonly.duckdb' AS mydb (READ_ONLY)");const a=await n.query(`
      SELECT * FROM pragma_database_list;
    `);console.log(a.toString()),console.log("Database file loaded successfully")}catch(e){throw console.error("Error loading database file:",e),e}}async function l(){d||(await y(),await E())}function c(e){return e?e.charAt(0).toUpperCase()+e.slice(1).toLowerCase():""}async function f(e,r,a=0,t=50){await l();try{const o=await n.query(`
      SELECT COUNT(*) as total
      FROM mydb.prenoms
      WHERE sexe = ${e} AND periode = ${r}
    `),m=Number(o.toArray()[0].total);return{data:(await n.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM mydb.prenoms
      WHERE sexe = ${e} AND periode = ${r}
      ORDER BY valeur DESC
      LIMIT ${t} OFFSET ${a}
    `)).toArray().map(i=>({...i,prenom:c(i.prenom),valeur:Number(i.valeur),sexe:Number(i.sexe),periode:Number(i.periode)})),total:m}}catch(o){throw console.error("Error getting data by sex and year:",o),o}}async function R(e){await l();try{return(await n.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM mydb.prenoms
      WHERE UPPER(prenom) = UPPER('${e}')
      ORDER BY periode ASC, sexe
    `)).toArray().map(a=>({...a,prenom:c(a.prenom),valeur:Number(a.valeur),sexe:Number(a.sexe),periode:Number(a.periode)}))}catch(r){throw console.error("Error getting data by name:",r),r}}async function D(e){await l();try{const r=e.map(t=>`'${t.toUpperCase()}'`).join(",");return(await n.query(`
      SELECT prenom, valeur, sexe, periode 
      FROM mydb.prenoms
      WHERE UPPER(prenom) IN (${r})
      ORDER BY prenom, periode ASC, sexe
    `)).toArray().map(t=>({...t,prenom:c(t.prenom),valeur:Number(t.valeur),sexe:Number(t.sexe),periode:Number(t.periode)}))}catch(r){throw console.error("Error getting data by names:",r),r}}async function N(){await l();try{return(await n.query(`
      SELECT DISTINCT periode 
      FROM mydb.prenoms
      ORDER BY periode DESC
    `)).toArray().map(r=>Number(r.periode))}catch(e){throw console.error("Error getting available years:",e),e}}async function w(e,r=null,a=null,t=20){await l();try{let o=`
      SELECT DISTINCT prenom, SUM(valeur) as total_valeur
      FROM mydb.prenoms
      WHERE UPPER(prenom) LIKE UPPER('%${e}%')
    `;return r&&(o+=` AND periode = ${r}`),a&&(o+=` AND sexe = ${a}`),o+=` GROUP BY prenom ORDER BY total_valeur DESC LIMIT ${t}`,(await n.query(o)).toArray().map(u=>({...u,prenom:c(u.prenom),total_valeur:Number(u.total_valeur)}))}catch(o){throw console.error("Error searching names by pattern:",o),o}}export{f as a,D as b,R as c,N as g,w as s};
