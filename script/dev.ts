
import { execSync } from 'child_process';

const run = (command: string) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit' });
};

console.log('Starting development environment...');

try {
  run('docker compose build');
  run('docker compose up -d');
  run('docker compose logs -f app');
} catch (error) {
  console.error('An error occurred during development environment startup:', error);
  process.exit(1);
}
