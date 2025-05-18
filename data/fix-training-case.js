const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'handwriting-training.json');

const raw = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(raw);

const updated = data.map(entry => {
  const oldStyle = entry.style;
  let letterCase = oldStyle === 'neat' ? 'lower' : 'upper';

  return {
    label: entry.label,
    case: letterCase,
    imagePath: entry.imagePath.replace('/neat/', '/lower/').replace('/messy/', '/upper/'),
    timestamp: entry.timestamp
  };
});

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
console.log(`✅ Updated ${updated.length} entries in handwriting-training.json`);
