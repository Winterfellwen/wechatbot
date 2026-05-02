# Unused File/Directory Verification Checklist

Before deleting any file or directory, verify:

[ ] Item is not referenced in any code (check with grep -r)
[ ] Item is not listed in package.json dependencies
[ ] Item is not referenced in config files (webpack, babel, etc.)
[ ] Item is not a build artifact that might be regenerated
[ ] Item is not in .gitignore (should be safe to delete if ignored)
[ ] Item is not a template or example that might be needed
[ ] Check git history to see if item was recently modified
[ ] Verify with team if unsure about item purpose

Deletion process:
1. Move item to trash/backup first
2. Run tests to ensure nothing breaks
3. If all good, permanently delete