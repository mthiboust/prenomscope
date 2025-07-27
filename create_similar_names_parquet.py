#!/usr/bin/env python3
"""
Script to add a normalized name column to the existing parquet file.
The normalized column removes accents and converts to lowercase for grouping similar names.
"""

import argparse
import re
import sys

import polars as pl


def normalize_name(name):
    """
    Normalize a name by removing accents and converting to lowercase using regex.
    Also handles common variations like 'é', 'è', 'e' -> 'e'.
    """
    if not name or not isinstance(name, str):
        return name

    # Convert to lowercase
    name = name.lower().strip()

    # Remove accents using regex patterns
    # French accent mappings
    accent_patterns = {
        r"[àâä]": "a",
        r"[éèêë]": "e",
        r"[ïî]": "i",
        r"[ôö]": "o",
        r"[ùûü]": "u",
        r"[ÿý]": "y",
        r"ç": "c",
        r"ñ": "n",
    }

    # Apply accent normalization patterns
    for pattern, replacement in accent_patterns.items():
        name = re.sub(pattern, replacement, name)

    # Replace "y" by "i"
    name = re.sub(r"y", "i", name)

    # Remove letter repetitions (like "tt" -> "t", "ll" -> "l", etc.)
    # This pattern matches any letter followed by the same letter
    name = re.sub(r"(.)\1+", r"\1", name)

    # Replace final "ard" by "ar" at the end of the word
    name = re.sub(r"ard$", "ar", name)

    # Phonetic equivalents
    name = re.sub(r"ph", "f", name)  # "ph" → "f" (Sophie/Sofie)
    name = re.sub(r"(ck|qu)", "k", name)  # "qu" → "k" (Quentin/Kentin)

    # Remove final silent letters (common in French)
    name = re.sub(r"ie$", "i", name)  # Remove final "e" (Marie/Mari)

    # Remove silent letters (common in French)
    name = re.sub(r"h", "", name)  # Remove "h" (Helio/Elio)

    # Remove extra spaces and hyphens
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"-+", "-", name)
    name = name.strip("- ")

    return name


def add_normalized_column(input_file, output_file):
    """
    Add a normalized name column to the existing parquet file.
    """
    print(f"Reading input file: {input_file}")
    df = pl.read_parquet(input_file)

    print(f"Original data shape: {df.shape}")
    print(f"Original unique names: {df.select('prenom').n_unique()}")

    # Add normalized name column
    print("Adding normalized name column...")
    df = df.with_columns(
        [
            pl.col("prenom")
            .map_elements(normalize_name, return_dtype=pl.Utf8)
            .alias("prenom_normalized")
        ]
    )

    print(f"Updated data shape: {df.shape}")
    print(f"Unique normalized names: {df.select('prenom_normalized').n_unique()}")

    # Save to parquet
    print(f"Saving to: {output_file}")
    df.write_parquet(output_file)

    # Print some statistics
    print("\n=== STATISTICS ===")
    original_unique = df.select("prenom").n_unique()
    normalized_unique = df.select("prenom_normalized").n_unique()
    print(f"Original unique names: {original_unique}")
    print(f"Normalized unique names: {normalized_unique}")
    print(f"Reduction: {original_unique - normalized_unique} names can be grouped")

    # Show some examples of normalized names
    print("\n=== EXAMPLES OF NORMALIZED NAMES ===")
    examples = df.select(["prenom", "prenom_normalized"]).unique().head(10)
    for row in examples.iter_rows(named=True):
        original = row["prenom"]
        normalized = row["prenom_normalized"]
        if original.lower() != normalized:
            print(f"{original} -> {normalized}")

    return df


def main():
    parser = argparse.ArgumentParser(description="Add normalized name column to parquet file")
    parser.add_argument(
        "--input",
        "-i",
        default="static/data/names.parquet",
        help="Input parquet file path (default: static/data/names.parquet)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="static/data/names_with_normalized.parquet",
        help="Output parquet file path (default: static/data/names_with_normalized.parquet)",
    )

    args = parser.parse_args()

    try:
        add_normalized_column(args.input, args.output)
        print(f"\n✅ Successfully created {args.output}")
        print(
            "You can now use the 'prenom_normalized' column for grouping similar names at runtime."
        )
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
