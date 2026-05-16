function fixJson(content) {
  if (typeof content !== 'string') {
    throw new TypeError('Expected a string input');
  }

  // Remove markdown code fences — use specific fence pattern
  content = content.replace(/```json\s*\n?/g, '').replace(/```\s*\n?/g, '');
  content = content.trim();

  // Fix trailing commas before } or ] — only outside of strings
  // Uses a two-pass approach: first match strings to protect them, then fix commas
  const stringPlaceholder = '__JSON_STRING_PLACEHOLDER_';
  const strings = [];
  content = content.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    const idx = strings.length;
    strings.push(match);
    return stringPlaceholder + idx + stringPlaceholder;
  });
  content = content.replace(/,\s*([}\]])/g, '$1');
  content = content.replace(
    new RegExp(stringPlaceholder + '(\\d+)' + stringPlaceholder, 'g'),
    (_, idx) => strings[parseInt(idx, 10)]
  );

  // Fix unescaped newlines in strings — use safe iterative approach instead of regex with *
  const result = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (escaped) {
      result.push(ch);
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      result.push(ch);
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result.push(ch);
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      result.push(ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : '\\t');
      continue;
    }
    result.push(ch);
  }
  return result.join('');
}

function parseAIResponse(content) {
  if (content == null) {
    return { doc: null, error: 'Input is null or undefined' };
  }
  if (typeof content === 'object') {
    return { doc: content, error: null };
  }
  if (typeof content !== 'string') {
    return { doc: null, error: 'Expected string or object input' };
  }

  // Try direct parse first
  try {
    const doc = JSON.parse(content);
    return { doc, error: null };
  } catch {
    // Try fixing common issues
    const fixed = fixJson(content);
    try {
      const doc = JSON.parse(fixed);
      return { doc, error: null };
    } catch (e) {
      return { doc: null, error: e.message };
    }
  }
}

module.exports = { fixJson, parseAIResponse };
