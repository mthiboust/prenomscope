#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "polars",
# ]
# ///
"""
Script to process the INSEE prenoms-2024.parquet file:
1. Load the original file
2. Keep only national level data (niveau_geographique = 'FRANCE')
3. Remove unused geographical columns
4. Apply accent and phonetic normalization
"""

import argparse
import re
import sys

import polars as pl


def normalize_name_accent(name):
    """
    Normalize a name by removing accents only, preserving the original structure.
    This is different from the phonetic normalization which does more aggressive transformations.
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


def normalize_name_phonetic(name):
    """
    Normalize a name by applying accent normalization first, then additional phonetic transformations.
    This is the aggressive normalization for grouping similar names.
    """
    if not name or not isinstance(name, str):
        return name

    # Start with accent normalization
    name = normalize_name_accent(name)

    # Additional phonetic transformations
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


def load_and_filter_data(input_file):
    """Load the INSEE parquet file and filter for national level data."""
    print(f"Reading input file: {input_file}")
    df = pl.read_parquet(input_file)

    print(f"Original data shape: {df.shape}")
    print(f"Original unique names: {df.select('prenom').n_unique()}")

    # Filter for national level data only
    print("Filtering for national level data...")
    df_national = df.filter(pl.col("niveau_geographique") == "FRANCE")

    print(f"After filtering - data shape: {df_national.shape}")
    print(f"After filtering - unique names: {df_national.select('prenom').n_unique()}")

    # Remove geographical columns
    print("Removing geographical columns...")
    df_clean = df_national.drop(["niveau_geographique", "geographie"])

    print(f"Final data shape: {df_clean.shape}")
    print(f"Final unique names: {df_clean.select('prenom').n_unique()}")

    return df_clean


def save_dataframe(df, output_file):
    """Save dataframe to parquet file."""
    print(f"Saving to: {output_file}")
    df.write_parquet(output_file)


def print_statistics(df, columns_to_compare=None):
    """Print comprehensive statistics about the dataframe."""
    print("\n=== STATISTICS ===")
    original_unique = df.select("prenom").n_unique()
    print(f"Original unique names: {original_unique}")

    if columns_to_compare:
        for col in columns_to_compare:
            if col in df.columns:
                unique_count = df.select(col).n_unique()
                reduction = original_unique - unique_count
                print(f"{col} unique names: {unique_count}")
                print(f"Reduction with {col}: {reduction} names can be grouped")


def print_examples(df, columns_to_show, max_examples=15):
    """Print examples of name transformations."""
    print(f"\n=== EXAMPLES OF {'/'.join(columns_to_show).upper()} ===")

    # Select columns that exist in the dataframe
    available_columns = [col for col in columns_to_show if col in df.columns]
    if not available_columns:
        return

    examples = df.select(available_columns).unique().head(max_examples)

    for row in examples.iter_rows(named=True):
        original = row.get("prenom", "")
        transformed_values = []

        for col in available_columns[1:]:  # Skip 'prenom' column
            transformed_values.append(f"{row[col]} ({col})")

        if transformed_values:
            print(f"{original} -> {' / '.join(transformed_values)}")


def add_column_to_dataframe(df, column_name, normalization_func):
    """Add a normalized column to the dataframe."""
    print(f"Adding {column_name} column...")
    df = df.with_columns(
        [
            pl.col("prenom")
            .map_elements(normalization_func, return_dtype=pl.Utf8)
            .alias(column_name)
        ]
    )

    print(f"Updated data shape: {df.shape}")
    print(f"Unique {column_name} names: {df.select(column_name).n_unique()}")

    return df


def process_data(input_file, output_file):
    """Process the full pipeline: load, filter, clean, and normalize."""
    # Load and filter data
    df = load_and_filter_data(input_file)

    # Add both normalized name columns
    df = add_column_to_dataframe(df, "prenom_accent_normalized", normalize_name_accent)
    df = add_column_to_dataframe(df, "prenom_phonetic_normalized", normalize_name_phonetic)

    save_dataframe(df, output_file)

    # Print comprehensive statistics
    print_statistics(df, ["prenom_accent_normalized", "prenom_phonetic_normalized"])
    print_examples(df, ["prenom", "prenom_accent_normalized", "prenom_phonetic_normalized"])

    return df


def main():
    parser = argparse.ArgumentParser(
        description="Process INSEE prenoms data: filter national level, remove geographical columns, and add normalized name variants"
    )
    parser.add_argument(
        "--input",
        "-i",
        default="./prenoms-2024.parquet",
        help="Input parquet file path (default: ./prenoms-2024.parquet)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="../frontend/static/data.parquet",
        help="Output parquet file path (default: ../frontend/static/data.parquet)",
    )

    args = parser.parse_args()

    try:
        process_data(args.input, args.output)
        print(f"\n✅ Successfully created {args.output}")
        print("Added columns:")
        print("  - prenom_accent_normalized: Accent removal only")
        print(
            "  - prenom_phonetic_normalized: Aggressive normalization for grouping similar names"
        )
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
