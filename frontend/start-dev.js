import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.resolve(__dirname, '../backend');

console.log('Starting FastAPI backend...');
// Spawn backend: uv run uvicorn main:app --port 8000
const backendProcess = spawn('uv', ['run', 'uvicorn', 'main:app', '--port', '8000'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

console.log('Starting Vite frontend...');
// Spawn frontend: npx vite
const frontendProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nStopping servers...');
  try {
    backendProcess.kill('SIGINT');
  } catch (e) {}
  try {
    frontendProcess.kill('SIGINT');
  } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  try {
    backendProcess.kill();
  } catch (e) {}
  try {
    frontendProcess.kill();
  } catch (e) {}
});
