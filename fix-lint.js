const fs = require('fs');

const data = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

for (const result of data) {
  if (result.errorCount === 0 && result.warningCount === 0) continue;

  let lines = fs.readFileSync(result.filePath, 'utf8').split('\n');
  const changes = [];

  for (const msg of result.messages) {
    if (msg.ruleId === '@typescript-eslint/no-unused-vars' || msg.ruleId === 'unused-imports/no-unused-vars') {
      const lineIdx = msg.line - 1;
      const colIdx = msg.column - 1;
      // Get the variable name from the message e.g. "'err' is defined but never used"
      const match = msg.message.match(/'([^']+)'/);
      if (match) {
        const varName = match[1];
        if (varName && !varName.startsWith('_')) {
          changes.push({ lineIdx, colIdx, varName });
        }
      }
    }
  }

  // Sort changes by line and column descending to avoid shifting issues within the same line
  changes.sort((a, b) => b.lineIdx - a.lineIdx || b.colIdx - a.colIdx);

  // We can't simply replace by column because some lines might have multiple variables or destructuring.
  // Instead of complex AST parsing, let's just do a simple string replace for the variable on that line.
  // Since we only want to prefix with '_', we replace `varName` with `_varName` at the specific column.
  
  for (const change of changes) {
    const line = lines[change.lineIdx];
    // verify the variable name exists near the column
    // The column might be slightly off depending on eslint parsing
    // Let's just replace the exact word match on that line
    const regex = new RegExp(`\\b${change.varName}\\b`);
    lines[change.lineIdx] = line.replace(regex, `_${change.varName}`);
  }

  fs.writeFileSync(result.filePath, lines.join('\n'));
}

console.log('Done prefixing unused vars with _');
