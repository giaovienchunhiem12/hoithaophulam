import { createUtf8BomCsvBlob } from './vietnameseEncoding';

export type TemplateSportType = 'chess' | 'xiangqi' | 'caro' | 'team';

export interface SampleTemplateInfo {
  type: TemplateSportType;
  title: string;
  sportName: string;
  badge: string;
  description: string;
  filename: string;
  headers: string;
  rows: string[];
  isIndividual: boolean;
  fieldsDescription: string;
}

export const SAMPLE_TEMPLATES: Record<TemplateSportType, SampleTemplateInfo> = {
  chess: {
    type: 'chess',
    title: 'File Mẫu Cờ Vua',
    sportName: 'Cờ Vua',
    badge: 'Môn Cá Nhân',
    description: 'Danh sách thi đấu cá nhân môn Cờ Vua (Chỉ cần Họ & Tên và Đơn vị)',
    filename: 'File_Mau_Nhap_Lieu_Co_Vua_Ca_Nhan_UTF8.csv',
    headers: 'Họ và tên,Đơn vị',
    rows: [
      'Nguyễn Hoàng Anh,10A1',
      'Trần Tuấn Kiệt,10A2',
      'Lê Minh Khôi,11A1',
      'Phạm Nhật Huy,11A3',
      'Đỗ Quang Vinh,12A2',
      'Vũ Đình Nam,12A4',
      'Hoàng Khánh An,CLB Cờ Vua',
      'Trịnh Gia Bảo,CLB Trí Tuệ Trẻ'
    ],
    isIndividual: true,
    fieldsDescription: '2 Cột: [Họ và tên, Đơn vị] (Đơn vị có thể là Lớp như 10A1, hoặc CLB/Đoàn/Trường)'
  },
  xiangqi: {
    type: 'xiangqi',
    title: 'File Mẫu Cờ Tướng',
    sportName: 'Cờ Tướng',
    badge: 'Môn Cá Nhân',
    description: 'Danh sách thi đấu cá nhân môn Cờ Tướng (Chỉ cần Họ & Tên và Đơn vị)',
    filename: 'File_Mau_Nhap_Lieu_Co_Tuong_Ca_Nhan_UTF8.csv',
    headers: 'Họ và tên,Đơn vị',
    rows: [
      'Lê Tấn Phát,10A1',
      'Phan Đình Trọng,10A3',
      'Võ Minh Trí,11A2',
      'Nguyễn Thế Hùng,11A4',
      'Trịnh Công Minh,12A1',
      'Trần Quốc Toản,12A3',
      'Hà Văn Quyết,CLB Cờ Tướng',
      'Lâm Chí Dũng,Đoàn Trường'
    ],
    isIndividual: true,
    fieldsDescription: '2 Cột: [Họ và tên, Đơn vị] (Đơn vị có thể là Lớp như 10A1, hoặc CLB/Đoàn/Trường)'
  },
  caro: {
    type: 'caro',
    title: 'File Mẫu Cờ Caro',
    sportName: 'Cờ Caro',
    badge: 'Môn Cá Nhân',
    description: 'Danh sách thi đấu cá nhân môn Cờ Caro (Chỉ cần Họ & Tên và Đơn vị)',
    filename: 'File_Mau_Nhap_Lieu_Co_Caro_Ca_Nhan_UTF8.csv',
    headers: 'Họ và tên,Đơn vị',
    rows: [
      'Đặng Mai Hương,10A2',
      'Trần Bảo Ngọc,10A4',
      'Bùi Hải Đăng,11A1',
      'Nguyễn Khánh Linh,11A3',
      'Lê Anh Khoa,12A3',
      'Phạm Thùy Chi,12A5',
      'Đoàn Hải Nam,CLB Thể Thao',
      'Vũ Minh Châu,Đoàn Thanh Niên'
    ],
    isIndividual: true,
    fieldsDescription: '2 Cột: [Họ và tên, Đơn vị] (Đơn vị có thể là Lớp như 10A1, hoặc CLB/Đoàn/Trường)'
  },
  team: {
    type: 'team',
    title: 'File Mẫu Môn Tập Thể',
    sportName: 'Bóng đá / Bóng rổ / Kéo co',
    badge: 'Môn Tập Thể',
    description: 'Danh sách đội thi đấu tập thể các môn bóng đá, bóng rổ, kéo co, bóng chuyền...',
    filename: 'File_Mau_Nhap_Lieu_Tap_The_BongDa_BongRo_UTF8.csv',
    headers: 'Tên_Lớp_Đội,Khối,Đội_Trưởng,Số_Điện_Thoại,GVCN_HLV,Môn_Thi_Đấu,Danh_Sách_VĐV',
    rows: [
      '10A1,10,Nguyễn Văn A,0901122334,Thầy Nguyễn Văn Đức,Bóng đá,"Nguyễn Văn A; Trần Văn B; Lê Văn C; Phạm Văn D"',
      '10A2,10,Trần Minh Quân,0902233445,Cô Trần Thu Trang,Bóng đá,"Trần Minh Quân; Đỗ Thành Long; Nguyễn Anh Tuấn; Lê Tấn Lộc"',
      '11A1,11,Nguyễn Mai Chi,0911122334,Thầy Hoàng Tiến Dũng,Bóng rổ,"Nguyễn Mai Chi; Trần Văn Duy; Lê Quốc Khánh; Vũ Minh Hải"',
      '11A2,11,Lê Minh Triết,0912233445,Cô Vũ Thị Hà,Bóng rổ,"Lê Minh Triết; Ngô Tấn Tài; Vũ Quốc Huy; Bùi Việt Cường"',
      '12A1,12,Trần Hoàng Nam,0913344556,Thầy Phan Thanh Tùng,Kéo co,"Trần Hoàng Nam; Nguyễn Quốc Bảo; Phạm Minh Tuấn; Đặng Hải Long"',
      '12A2,12,Phạm Văn Hùng,0914455667,Cô Lê Thị Mai,Kéo co,"Phạm Văn Hùng; Hoàng Quốc Việt; Lê Tấn Phát; Trịnh Công Sơn"'
    ],
    isIndividual: false,
    fieldsDescription: '7 Cột: [Tên_Lớp_Đội, Khối, Đội_Trưởng, Số_Điện_Thoại, GVCN_HLV, Môn_Thi_Đấu, Danh_Sách_VĐV]'
  }
};

/**
 * Kiểm tra xem một môn thể thao có phải là môn thi đấu cá nhân (Cờ vua, cờ tướng, cờ caro) không
 */
export function isIndividualSport(sportId: string): boolean {
  return sportId === 'chess' || sportId === 'xiangqi' || sportId === 'caro';
}

/**
 * Lấy nội dung file mẫu dạng text CSV
 */
export function getSampleTemplateString(type: TemplateSportType): string {
  const t = SAMPLE_TEMPLATES[type] || SAMPLE_TEMPLATES.chess;
  return `${t.headers}\n${t.rows.join('\n')}\n`;
}

/**
 * Tải file mẫu CSV kèm UTF-8 BOM để mở trên Excel không bị lỗi font tiếng Việt
 */
export function downloadSampleTemplate(type: TemplateSportType): string {
  const t = SAMPLE_TEMPLATES[type] || SAMPLE_TEMPLATES.chess;
  const content = getSampleTemplateString(type);
  const blob = createUtf8BomCsvBlob(content);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', t.filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return t.filename;
}
