const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun, LevelFormat } = require('docx');
const fs = require('fs');

// DXA conversions (1 inch = 1440 DXA)
const INCH = 1440;
const CM = 567;

function createHeading(level, text) {
  const headingLevels = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, font: 'Arial', size: 24 - level * 2 })],
    spacing: { before: 200, after: 100 },
  });
}

function createParagraph(section) {
  const children = section.children.map(child => {
    const run = {
      text: child.text,
      font: 'Arial',
      size: 24, // 12pt
    };
    if (child.bold) run.bold = true;
    if (child.italic) run.italic = true;
    if (child.underline) run.underline = { type: 'single' };
    if (child.fontSize) run.size = child.fontSize * 2; // pt to half-points
    if (child.color) run.color = child.color.replace('#', '');
    return new TextRun(run);
  });
  
  const alignMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  
  return new Paragraph({
    children,
    alignment: alignMap[section.alignment] || AlignmentType.LEFT,
    spacing: { after: 120 },
  });
}

function createImage(section, imageBuffers) {
  if (!imageBuffers || !imageBuffers[section.index]) {
    return new Paragraph({
      children: [new TextRun({ text: `[Image ${section.index} not found]`, italics: true })],
    });
  }
  
  const alignMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
  };
  
  return new Paragraph({
    children: [
      new ImageRun({
        data: imageBuffers[section.index],
        transformation: {
          width: section.width || 400,
          height: section.height || 300,
        },
        type: 'jpg',
      }),
    ],
    alignment: alignMap[section.alignment] || AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
  });
}

function createTable(section) {
  const headers = section.headers || [];
  const rows = section.rows || [];
  const allRows = headers.length > 0 ? [headers, ...rows] : rows;
  
  const tableRows = allRows.map((row, i) => {
    const cells = row.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: cell,
          font: 'Arial',
          size: 22,
          bold: i === 0,
        })],
      })],
      width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
    }));
    
    return new TableRow({ children: cells });
  });
  
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function createList(section) {
  const items = section.items || [];
  return items.map((item, i) => {
    return new Paragraph({
      children: [new TextRun({ text: item, font: 'Arial', size: 24 })],
      bullet: {
        level: 0,
      },
      numbering: {
        reference: 'default-list',
        level: 0,
      },
      spacing: { after: 60 },
    });
  });
}

async function assemble(jsonDoc, outputPath, imageBuffers) {
  if (!jsonDoc.sections) {
    throw new Error('Invalid document: missing sections');
  }
  
  const children = [];
  
  for (const section of jsonDoc.sections) {
    switch (section.type) {
      case 'heading':
        children.push(createHeading(section.level, section.text));
        break;
      case 'paragraph':
        children.push(createParagraph(section));
        break;
      case 'image':
        children.push(createImage(section, imageBuffers));
        break;
      case 'table':
        children.push(createTable(section));
        break;
      case 'list':
        children.push(...createList(section));
        break;
    }
  }
  
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'default-list',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: { left: 720, hanging: 360 } },
        ],
      }],
    },
    sections: [{
      properties: {},
      children,
    }],
  });
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  return outputPath;
}

module.exports = { assemble };
