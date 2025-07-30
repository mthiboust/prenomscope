#!/usr/bin/env python3
"""
Script to add an accent-agnostic normalized name column to the existing parquet file.
The accent-agnostic column only removes accents but preserves the original name structure.
"""

import argparse
import re
import sys

import polars as pl


def normalize_name_accent_agnostic(name):
    """
    Normalize a name by removing accents only, preserving the original structure.
    This is different from the existing normalized column which does more aggressive transformations.
    """
    if not name or not isinstance(name, str):
        return name

    # Convert to lowercase
    name = name.lower().strip()

    # Remove accents using regex patterns - only accent removal, no other transformations
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

    # Apply accent normalization patterns only
    for pattern, replacement in accent_patterns.items():
        name = re.sub(pattern, replacement, name)

    return name


def add_accent_agnostic_column(input_file, output_file):
    """
    Add an accent-agnostic normalized name column to the existing parquet file.
    """
    print(f"Reading input file: {input_file}")
    df = pl.read_parquet(input_file)

    print(f"Original data shape: {df.shape}")
    print(f"Original unique names: {df.select('prenom').n_unique()}")

    # Add accent-agnostic normalized name column
    print("Adding accent-agnostic normalized name column...")
    df = df.with_columns(
        [
            pl.col("prenom")
            .map_elements(normalize_name_accent_agnostic, return_dtype=pl.Utf8)
            .alias("prenom_accent_agnostic")
        ]
    )

    print(f"Updated data shape: {df.shape}")
    print(f"Unique accent-agnostic names: {df.select('prenom_accent_agnostic').n_unique()}")

    # Save to parquet
    print(f"Saving to: {output_file}")
    df.write_parquet(output_file)

    # Print some statistics
    print("\n=== STATISTICS ===")
    original_unique = df.select("prenom").n_unique()
    accent_agnostic_unique = df.select("prenom_accent_agnostic").n_unique()
    normalized_unique = df.select("prenom_normalized").n_unique()
    print(f"Original unique names: {original_unique}")
    print(f"Accent-agnostic unique names: {accent_agnostic_unique}")
    print(f"Normalized unique names: {normalized_unique}")
    print(
        f"Reduction with accent-agnostic: {original_unique - accent_agnostic_unique} names can be grouped"
    )
    print(f"Reduction with normalized: {original_unique - normalized_unique} names can be grouped")

    # Show some examples of accent-agnostic names
    print("\n=== EXAMPLES OF ACCENT-AGNOSTIC NAMES ===")
    examples = (
        df.select(["prenom", "prenom_accent_agnostic", "prenom_normalized"]).unique().head(15)
    )
    for row in examples.iter_rows(named=True):
        original = row["prenom"]
        accent_agnostic = row["prenom_accent_agnostic"]
        normalized = row["prenom_normalized"]
        if original.lower() != accent_agnostic:
            print(
                f"{original} -> {accent_agnostic} (accent-agnostic) vs {normalized} (normalized)"
            )

    return df


def main():
    parser = argparse.ArgumentParser(
        description="Add accent-agnostic normalized name column to parquet file"
    )
    parser.add_argument(
        "--input",
        "-i",
        default="static/data/names_with_normalized.parquet",
        help="Input parquet file path (default: static/data/names_with_normalized.parquet)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="static/data/names_with_accent_agnostic.parquet",
        help="Output parquet file path (default: static/data/names_with_accent_agnostic.parquet)",
    )

    args = parser.parse_args()

    try:
        add_accent_agnostic_column(args.input, args.output)
        print(f"\n✅ Successfully created {args.output}")
        print(
            "You can now use the 'prenom_accent_agnostic' column for accent-agnostic name matching."
        )
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
