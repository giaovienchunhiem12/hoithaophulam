/**
 * Tiện ích xử lý chuẩn mã hóa font tiếng Việt (UTF-8, Windows-1258, CSV BOM)
 * Khắc phục lỗi vỡ font tiếng Việt khi tải file CSV từ Excel và nhập lên hệ thống
 */

// Danh sách các mẫu lỗi font tiếng Việt phổ biến khi lưu file qua Excel Windows ANSI
const VIETNAMESE_REPAIR_MAP: [RegExp, string][] = [
  // Cụm từ chức danh & trường học
  [/Gio\s*vin\s*ch\?\s*nhi\?m/gi, 'Giáo viên chủ nhiệm'],
  [/Gi[aá]o\s*vi[eê]n\s*ch\?\s*nhi\?m/gi, 'Giáo viên chủ nhiệm'],
  [/Gio\s*vin/gi, 'Giáo viên'],
  [/ch\?\s*nhi\?m/gi, 'chủ nhiệm'],
  [/GVCN\s*ch\?\s*nhi\?m/gi, 'GVCN'],
  [/H\?i\s*thao/gi, 'Hội thao'],
  [/Th\?y/gi, 'Thầy'],
  [/C\s*V\?/gi, 'Cô Vũ'],
  [/C\s*Tr\?n/gi, 'Cô Trần'],
  [/C\s*L\?/gi, 'Cô Lê'],
  [/Tr\?ng/gi, 'Trường'],

  // Môn thể thao
  [/Bng\s* /gi, 'Bóng đá'],
  [/Bng\s*r\?/gi, 'Bóng rổ'],
  [/Bng\s*chu/gi, 'Bóng chuyền'],
  [/C\?u\s*lng/gi, 'Cầu lông'],
  [/K\?o\s*co/gi, 'Kéo co'],
  [/C\?\s*vua/gi, 'Cờ vua'],
  [/C\?\s*t\?ng/gi, 'Cờ tướng'],
  [/Bng\s*bn/gi, 'Bóng bàn'],

  // Tên & họ phổ biến tại Việt Nam
  [/Nguy\?n\s*V\?n/g, 'Nguyễn Văn'],
  [/Nguy\?n\s*Th\?/g, 'Nguyễn Thị'],
  [/Nguy\?n/g, 'Nguyễn'],
  [/Tr\?n\s*V\?n/g, 'Trần Văn'],
  [/Tr\?n\s*Th\?/g, 'Trần Thị'],
  [/Tr\?n/g, 'Trần'],
  [/L\?\s*V\?n/g, 'Lê Văn'],
  [/L\?\s*Th\?/g, 'Lê Thị'],
  [/Ph\?m\s*V\?n/g, 'Phạm Văn'],
  [/Ph\?m/g, 'Phạm'],
  [/Hong\s*V\?n/g, 'Hoàng Văn'],
  [/Hong/g, 'Hoàng'],
  [/\?ng\s*Ng\?c/g, 'Đặng Ngọc'],
  [/\?ng\s*V\?n/g, 'Đặng Văn'],
  [/\?ng/g, 'Đặng'],
  [/V\?\s*Th\?/g, 'Vũ Thị'],
  [/V\?\s*V\?n/g, 'Vũ Văn'],
  [/V\?/g, 'Vũ'],
  [/Bi\s*V\?n/g, 'Bùi Văn'],
  [/Bi/g, 'Bùi'],
  [/Thnh\s*vin/gi, 'Thành viên'],
  [/\?i\s*tr\?ng/gi, 'Đội trưởng'],
  [/V\?n\s*\?ng\s*vin/gi, 'Vận động viên'],
  [/V\?V/gi, 'VĐV']
];

/**
 * Tự động phục hồi các ký tự tiếng Việt bị lỗi dấu '?' hoặc lỗi giải mã byte từ Excel ANSI
 */
export function repairVietnameseText(text: string | undefined | null): string {
  if (!text) return '';
  let s = String(text);

  // Áp dụng bộ từ điển sửa lỗi phổ biến
  for (const [pattern, replacement] of VIETNAMESE_REPAIR_MAP) {
    s = s.replace(pattern, replacement);
  }

  // Dọn dẹp khoảng trắng thừa
  return s.trim();
}

/**
 * Tách dòng dữ liệu CSV có tính đến trường nằm trong dấu ngoặc kép ("...")
 */
export function parseCsvLine(textLine: string): string[] {
  // Nếu là dữ liệu copy/paste từ Excel (phân cách bằng phím Tab \t)
  if (textLine.includes('\t')) {
    return textLine.split('\t').map((c) => repairVietnameseText(c.trim().replace(/^["']|["']$/g, '')));
  }

  // Nếu là file CSV chuẩn (phân cách bằng dấu phẩy, có thể có ngoặc kép)
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < textLine.length; i++) {
    const char = textLine[i];
    if (char === '"') {
      if (inQuotes && textLine[i + 1] === '"') {
        current += '"';
        i++; // Bỏ qua dấu nháy kép escaping
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(repairVietnameseText(current.trim().replace(/^["']|["']$/g, '')));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(repairVietnameseText(current.trim().replace(/^["']|["']$/g, '')));
  return result;
}

/**
 * Giải mã file tải lên sang chuỗi UTF-8 chuẩn xác, có hỗ trợ UTF-8 BOM và Windows-1258
 */
export function decodeFileBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // 1. Kiểm tra UTF-8 BOM (0xEF, 0xBB, 0xBF)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes.slice(3));
  }

  // 2. Thử giải mã UTF-8 thông thường
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
    const utf8Text = utf8Decoder.decode(buffer);

    // Nếu văn bản không có nhiều ký tự lỗi replacement \uFFFD
    const replacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
    if (replacementCount <= 2) {
      return utf8Text;
    }

    // 3. Nếu có nhiều ký tự lỗi, thử giải mã Windows-1258 (Mã hóa tiếng Việt cũ của Excel Windows)
    try {
      const win1258Decoder = new TextDecoder('windows-1258');
      const winText = win1258Decoder.decode(buffer);
      const winErrors = (winText.match(/\uFFFD/g) || []).length;
      if (winErrors < replacementCount) {
        return winText;
      }
    } catch (_) {
      // Trình duyệt không hỗ trợ windows-1258 thì giữ nguyên utf8Text
    }

    return utf8Text;
  } catch (_) {
    const fallback = new TextDecoder('utf-8');
    return fallback.decode(buffer);
  }
}

/**
 * Tạo Blob file CSV kèm UTF-8 BOM (\uFEFF) giúp Microsoft Excel trên Windows luôn hiển thị đúng 100% tiếng Việt
 */
export function createUtf8BomCsvBlob(content: string): Blob {
  const bom = '\uFEFF';
  return new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
}
