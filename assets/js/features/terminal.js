import { $ } from '../core/utils.js';
import { getIndex } from './search.js';
import { toggleTheme } from './shell.js';
export function initTerminal() {
  const history = [];
  let historyIndex = 0;
  const commands = {
    help: '可用命令：\n  about       关于这里\n  ls          列出花园路径\n  cd /posts   前往指定栏目\n  theme       切换深浅色\n  random      随机读一篇文章\n  date        显示本地时间\n  clear       清空终端\n  exit        关闭终端',
    about: 'Stolypin 的数字花园。\n记录技术、设计与日常。保持好奇，缓慢生长。',
    ls: '/posts  /notes  /projects  /library  /gallery\n/links  /about  /lab  /now  /archives  /bookmarks',
  };
  $('#terminal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#terminal-input'),
      command = input.value.trim();
    if (!command) return;
    history.push(command);
    historyIndex = history.length;
    input.value = '';
    const output = $('#terminal-output');
    const print = (text) => {
      const p = document.createElement('p');
      p.textContent = text;
      output.append(p);
      output.scrollTop = output.scrollHeight;
    };
    print(`❯ ${command}`);
    if (commands[command]) print(commands[command]);
    else if (command === 'clear') output.replaceChildren();
    else if (command === 'exit') $('#terminal-dialog').close();
    else if (command === 'theme') {
      toggleTheme();
      print('主题已切换。');
    } else if (command === 'date') print(new Date().toLocaleString('zh-CN'));
    else if (command.startsWith('cd ')) {
      const path = command.slice(3).replace(/\/$/, '');
      if (commands.ls.split(/\s+/).includes(path) || path === '') location.href = `${path}/`;
      else print('没有这个路径。输入 ls 查看可用路径。');
    } else if (command === 'random') {
      try {
        const posts = (await getIndex()).filter((x) => x.kind === 'posts');
        location.href = posts[Math.floor(Math.random() * posts.length)].url;
      } catch {
        print('文章索引暂时无法加载，请稍后重试。');
      }
    } else print(`未找到命令：${command}。输入 help 查看帮助。`);
  });
  $('#terminal-input').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.max(
        0,
        Math.min(history.length, historyIndex + (e.key === 'ArrowUp' ? -1 : 1)),
      );
      e.target.value = history[historyIndex] || '';
    }
  });
}
