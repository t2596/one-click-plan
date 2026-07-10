import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface FileParseResult {
  text: string;
  error?: string;
}

/**
 * 解析上传的文件内容为纯文本
 */
export async function parseFileContent(file: File): Promise<FileParseResult> {
  const name = file.name.toLowerCase();

  try {
    // 纯文本文件
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json')) {
      const text = await file.text();
      return { text };
    }

    // Word 文档
    if (name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value };
    }

    // Excel 文件
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const texts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csvText = XLSX.utils.sheet_to_csv(sheet);
        texts.push(`[工作表: ${sheetName}]\n${csvText}`);
      }

      return { text: texts.join('\n\n') };
    }

    return { text: '', error: `不支持的文件类型: ${name}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : '文件解析失败';
    return { text: '', error: message };
  }
}
