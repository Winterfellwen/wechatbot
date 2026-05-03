#!/bin/bash
# Safe deletion script with backup
# Usage: ./safe_delete.sh <item1> [item2] [...]
BACKUP_DIR="./.delete_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up items to $BACKUP_DIR before deletion"

for item in "$@"; do
    if [ -e "$item" ]; then
        echo "Backing up: $item"
        cp -r "$item" "$BACKUP_DIR/"
        echo "Deleting: $item"
        rm -rf "$item"
    else
        echo "Warning: $item not found, skipping"
    fi
done

echo "Backup completed. Items can be restored from $BACKUP_DIR if needed."