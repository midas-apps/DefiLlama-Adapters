const { execFileSync } = require('node:child_process');

const MODIFIED = parseFileList(process.env.MODIFIED);
const ADDED = parseFileList(process.env.ADDED);
const fileSet = new Set();

for (const file of [...MODIFIED, ...ADDED]) {
  const [root, dir] = file.split('/');
  if (dir === 'treasury' || dir === 'entities') {
    fileSet.add(file);
  } else if (root === 'projects' && dir !== 'helper' && dir !== 'config') {
    fileSet.add(`${root}/${dir}`);
  } else if (
    root === 'registries' &&
    file.endsWith('.js') &&
    dir !== 'index.js' &&
    dir !== 'utils.js'
  ) {
    const diffBase = process.env.DIFF_BASE || 'HEAD~1';
    const diff = execFileSync('git', ['diff', diffBase, '--', file], {
      encoding: 'utf8',
    });
    const lines = diff
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'));
    for (const line of lines) {
      const match = line.match(/['"]([a-zA-Z0-9][a-zA-Z0-9_-]+)['"]\s*:/);
      if (match) fileSet.add(match[1]);
    }
  }
}

console.log(JSON.stringify([...fileSet]));

function parseFileList(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((file) => typeof file === 'string' && file.length > 0);
    }
  } catch {
    // Fall back to the legacy comma-separated output format.
  }

  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((file) => file.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}
