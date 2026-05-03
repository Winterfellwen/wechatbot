#!/bin/bash
# Test that directory usage checker works
RANDOM_SUFFIX=$$
TEST_DIR="/tmp/test_project_$RANDOM_SUFFIX"
USED_DIR="$TEST_DIR/used_dir_$RANDOM_SUFFIX"
UNUSED_DIR="$TEST_DIR/unused_dir_$RANDOM_SUFFIX"
mkdir -p "$USED_DIR"
echo "console.log('used');" > "$USED_DIR/script.js"
mkdir -p "$UNUSED_DIR"
echo "console.log('unused');" > "$UNUSED_DIR/script.js"
# Create a main file that references the used directory (by its basename)
echo "import './used_dir_$RANDOM_SUFFIX/script.js';" > "$TEST_DIR/main.js"

# Test used directory
if ./scripts/check_directory_usage.sh "$USED_DIR" "$TEST_DIR"; then
    echo "Used directory test passed"
else
    echo "Used directory test failed"
    exit 1
fi

# Test unused directory
if ! ./scripts/check_directory_usage.sh "$UNUSED_DIR" "$TEST_DIR"; then
    echo "Unused directory test passed"
else
    echo "Unused directory test failed"
    exit 1
fi

# Clean up
rm -rf "$TEST_DIR"