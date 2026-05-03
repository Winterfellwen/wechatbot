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