function fixJson(content) {
  // Remove markdown code fences
  content = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');
  content = content.trim();

  // Fix trailing commas before } or ]
  content = content.replace(/,\s*([}\]])/g, '$1');

  // Fix unescaped newlines in strings
  content = content.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });

  return content;
}

function parseAIResponse(content) {
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
