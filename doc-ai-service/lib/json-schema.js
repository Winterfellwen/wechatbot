// SCHEMA: JSON Schema definition for document structure.
// NOTE: validate() below performs manual validation instead of using this SCHEMA.
// Both are exported: SCHEMA for external schema validators (e.g. ajv),
// validate() for lightweight runtime checks without dependencies.
const SCHEMA = {
  type: 'object',
  required: ['sections'],
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['type', 'level', 'text'],
            properties: {
              type: { const: 'heading' },
              level: { enum: [1, 2, 3, 4] },
              text: { type: 'string', minLength: 1 },
            },
          },
          {
            type: 'object',
            required: ['type', 'children'],
            properties: {
              type: { const: 'paragraph' },
              children: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: { type: 'string', minLength: 1 },
                    bold: { type: 'boolean' },
                    italic: { type: 'boolean' },
                    underline: { type: 'boolean' },
                    fontSize: { type: 'number' },
                    color: { type: 'string' },
                  },
                },
              },
              alignment: { enum: ['left', 'center', 'right', 'justify'] },
            },
          },
          {
            type: 'object',
            required: ['type', 'index'],
            properties: {
              type: { const: 'image' },
              index: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              alignment: { enum: ['left', 'center', 'right'] },
            },
          },
          {
            type: 'object',
            required: ['type', 'rows'],
            properties: {
              type: { const: 'table' },
              headers: { type: 'array', items: { type: 'string' } },
              rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
              columnWidths: { type: 'array', items: { type: 'number' } },
            },
          },
          {
            type: 'object',
            required: ['type', 'items', 'ordered'],
            properties: {
              type: { const: 'list' },
              items: { type: 'array', items: { type: 'string' } },
              ordered: { type: 'boolean' },
            },
          },
        ],
      },
    },
  },
};

function validate(doc) {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    return { valid: false, error: 'Input must be a non-null object' };
  }
  if (!Array.isArray(doc.sections)) {
    return { valid: false, error: 'Missing sections array' };
  }
  for (let i = 0; i < doc.sections.length; i++) {
    const s = doc.sections[i];
    if (!s || typeof s !== 'object') {
      return { valid: false, error: `Section ${i} is not an object` };
    }
    if (!s.type) return { valid: false, error: `Section ${i} missing type` };
    switch (s.type) {
      case 'heading':
        if (!s.level || !s.text) return { valid: false, error: `Section ${i}: heading needs level+text` };
        if (![1, 2, 3, 4].includes(s.level)) return { valid: false, error: `Section ${i}: invalid heading level` };
        if (typeof s.text !== 'string' || s.text === '') return { valid: false, error: `Section ${i}: heading text must be a non-empty string` };
        break;
      case 'paragraph':
        if (!Array.isArray(s.children)) return { valid: false, error: `Section ${i}: paragraph needs children` };
        for (let j = 0; j < s.children.length; j++) {
          const child = s.children[j];
          if (!child || typeof child !== 'object') {
            return { valid: false, error: `Section ${i}, child ${j}: not an object` };
          }
          if (typeof child.text !== 'string' || child.text === '') {
            return { valid: false, error: `Section ${i}, child ${j}: text must be a non-empty string` };
          }
        }
        break;
      case 'image':
        if (typeof s.index !== 'number') return { valid: false, error: `Section ${i}: image needs index` };
        break;
      case 'table':
        if (!Array.isArray(s.rows)) return { valid: false, error: `Section ${i}: table needs rows` };
        for (let r = 0; r < s.rows.length; r++) {
          if (!Array.isArray(s.rows[r])) {
            return { valid: false, error: `Section ${i}, row ${r}: must be an array` };
          }
          for (let c = 0; c < s.rows[r].length; c++) {
            if (typeof s.rows[r][c] !== 'string') {
              return { valid: false, error: `Section ${i}, row ${r}, cell ${c}: must be a string` };
            }
          }
        }
        break;
      case 'list':
        if (!Array.isArray(s.items)) return { valid: false, error: `Section ${i}: list needs items` };
        if (typeof s.ordered !== 'boolean') return { valid: false, error: `Section ${i}: list needs ordered boolean` };
        break;
      default:
        return { valid: false, error: `Section ${i}: unknown type "${s.type}"` };
    }
  }
  return { valid: true };
}

module.exports = { SCHEMA, validate };
