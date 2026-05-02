# Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unused code, files, and folders from the codebase to improve maintainability and reduce clutter.

**Architecture:** 
1. First, identify unused files and code through static analysis and git history
2. Verify that identified items are truly unused and safe to remove
3. Remove the unused items in a systematic way
4. Run tests to ensure nothing is broken after cleanup

**Tech Stack:** 
- Git for tracking changes
- Standard file system commands for removal
- Existing test suite for verification

---

### Task 1: Identify Potentially Unused Files

**Files:**
- Modify: `scripts/find_unused.sh` (create new script)
- Test: `tests/find_unused_test.sh` (create test script)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that our unused file finder works
echo "test content" > /tmp/test_unused.txt
if ./scripts/find_unused.sh /tmp/test_unused.txt; then
    echo "Test passed: script detects unused file"
else
    echo "Test failed: script did not detect unused file"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/find_unused_test.sh`
Expected: FAIL with "script not found"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Simple script to find potentially unused files
# For now, just echo success
echo "Finding unused files..."
exit 0
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/find_unused_test.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/find_unused.sh tests/find_unused_test.sh
git commit -m "feat: add unused file detection script"
```

### Task 2: Enhance Unused File Detection

**Files:**
- Modify: `scripts/find_unused.sh`
- Test: `tests/find_unused_test.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that script finds actually unused files in a test directory
mkdir -p /tmp/test_project
echo "used content" > /tmp/test_project/used.js
echo "// This file is used" > /tmp/test_project/used.js
echo "unused content" > /tmp/test_project/unused.js
# Create a simple reference to used.js
echo "import './used.js';" > /tmp/test_project/main.js

# Run our script and check if it finds unused.js
if ./scripts/find_unused.sh /tmp/test_project | grep -q "unused.js"; then
    echo "Test passed: correctly identified unused.js"
else
    echo "Test failed: did not identify unused.js"
    exit 1
fi

# Clean up
rm -rf /tmp/test_project
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/find_unused_test.sh`
Expected: FAIL with "script not implementing proper detection"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Find potentially unused files in a directory
# Usage: ./find_unused.sh [directory]
DIR="${1:-.}"

echo "Scanning for potentially unused files in $DIR"

# Find all JavaScript and TypeScript files
find "$DIR" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) | while read file; do
    # Check if file is imported/required anywhere
    if ! grep -r "$(basename "$file" .js)" "$DIR" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" | grep -v "$file" | grep -q .; then
        echo "POSSIBLY UNUSED: $file"
    fi
done

# Also check for other common file types
find "$DIR" -type f \( -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.xml" -o -name "*.wxml" -o -name "*.wxss" \) | while read file; do
    # Simple check: if no reference to filename (without extension) in code
    basename_no_ext=$(basename "$file" | sed 's/\.[^.]*$//')
    if [ "$basename_no_ext" != "$basename" ] && [ -n "$basename_no_ext" ]; then
        if ! grep -r "$basename_no_ext" "$DIR" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" --include="*.wxml" --include="*.wxss" | grep -v "$file" | grep -q .; then
            echo "POSSIBLY UNUSED: $file"
        fi
    fi
done
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/find_unused_test.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/find_unused.sh
git commit -m "feat: improve unused file detection logic"
```

### Task 3: Run Initial Scan and Review Results

**Files:**
- Modify: None (read-only operation)
- Create: `docs/unused_files_report.md` (report of findings)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that we can generate a report
if [ -f "docs/unused_files_report.md" ]; then
    echo "Test passed: report file exists"
else
    echo "Test failed: report file does not exist"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash -c '[ -f "docs/unused_files_report.md" ] && echo "exists" || echo "missing"'`
Expected: FAIL with "missing"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Generate initial report of potentially unused files
echo "# Unused Files Report" > docs/unused_files_report.md
echo "" >> docs/unused_files_report.md
echo "## Potentially Unused Files Found:" >> docs/unused_files_report.md
echo "" >> docs/unused_files_report.md
./scripts/find_unused.sh . >> docs/unused_files_report.md 2>&1 || echo "Script completed with exit code $?" >> docs/unused_files_report.md
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c './scripts/find_unused.sh . > docs/unused_files_report.md 2>&1 && [ -f "docs/unused_files_report.md" ] && echo "Report generated"'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/unused_files_report.md
git commit -m "docs: generate initial unused files report"
```

### Task 4: Manual Review and Verification Process

**Files:**
- Modify: `docs/unused_files_report.md` (add verification notes)
- Create: `docs/verification_checklist.md` (checklist for verifying safety)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that verification checklist exists
if [ -f "docs/verification_checklist.md" ]; then
    echo "Test passed: verification checklist exists"
else
    echo "Test failed: verification checklist missing"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash -c '[ -f "docs/verification_checklist.md" ] && echo "exists" || echo "missing"'`
Expected: FAIL with "missing"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Create verification checklist
cat > docs/verification_checklist.md << 'EOF'
# Unused File Verification Checklist

Before deleting any file, verify:

[ ] File is not referenced in any code (check with grep -r)
[ ] File is not listed in package.json dependencies
[ ] File is not referenced in config files (webpack, babel, etc.)
[ ] File is not a build artifact that might be regenerated
[ ] File is not in .gitignore (should be safe to delete if ignored)
[ ] File is not a template or example that might be needed
[ ] Check git history to see if file was recently modified
[ ] Verify with team if unsure about file purpose

Deletion process:
1. Move file to trash/backup first
2. Run tests to ensure nothing breaks
3. If all good, permanently delete
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c '[ -f "docs/verification_checklist.md" ] && echo "Checklist created"'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/verification_checklist.md
git commit -m "docs: add verification checklist for safe deletion"
```

### Task 5: Safe Removal of Confirmed Unused Files

**Files:**
- Modify: Various files to be deleted (to be determined)
- Create: `scripts/safe_delete.sh` (script for safe deletion)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that safe delete script works
echo "test content" > /tmp/test_delete.txt
if ./scripts/safe_delete.sh /tmp/test_delete.txt; then
    if [ ! -f "/tmp/test_delete.txt" ]; then
        echo "Test passed: file deleted successfully"
    else
        echo "Test failed: file still exists"
        exit 1
    fi
else
    echo "Test failed: script returned error"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/safe_delete_test.sh`
Expected: FAIL with "script not found"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Safe deletion script with backup
# Usage: ./safe_delete.sh <file1> [file2] [...]
BACKUP_DIR="./.delete_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up files to $BACKUP_DIR before deletion"

for file in "$@"; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo "Backing up: $file"
        cp -r "$file" "$BACKUP_DIR/"
        echo "Deleting: $file"
        rm -rf "$file"
    else
        echo "Warning: $file not found, skipping"
    fi
done

echo "Backup completed. Files can be restored from $BACKUP_DIR if needed."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c './scripts/safe_delete.sh /tmp/test_delete.txt && [ ! -f "/tmp/test_delete.txt" ] && echo "File deleted"'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/safe_delete.sh
git commit -m "feat: add safe deletion script with backup"
```

### Task 6: Execute Cleanup Based on Verified List

**Files:**
- Modify: Files identified as safe to delete (to be determined from report)
- Create: `docs/deletion_log.md` (log of what was deleted)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that deletion log is created
if [ -f "docs/deletion_log.md" ]; then
    echo "Test passed: deletion log exists"
else
    echo "Test failed: deletion log missing"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash -c '[ -f "docs/deletion_log.md" ] && echo "exists" || echo "missing"'`
Expected: FAIL with "missing"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Log deletion activity
echo "# Deletion Log - $(date)" > docs/deletion_log.md
echo "" >> docs/deletion_log.md
echo "## Files and folders deleted:" >> docs/deletion_log.md
echo "" >> docs/deletion_log.md

# Read from a predefined list of confirmed unused files
# In practice, this would come from manual review of unused_files_report.md
CONFIRMED_UNUSED_FILES=(
    # Examples - replace with actual findings
    "path/to/unused/file1.js"
    "path/to/unused/folder/"
)

for item in "${CONFIRMED_UNUSED_FILES[@]}"; do
    if [ -e "$item" ]; then
        echo "- $item" >> docs/deletion_log.md
        ./scripts/safe_delete.sh "$item"
    else
        echo "- $item (already missing)" >> docs/deletion_log.md
    fi
done
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c './scripts/safe_delete.sh /tmp/test_delete.txt 2>/dev/null; [ -f "docs/deletion_log.md" ] && echo "Log created"'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/deletion_log.md
git commit -m "docs: log deletion of unused files"
```

### Task 7: Run Tests to Ensure Nothing Broken

**Files:**
- Modify: None (read-only operation)
- Test: Existing test suite

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that the test suite passes after cleanup
if npm test; then
    echo "Test passed: all tests still pass"
else
    echo "Test failed: some tests broken after cleanup"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash -c 'npm test 2>&1 | head -5'`
Expected: This will depend on current state - we expect it to pass if cleanup was safe

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Run the test suite to verify nothing is broken
echo "Running test suite to verify cleanup didn't break anything..."
npm test
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo "All tests passed - cleanup appears safe"
else
    echo "Tests failed - may need to restore from backup"
    echo "Test result: $TEST_RESULT"
fi

exit $TEST_RESULT
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c 'npm test'`
Expected: PASS (assuming cleanup was safe)

- [ ] **Step 5: Commit**

```bash
git add package-lock.json  # if updated by npm test
git commit -m "test: verify test suite passes after cleanup"
```

### Task 8: Final Review and Documentation

**Files:**
- Modify: `docs/superpowers/plans/2026-05-02-code-cleanup.md` (mark tasks as complete)
- Create: `docs/CLEANUP_SUMMARY.md` (summary of what was accomplished)

- [ ] **Step 1: Write the failing test**

```bash
#!/bin/bash
# Test that summary document exists
if [ -f "docs/CLEANUP_SUMMARY.md" ]; then
    echo "Test passed: cleanup summary exists"
else
    echo "Test failed: cleanup summary missing"
    exit 1
fi
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash -c '[ -f "docs/CLEANUP_SUMMARY.md" ] && echo "exists" || echo "missing"'`
Expected: FAIL with "missing"

- [ ] **Step 3: Write minimal implementation**

```bash
#!/bin/bash
# Create summary of cleanup activities
cat > docs/CLEANUP_SUMMARY.md << EOF
# Code Cleanup Summary
## Date: $(date)

## Overview
Completed cleanup of unused code, files, and folders from the codebase.

## Statistics
- Files scanned: [TO BE FILLED]
- Potentially unused identified: [TO BE FILLED]
- Manually verified safe to delete: [TO BE FILLED]
- Actually deleted: [TO BE FILLED]
- Bytes freed: [TO BE FILLED]

## Process Followed
1. Initial scan using custom scripts
2. Manual verification using checklist
3. Safe deletion with backup
4. Test verification to ensure nothing broken
5. Documentation of results

## Backups
All deletions were backed up to timestamped directories under .delete_backup_*
These can be restored if needed, but should be cleaned up after verifying stability.

## Recommendations
- Consider setting up regular unused file detection as part of CI
- Document file purposes better to avoid future confusion
- Consider using TypeScript or JSDoc for better auto-discovery of usage
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash -c '[ -f "docs/CLEANUP_SUMMARY.md" ] && echo "Summary created"'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/CLEANUP_SUMMARY.md docs/superpowers/plans/2026-05-02-code-cleanup.md
git commit -m "docs: add cleanup summary and mark plan complete"
```