#!/bin/bash
# Check if a directory is referenced in the codebase
# Usage: ./check_directory_usage.sh <directory> [search_root]
DIR_TO_CHECK="${1:-.}"
SEARCH_ROOT="${2:-.}"

# Get the directory name (last part of path)
DIR_NAME=$(basename "$DIR_TO_CHECK")

# Search for references to the directory name in files (excluding the directory itself)
if grep -r "$DIR_NAME" "$SEARCH_ROOT" --exclude-dir="$DIR_NAME" --exclude="*.{git}" | grep -q .; then
    echo "Directory '$DIR_NAME' is referenced"
    exit 0
else
    echo "Directory '$DIR_NAME' is NOT referenced"
    exit 1
fi