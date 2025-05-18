// scripts/convert-style-to-case.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'handwriting-training.json');
const backupPath = filePath + '.bak';

try {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const updated = data.map(entry => {
    const caseValue = entry.style === 'neat' ? 'lower' :
                      entry.style === 'messy' ? 'upper' :
                      entry.case || 'unknown';

    let updatedPath = entry.imagePath;
    if (updatedPath) {
      updatedPath = updatedPath.replace('/neat/', '/lower/').replace('/messy/', '/upper/');
    }

    return {
      label: entry.label,
      case: caseValue,
      imagePath: updatedPath,
      timestamp: entry.timestamp
    };
  });

  // Back up original file
  fs.copyFileSync(filePath, backupPath);
  console.log(`🔒 Backup created: ${backupPath}`);

  // Write updated file
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  console.log('✅ handwriting-training.json updated successfully.');
} catch (err) {
  console.error('❌ Error processing file:', err.message);
}
