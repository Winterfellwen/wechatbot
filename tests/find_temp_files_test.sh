#!/bin/bash
# Test that our temp file finder works
echo "test content" > /tmp/test_temp.tmp
if ./scripts/find_temp_files.sh /tmp | grep -q "/tmp/test_temp.tmp"; then
    echo "Test passed: script detects temp file"
else
    echo "Test failed: script did not detect temp file"
    exit 1
fi