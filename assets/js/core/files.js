export function downloadFile(name, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function readTextFile(
  file,
  allowedExtensions = ['md', 'markdown'],
  maxBytes = MAX_FILE_BYTES,
) {
  const extension = file.name.split('.').at(-1).toLowerCase();
  if (!allowedExtensions.includes(extension))
    throw new Error(`${file.name}：请选择 ${allowedExtensions.join(' / ')} 文件。`);
  if (file.size > maxBytes)
    throw new Error(
      `${file.name}：文件超过 ${Math.round(maxBytes / 1024 / 1024)} MB，请拆分后导入。`,
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${file.name}：无法识别编码，请保存为 UTF-8 后重试。`);
  }
  if (text.includes('\u0000')) throw new Error(`${file.name}：这似乎不是文本文件。`);
  return text;
}
