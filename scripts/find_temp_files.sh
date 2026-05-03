#!/bin/bash
# Find temporary and backup files
# Usage: ./find_temp_files.sh [directory]
DIR="${1:-.}"

echo "Finding temporary and backup files in $DIR"
find "$DIR" -type f \( -name "*.bak" -o -name "*.tmp" -o -name "*~" -o -name "*.swp" -o -name "*.temp" -o -name ".DS_Store" -o -name "Thumbs.db" \)