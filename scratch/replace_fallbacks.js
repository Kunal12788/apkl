const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/HP/Downloads/ppp/pkl/app/src/components';

const replacements = [
  { search: /user\?\.id\s*\|\|\s*'COLL-001'/g, replace: "user?.id || ''" },
  { search: /user\?\.id\s*\|\|\s*'STAFF-001'/g, replace: "user?.id || ''" },
  { search: /verifiedTask\.createdBy\s*\|\|\s*'COLL-001'/g, replace: "verifiedTask.createdBy || ''" },
  { search: /task\.createdBy\s*\|\|\s*'COLL-001'/g, replace: "task.createdBy || ''" },
  { search: /return\s*'Alexander';/g, replace: "return 'Staff Member';" },
  { search: /verifiedBy:\s*'Alexander'/g, replace: "verifiedBy: user?.name || 'Staff Member'" },
  { search: /id:\s*'STAFF-temp',\s*name:\s*'Marcus Reynolds'/g, replace: "id: 'STAFF-temp', name: 'Staff Member'" }
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { search, replace } of replacements) {
        if (search.test(content)) {
          content = content.replace(search, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', file);
      }
    }
  }
}

processDir(dir);
console.log('Done!');
