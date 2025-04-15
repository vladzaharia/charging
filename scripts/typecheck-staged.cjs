// eslint-disable-next-line
const { execSync } = require('child_process');

const files = execSync('git diff --cached --name-only --diff-filter=ACM')
  .toString()
  .split('\n')
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

if (files.length) {
  try {
    execSync(`yarn tsc --noEmit ${files.join(' ')}`, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
} else {
  console.log('No staged TypeScript files to type-check.');
}
