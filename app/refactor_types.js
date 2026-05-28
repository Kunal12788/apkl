import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

const typeAdditions = {
  'interface Task {': `interface Task {\n  metal: 'Gold' | 'Silver';`,
  'interface Transaction {': `interface Transaction {\n  metal: 'Gold' | 'Silver';`,
  'interface LedgerEntry {': `interface LedgerEntry {\n  pureSilverOut: number;\n  pureSilverDue: number;\n  impureSilverIn: number;\n  impureSilverOut?: number;`,
  'interface RefiningTransfer {': `interface RefiningTransfer {\n  metal: 'Gold' | 'Silver';\n  impureSilverSent: number;\n  calculatedPureSilver: number;\n  refinedPureSilverAchieved: number;`,
  'interface SuperAdminLedgerEntry {': `interface SuperAdminLedgerEntry {\n  pureSilverChange: number;\n  impureSilverChange: number;\n  calculatedPureSilver: number;`,
};

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [target, replacement] of Object.entries(typeAdditions)) {
    if (content.includes(target) && !content.includes(replacement)) {
      content = content.replace(target, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated types in ${file}`);
  }
});
