const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

if (!existsSync('.git')) {
  process.exit(0);
}

const result = spawnSync('npx', ['--no-install', 'husky'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
