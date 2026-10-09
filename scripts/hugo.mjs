import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

// Prefer an explicit binary, then the local download, then a system installation.
const local = resolve('.tools/hugo', process.platform === 'win32' ? 'hugo.exe' : 'hugo');
const executable = process.env.HUGO_BINARY || (existsSync(local) ? local : 'hugo');
const child = spawn(executable, process.argv.slice(2), { stdio: 'inherit', windowsHide: true });
child.on('error', (error) => {
  console.error(`无法启动 Hugo：${error.message}\n请安装 Hugo 0.160.1，或设置 HUGO_BINARY。`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
