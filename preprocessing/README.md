# Preprocessing Script

This directory contains the preprocessing script that removes unused geographical information and adds normalized name variants to the original parquet file.

## Data Source

The `prenoms-2024.parquet` file comes directly from the INSEE (French National Institute of Statistics and Economic Studies) website:
- **Source**: https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113
- **Description**: French first names data from 1900 to 2024
- **Format**: Parquet file containing name statistics with birth counts by year at national, regional, and departmental levels.

## Script Overview

The `process_data.py` script loads the INSEE data, keeps only national level data, removes geographical columns, and adds two new normalized columns to the original parquet file:

1. **`prenom_accent_normalized`**: Removes accents only, preserving the original structure
2. **`prenom_phonetic_normalized`**: Aggressive normalization for grouping similar names (removes accents, phonetic equivalents, etc.)

## Prerequisites

This script requires Python 3.12+ and uses `uv` for dependency management.

## Running the Script

Make sure you have `uv` installed. If not, install it following the [official documentation](https://docs.astral.sh/uv/getting-started/installation/).

Run the script with default parameters:

```bash
uv run preprocessing/process_data.py
```

This will:
- Read from `./prenoms-2024.parquet` (default input)
- Output to `../frontend/static/data.parquet` (default output)

## Normalization Details

### Accent Normalization (`prenom_accent_normalized`)
- Converts to lowercase
- Removes French accents: àâä→a, éèêë→e, ïî→i, ôö→o, ùûü→u, ÿý→y, ç→c, ñ→n
- Preserves original structure

### Phonetic Normalization (`prenom_phonetic_normalized`)
- Applies accent normalization first
- Additional transformations:
  - y → i
  - Removes letter repetitions (tt→t, ll→l, etc.)
  - ard → ar (at word end)
  - ph → f (Sophie/Sofie)
  - qu/ck → k (Quentin/Kentin)
  - ie → i (at word end)
  - Removes silent 'h'
  - Cleans up spaces and hyphens