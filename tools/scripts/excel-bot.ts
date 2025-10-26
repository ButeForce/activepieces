/*
  Excel Chat Bot (ECC-1:2018 assistant)
  - Loads a specified .xlsx file
  - Parses Arabic headers for ECC tables (Prerequisite and Evidence list)
  - Provides a simple chat-like CLI to:
    - show <id> / عرض <id>
    - status <id> / ما حالة <id>
    - search <text> / ابحث <text>
    - set <id> <field> <value> / عدّل <field> <id> إلى <value>
    - list pending (الحالة غير محددة)
    - save [as <path>] / احفظ [كـ <path>]
    - sheet / use <sheet> (قائمة/اختيار الورقة)
    - help / exit
  - Preserves original header order on save
*/

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import * as XLSX from 'xlsx';

function trim(str: string | undefined | null): string {
  return (str ?? '').toString().trim();
}

function normalizeSpace(str: string): string {
  return trim(str).replace(/\s+/g, ' ');
}

function toArabicDigitsAwareNumber(val: unknown): number | null {
  const s = trim(String(val ?? ''));
  if (!s) return null;
  // Convert Arabic-Indic digits to ASCII
  const map: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const ascii = s.replace(/[\u0660-\u0669]/g, (d) => map[d] ?? d);
  const m = ascii.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function loadWorkbook(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Workbook has no sheets.');
  }
  return { workbook, sheetNames };
}

function getSheetData(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (aoa.length === 0) return { headers: [] as string[], rows: [] as any[] };
  const headerRow = (aoa[0] as any[]).map((h) => normalizeSpace(String(h ?? '')));
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  // Normalize keys to the normalized header variants
  const normalizedRows = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const key of Object.keys(r)) {
      const normKey = normalizeSpace(key);
      o[normKey] = (r as any)[key];
    }
    return o;
  });
  return { headers: headerRow, rows: normalizedRows };
}

function saveSheet(workbook: XLSX.WorkBook, sheetName: string, headers: string[], rows: Record<string, unknown>[], outPath: string) {
  const aoa: any[][] = [];
  aoa.push(headers);
  for (const row of rows) {
    aoa.push(headers.map((h) => (row[h] ?? '')));
  }
  const newSheet = XLSX.utils.aoa_to_sheet(aoa);
  workbook.Sheets[sheetName] = newSheet;
  XLSX.writeFile(workbook, outPath);
}

function pickHeader(headers: string[], aliases: (string | RegExp)[]): string | undefined {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) =>
      typeof alias === 'string' ? h.includes(alias) : alias.test(h)
    );
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

function guessIdHeader(headers: string[]): string | undefined {
  // Common id header is "#"; fallback to exact Arabic "الرقم" or startswith 'رقم البند'
  return pickHeader(headers, ['#', /^\s*#\s*$/, /^\s*الرقم\s*$/]);
}

function detectCommonHeaders(headers: string[]) {
  const id = guessIdHeader(headers);
  const status = pickHeader(headers, ['الحالة', /status/i]);
  const notes = pickHeader(headers, ['ملاحظات']);
  const reqDate = pickHeader(headers, ['تاريخ إرسال']);
  const ackDate = pickHeader(headers, ['تاريخ استلام']);
  const contactName = pickHeader(headers, ['اسم الشخص']);
  const contactInfo = pickHeader(headers, ['عنوان التواصل', 'البريد', 'الهاتف']);
  const titleAr = pickHeader(headers, ['قائمة الأدلة', 'المتطلبات']);
  const controlNo = pickHeader(headers, ['رقم الضابط']);
  return { id, status, notes, reqDate, ackDate, contactName, contactInfo, titleAr, controlNo };
}

function findRowById(rows: Record<string, unknown>[], idHeader: string | undefined, idValue: number) {
  if (!idHeader) return { index: -1, row: undefined as any };
  const index = rows.findIndex((r) => toArabicDigitsAwareNumber(r[idHeader]) === idValue);
  return { index, row: index >= 0 ? rows[index] : undefined };
}

function formatRow(headers: string[], row: Record<string, unknown> | undefined): string {
  if (!row) return 'لا يوجد بند مطابق';
  const lines: string[] = [];
  for (const h of headers) {
    lines.push(`${h}: ${row[h] ?? ''}`);
  }
  return lines.join('\n');
}

function isPendingStatus(statusVal: unknown): boolean {
  const s = normalizeSpace(String(statusVal ?? ''));
  if (!s) return true;
  const pendingPhrases = ['يرجى تحديد الحالة', 'بحاجة لتأكيد', 'غير متوفر'];
  return pendingPhrases.some((p) => s.includes(p));
}

function buildHelp(): string {
  return [
    'أوامر متاحة:',
    '- help | ?                               عرض المساعدة',
    '- exit | quit                            إنهاء',
    '- sheet                                   عرض أسماء الأوراق',
    '- use <sheetName>                         اختيار ورقة',
    '- show <id> | عرض <id>                   عرض تفاصيل البند',
    '- status <id> | ما حالة <id>             عرض حالة البند',
    '- search <text> | ابحث <text>            بحث نصي',
    '- list pending                            عرض البنود غير المقفلة',
    '- set <id> <field> <value>               تعديل قيمة حقل',
    '- set <field> <id> <value>               صيغة بديلة للتعديل',
    '- save [as <path>] | احفظ [كـ <path>]    حفظ التغييرات',
  ].join('\n');
}

function resolveFieldHeader(headers: string[], userField: string): string | undefined {
  const f = normalizeSpace(userField);
  const aliasGroups: Array<{ key: string; aliases: (string | RegExp)[] }> = [
    { key: 'الحالة', aliases: ['الحالة', /status/i] },
    { key: 'ملاحظات', aliases: ['ملاحظات'] },
    { key: 'اسم الشخص', aliases: ['اسم الشخص', 'اسم الشخص المعني'] },
    { key: 'عنوان التواصل (البريد، الهاتف)', aliases: ['عنوان التواصل', 'البريد', 'الهاتف'] },
    { key: 'تاريخ إرسال الطلب للجهة', aliases: ['تاريخ إرسال'] },
    { key: 'تاريخ استلام تأكيد الجهة على تجهيز الأدلة', aliases: ['تاريخ استلام'] },
    { key: '#', aliases: ['#', /^\s*#\s*$/] },
    { key: 'قائمة الأدلة', aliases: ['قائمة الأدلة'] },
    { key: 'المتطلبات', aliases: ['المتطلبات'] },
    { key: 'رقم الضابط الأساسي - الفرعي', aliases: ['رقم الضابط'] },
  ];
  // If exact header exists, return it
  if (headers.includes(f)) return f;
  for (const g of aliasGroups) {
    const match = pickHeader(headers, g.aliases);
    if (match && (f.includes(trim(String(g.key))) || g.aliases.some((a) => typeof a === 'string' ? f.includes(a) : a.test(f)))) {
      return match;
    }
  }
  // Fallback: find header that contains the field text
  return headers.find((h) => h.includes(f));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: npx ts-node tools/scripts/excel-bot.ts <excel-file> [--sheet <name>]');
    process.exit(1);
  }

  const fileIdx = args.findIndex((a) => !a.startsWith('--'));
  const filePath = path.resolve(process.cwd(), args[fileIdx]);
  const sheetArgIdx = args.findIndex((a) => a === '--sheet');
  let preferredSheet = sheetArgIdx !== -1 ? args[sheetArgIdx + 1] : undefined;

  const { workbook, sheetNames } = loadWorkbook(filePath);
  let activeSheet = preferredSheet && sheetNames.includes(preferredSheet) ? preferredSheet : sheetNames[0];

  let { headers, rows } = getSheetData(workbook, activeSheet);
  let headerHints = detectCommonHeaders(headers);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  console.log(`Loaded: ${filePath}`);
  console.log(`Sheets: ${sheetNames.join(', ')}`);
  console.log(`Using sheet: ${activeSheet}`);
  console.log(buildHelp());

  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  while (true) {
    const input = normalizeSpace(await ask('\n> '));
    if (!input) continue;

    // Exit
    if (/^(exit|quit|خروج)$/i.test(input)) {
      break;
    }

    // Help
    if (/^(help|\?|مساعدة)$/i.test(input)) {
      console.log(buildHelp());
      continue;
    }

    // List sheets
    if (/^sheet$/i.test(input) || /^الأوراق$/i.test(input)) {
      console.log(`Sheets: ${sheetNames.join(', ')}`);
      continue;
    }

    // Use sheet
    const useMatch = input.match(/^use\s+(.+)$/i) || input.match(/^اختر\s+(.+)$/);
    if (useMatch) {
      const name = normalizeSpace(useMatch[1]);
      if (!sheetNames.includes(name)) {
        console.log('Sheet not found.');
        continue;
      }
      activeSheet = name;
      ({ headers, rows } = getSheetData(workbook, activeSheet));
      headerHints = detectCommonHeaders(headers);
      console.log(`Using sheet: ${activeSheet}`);
      continue;
    }

    // Show row by id
    const showMatch = input.match(/^(show|عرض)\s+(\d+)/i);
    if (showMatch) {
      const id = Number(showMatch[2]);
      const { index, row } = findRowById(rows, headerHints.id, id);
      console.log(index >= 0 ? formatRow(headers, row) : 'لا يوجد بند مطابق');
      continue;
    }

    // Status of id
    const statusMatch = input.match(/^(status|ما حالة)\s+(\d+)/i);
    if (statusMatch) {
      const id = Number(statusMatch[2]);
      const { row } = findRowById(rows, headerHints.id, id);
      if (!row) { console.log('لا يوجد بند مطابق'); continue; }
      const statusVal = headerHints.status ? row[headerHints.status] : undefined;
      console.log(statusVal ? String(statusVal) : 'غير محدد');
      continue;
    }

    // Search text
    const searchMatch = input.match(/^(search|ابحث)\s+(.+)/i);
    if (searchMatch) {
      const q = normalizeSpace(searchMatch[2]);
      const titleHeader = headerHints.titleAr ?? headers[0];
      const results = rows.filter((r) =>
        String(r[titleHeader] ?? '').includes(q) || String(r[headerHints.notes ?? ''] ?? '').includes(q)
      );
      for (const r of results.slice(0, 20)) {
        const idVal = headerHints.id ? r[headerHints.id] : '';
        console.log(`#${idVal} - ${String(r[titleHeader] ?? '')}`);
      }
      if (results.length > 20) console.log(`... والمزيد (${results.length - 20})`);
      if (results.length === 0) console.log('لا نتائج');
      continue;
    }

    // List pending
    if (/^list\s+pending$/i.test(input) || /^عرض\s+غير\s+مقفلة$/.test(input)) {
      const pending: Array<{ id: string; title: string; status: string }> = [];
      const titleHeader = headerHints.titleAr ?? headers[0];
      for (const r of rows) {
        const st = headerHints.status ? r[headerHints.status] : '';
        if (isPendingStatus(st)) {
          pending.push({
            id: String(headerHints.id ? r[headerHints.id] : ''),
            title: String(r[titleHeader] ?? ''),
            status: String(st ?? ''),
          });
        }
      }
      if (pending.length === 0) {
        console.log('لا توجد بنود معلّقة');
      } else {
        for (const p of pending.slice(0, 50)) {
          console.log(`#${p.id} | ${p.title} | ${p.status || 'غير محدد'}`);
        }
        if (pending.length > 50) console.log(`... والمزيد (${pending.length - 50})`);
      }
      continue;
    }

    // Save
    const saveMatch = input.match(/^(save|احفظ)(?:\s+(?:as|كـ)\s+(.+))?$/i);
    if (saveMatch) {
      const out = saveMatch[2] ? path.resolve(process.cwd(), saveMatch[2]) : filePath;
      saveSheet(workbook, activeSheet, headers, rows, out);
      console.log(`Saved to ${out}`);
      continue;
    }

    // Set (two syntaxes):
    // 1) set <id> <field> <value>
    // 2) set <field> <id> <value>
    const setMatch1 = input.match(/^set\s+(\d+)\s+([^\s]+)\s+(.+)$/i) || input.match(/^(عدّل|حدث|حدد)\s+(\d+)\s+([^\s]+)\s+(.+)$/);
    const setMatch2 = input.match(/^set\s+([^\s]+)\s+(\d+)\s+(.+)$/i) || input.match(/^(عدّل|حدث|حدد)\s+([^\s]+)\s+(\d+)\s+(.+)$/);

    if (setMatch1 || setMatch2) {
      let idNum: number | null = null;
      let fieldToken = '';
      let valueToken = '';

      if (setMatch1) {
        const mm = setMatch1;
        idNum = Number(mm[1]);
        fieldToken = normalizeSpace(mm[2]);
        valueToken = normalizeSpace(mm[3]);
      } else if (setMatch2) {
        const mm = setMatch2;
        fieldToken = normalizeSpace(mm[1] ?? mm[2]);
        idNum = Number(mm[2] ?? mm[3]);
        valueToken = normalizeSpace(mm[3] ?? mm[4]);
      }

      if (idNum == null || Number.isNaN(idNum)) {
        console.log('لم يتم فهم رقم البند');
        continue;
      }

      const fieldHeader = resolveFieldHeader(headers, fieldToken);
      if (!fieldHeader) {
        console.log('لم يتم العثور على الحقل المطلوب');
        continue;
      }

      const { index } = findRowById(rows, headerHints.id, idNum);
      if (index < 0) {
        console.log('لا يوجد بند مطابق');
        continue;
      }

      rows[index][fieldHeader] = valueToken;
      console.log(`تم التحديث: #${idNum} | ${fieldHeader} = ${valueToken}`);
      continue;
    }

    // Natural language: "ما حالة 74" handled above; Try a very light Arabic pattern for set
    const simpleArSet = input.match(/^(?:عين|اجعل|غيّر)\s+(الحالة|ملاحظات|اسم الشخص|عنوان التواصل)\s+(\d+)\s+إلى\s+(.+)$/);
    if (simpleArSet) {
      const fieldHeader = resolveFieldHeader(headers, simpleArSet[1]);
      const idNum = Number(simpleArSet[2]);
      const value = normalizeSpace(simpleArSet[3]);
      const { index } = findRowById(rows, headerHints.id, idNum);
      if (index >= 0 && fieldHeader) {
        rows[index][fieldHeader] = value;
        console.log(`تم التحديث: #${idNum} | ${fieldHeader} = ${value}`);
      } else {
        console.log('لم يتم العثور على البند أو الحقل');
      }
      continue;
    }

    console.log('تعذر فهم الأمر. اكتب help للمساعدة.');
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
