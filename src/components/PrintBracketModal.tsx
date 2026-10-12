import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Match, SportCategory, Registration } from '../types/sports';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { 
  Printer, X, Trophy, 
  Layers, Download, FileText, RefreshCw, ZoomIn, ZoomOut, CheckCircle2
} from 'lucide-react';

interface PrintBracketModalProps {
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  selectedSportId: string;
  onClose: () => void;
}

export const PrintBracketModal: React.FC<PrintBracketModalProps> = ({
  matches,
  sports,
  selectedSportId,
  onClose
}) => {
  // Print Scope
  const [printScope, setPrintScope] = useState<'tree_symmetrical' | 'group_a' | 'group_b' | 'finals' | 'list_table'>('tree_symmetrical');
  
  // Customization Options
  const [showScores, setShowScores] = useState<boolean>(true);
  const [showDatesTimes, setShowDatesTimes] = useState<boolean>(true);
  const [showVenues, setShowVenues] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);

  // Zoom control for on-screen modal preview
  const [diagramZoom, setDiagramZoom] = useState<number>(85);

  // Export & Print State
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Active Sport
  const currentSport = useMemo(() => {
    return sports.find((s) => s.id === selectedSportId) || sports[0] || { id: 'soccer', name: 'Bóng đá', venue: 'Sân bóng đá cỏ nhân tạo' };
  }, [sports, selectedSportId]);

  // Filter sport matches
  const sportMatches = useMemo(() => {
    return selectedSportId === 'all'
      ? matches
      : matches.filter((m) => m.sportId === selectedSportId);
  }, [matches, selectedSportId]);

  // Group A & B matches
  const groupARound1 = useMemo(() => {
    return sportMatches.filter(
      (m) => m.groupName === 'Bảng A' && (m.stage === 'Vòng bảng' || m.id.includes('R1') || m.subCategory?.includes('Cặp') || m.subCategory?.includes('Trận 1') || m.subCategory?.includes('Trận 2') || m.subCategory?.includes('Trận 3') || m.subCategory?.includes('Trận 4') || m.subCategory?.includes('Trận 5'))
    );
  }, [sportMatches]);

  const groupBRound1 = useMemo(() => {
    return sportMatches.filter(
      (m) => m.groupName === 'Bảng B' && (m.stage === 'Vòng bảng' || m.id.includes('R1') || m.subCategory?.includes('Cặp') || m.subCategory?.includes('Trận 1') || m.subCategory?.includes('Trận 2') || m.subCategory?.includes('Trận 3') || m.subCategory?.includes('Trận 4') || m.subCategory?.includes('Trận 5'))
    );
  }, [sportMatches]);

  const groupAPlayoff = useMemo(() => {
    return sportMatches.find(
      (m) => m.groupName === 'Bảng A' && (m.subCategory?.includes('Playoff') || m.id.includes('PO-GA'))
    );
  }, [sportMatches]);

  const groupBPlayoff = useMemo(() => {
    return sportMatches.find(
      (m) => m.groupName === 'Bảng B' && (m.subCategory?.includes('Playoff') || m.id.includes('PO-GB'))
    );
  }, [sportMatches]);

  const groupASemis = useMemo(() => {
    return sportMatches.filter(
      (m) => m.groupName === 'Bảng A' && m.stage === 'Bán kết'
    );
  }, [sportMatches]);

  const groupBSemis = useMemo(() => {
    return sportMatches.filter(
      (m) => m.groupName === 'Bảng B' && m.stage === 'Bán kết'
    );
  }, [sportMatches]);

  const groupAFinal = useMemo(() => {
    return sportMatches.find(
      (m) => m.groupName === 'Bảng A' && (m.stage === 'Chung kết' || m.subCategory?.includes('Chung Kết Bảng'))
    );
  }, [sportMatches]);

  const groupBFinal = useMemo(() => {
    return sportMatches.find(
      (m) => m.groupName === 'Bảng B' && (m.stage === 'Chung kết' || m.subCategory?.includes('Chung Kết Bảng'))
    );
  }, [sportMatches]);

  // Grand finals & Bronze
  const grandFinal = useMemo(() => {
    return sportMatches.find(
      (m) => m.stage === 'Chung kết' && (m.subCategory?.includes('Toàn Trường') || m.groupName?.includes('Toàn Trường') || m.id.includes('GRAND-FIN'))
    );
  }, [sportMatches]);

  const bronzeMatch = useMemo(() => {
    return sportMatches.find(
      (m) => m.stage === 'Trận Tranh Hạng 3' || m.subCategory?.includes('Hạng 3') || m.id.includes('BRONZE')
    );
  }, [sportMatches]);

  // 1. CHỨC NĂNG XUẤT TỆP IN PDF: ĐẦY TRANG A4 NẰM NGANG, KHÔNG CẮT CHÂN, KHÔNG THỪA KHOẢNG TRẮNG
  const handleExportPdf = async (showToast: boolean = true): Promise<boolean> => {
    if (!printContainerRef.current) return false;
    try {
      setIsExportingPdf(true);
      if (showToast) setExportSuccessMsg(null);

      // Render the unclipped 1140px x 780px canvas
      const dataUrl = await toPng(printContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 1140,
        height: 780,
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('print-ignore')) {
            return false;
          }
          return true;
        }
      });

      // A4 Landscape: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Tràn đầy trang A4 Landscape: 284mm rộng, 198mm cao, căn đều 6.5mm trái/phải, 6mm trên/dưới
      pdf.addImage(dataUrl, 'PNG', 6.5, 6, 284, 198);

      const filename = `So-Do-Thi-Dau-Full-Trang-A4-${currentSport.name.replace(/\s+/g, '-')}-THPT-Phu-Lam.pdf`;
      pdf.save(filename);

      if (showToast) {
        setExportSuccessMsg('✅ Đã xuất tệp PDF tràn đầy 1 trang A4 nằm ngang không bị mất chữ!');
        setTimeout(() => setExportSuccessMsg(null), 5000);
      }
      return true;
    } catch (err: unknown) {
      console.warn('Could not generate PDF:', err);
      if (showToast) {
        setExportSuccessMsg('⚠️ Không thể xuất PDF. Vui lòng bấm "In Ngay" hoặc "Tải Ảnh Sơ Đồ (PNG)"!');
        setTimeout(() => setExportSuccessMsg(null), 5000);
      }
      return false;
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. CHỨC NĂNG IN NGAY: THỰC THI LỆNH IN & XUẤT BẢN IN NGAY LẬP TỨC
  const handleInstantPrint = async () => {
    setIsPrinting(true);
    setExportSuccessMsg('🖨️ Đang thực hiện in...');

    // A. Kích hoạt trực tiếp window.print()
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Lỗi gọi window.print():', err);
    }

    // B. Đồng thời xuất tệp PDF A4 chuẩn tràn đầy trang tải về máy
    await handleExportPdf(false);

    setExportSuccessMsg('✅ Đã thực hiện in! (Hộp thoại in đã kích hoạt và tệp PDF chuẩn full 1 trang A4 đã được lưu về máy).');
    setTimeout(() => setExportSuccessMsg(null), 6000);
    setIsPrinting(false);
  };

  // 3. Xuất file ảnh PNG độ nét cao (2x) có đầy đủ đường nối
  const handleExportPng = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsExportingPng(true);
      setExportSuccessMsg(null);
      
      const dataUrl = await toPng(printContainerRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 1140,
        height: 780,
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('print-ignore')) {
            return false;
          }
          return true;
        }
      });

      const link = document.createElement('a');
      link.download = `So-Do-Thi-Dau-Full-Trang-${currentSport.name.replace(/\s+/g, '-')}-THPT-Phu-Lam.png`;
      link.href = dataUrl;
      link.click();

      setExportSuccessMsg('✅ Đã tải file ảnh PNG độ nét cao (2x) tràn đầy trang in!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.warn('Could not export PNG:', err);
      setExportSuccessMsg('Không thể xuất PNG. Vui lòng bấm "In Ngay" để in trực tiếp qua trình duyệt!');
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } finally {
      setIsExportingPng(false);
    }
  };

  // Proportional Match Card Renderer (No Truncation)
  const ProportionalMatchCard = ({
    match,
    title,
    badge,
    badgeColor = 'blue',
    defaultTeamA = 'Đội 1',
    defaultTeamB = 'Đội 2',
    style,
    isGrandFinal = false
  }: {
    match?: Match;
    title: string;
    badge?: string;
    badgeColor?: 'blue' | 'emerald' | 'amber' | 'gold' | 'purple';
    defaultTeamA?: string;
    defaultTeamB?: string;
    style?: React.CSSProperties;
    isGrandFinal?: boolean;
  }) => {
    const teamA = match?.teamA || defaultTeamA;
    const teamB = match?.teamB || defaultTeamB;
    const isFinished = match?.status === 'Finished' && match?.scoreA !== undefined && match?.scoreB !== undefined;
    const scoreA = showScores && match?.scoreA !== undefined ? match.scoreA : '-';
    const scoreB = showScores && match?.scoreB !== undefined ? match.scoreB : '-';
    const isWinA = isFinished && match?.scoreA !== undefined && match?.scoreB !== undefined && match.scoreA > match.scoreB;
    const isWinB = isFinished && match?.scoreA !== undefined && match?.scoreB !== undefined && match.scoreB > match.scoreA;

    return (
      <div
        style={style}
        className={`absolute rounded-xl border border-slate-800 bg-white shadow-xs flex flex-col justify-between overflow-hidden leading-tight select-none transition-all ${
          isGrandFinal 
            ? 'border-2 border-amber-500 ring-2 ring-amber-300 shadow-md z-10' 
            : ''
        }`}
      >
        {/* Card Header Bar */}
        <div className={`px-1.5 py-0.5 flex items-center justify-between border-b rounded-t-xl ${
          isGrandFinal
            ? 'bg-gradient-to-r from-amber-200 to-amber-300 border-amber-400 text-amber-950 font-black'
            : badgeColor === 'emerald'
            ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950 font-black'
            : badgeColor === 'amber'
            ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-black'
            : badgeColor === 'gold'
            ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
            : 'bg-slate-100 border-slate-300 text-slate-800 font-bold'
        }`}>
          <span className="font-sans font-extrabold tracking-tight text-[9px] text-slate-950 shrink-0">
            {title}
          </span>
          {badge && (
            <span className={`text-[7.5px] font-black px-1 py-0.2 rounded uppercase tracking-wider shrink-0 leading-none ${
              badgeColor === 'emerald' 
                ? 'bg-emerald-700 text-white' 
                : badgeColor === 'amber'
                ? 'bg-amber-600 text-white'
                : badgeColor === 'gold'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {badge}
            </span>
          )}
        </div>

        {/* Team Rows */}
        <div className="p-1 space-y-0.5 text-[9.5px]">
          {/* Team A */}
          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded leading-none ${
            isWinA ? 'bg-amber-100 font-black text-slate-950' : 'text-slate-800 font-bold'
          }`}>
            <span className="truncate max-w-[84px] flex items-center gap-0.5" title={teamA}>
              <span>{teamA}</span>
              {isWinA && <span className="text-[8px]">👑</span>}
            </span>
            <span className="font-mono font-black text-[9.5px] ml-1 bg-slate-100 px-1 rounded shrink-0">
              {scoreA}
            </span>
          </div>

          <div className="border-t border-dashed border-slate-200"></div>

          {/* Team B */}
          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded leading-none ${
            isWinB ? 'bg-amber-100 font-black text-slate-950' : 'text-slate-800 font-bold'
          }`}>
            <span className="truncate max-w-[84px] flex items-center gap-0.5" title={teamB}>
              <span>{teamB}</span>
              {isWinB && <span className="text-[8px]">👑</span>}
            </span>
            <span className="font-mono font-black text-[9.5px] ml-1 bg-slate-100 px-1 rounded shrink-0">
              {scoreB}
            </span>
          </div>
        </div>

        {/* Optional date & venue tag */}
        {showDatesTimes && match?.time && (
          <div className="px-1.5 py-0.2 bg-slate-50 border-t border-slate-200 text-[7.5px] text-slate-500 flex items-center justify-between font-mono leading-none">
            <span className="truncate">{match.time}</span>
            {showVenues && match?.venue && <span className="truncate max-w-[50px]">{match.venue}</span>}
          </div>
        )}
      </div>
    );
  };

  const modalNode = (
    <div 
      id="print-bracket-portal-container"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:static print:inset-auto"
    >
      
      {/* Modal Dialog */}
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-300 w-full max-w-[1240px] max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:overflow-visible print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Ẩn hoàn toàn khi in) */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b-4 border-amber-400 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-sans tracking-tight flex items-center gap-2">
                <span>In Sơ Đồ Thi Đấu (Đầy Đủ 1 Trang A4 Nằm Ngang)</span>
                <span className="text-[9px] bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase">
                  FULL TRANG A4 NẰM NGANG
                </span>
              </h2>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Môn: <strong className="text-amber-300">{currentSport.name}</strong> · Bản in trải đều full 100% diện tích trang A4 Landscape không bị cắt chân hay mất chữ ký
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* BUTTON 1: IN NGAY */}
            <button
              onClick={handleInstantPrint}
              disabled={isPrinting || isExportingPdf || isExportingPng}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 border border-amber-200"
              title="Nhấn để thực hiện in ngay lập tức"
            >
              {isPrinting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-950" />
              ) : (
                <Printer className="w-4 h-4 text-blue-950" />
              )}
              <span>{isPrinting ? 'Đang thực hiện in...' : 'In Ngay (Khổ Ngang 1 Trang)'}</span>
            </button>

            {/* BUTTON 2: XUẤT FILE PDF 1 TRANG FULL */}
            <button
              onClick={() => handleExportPdf(true)}
              disabled={isPrinting || isExportingPdf || isExportingPng}
              className="px-3.5 py-2.5 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải tệp PDF chuẩn khổ A4 Landscape 1 trang duy nhất tràn đầy trang in"
            >
              {isExportingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải File PDF (A4 Full)'}</span>
            </button>

            {/* BUTTON 3: TẢI ẢNH PNG */}
            <button
              onClick={handleExportPng}
              disabled={isPrinting || isExportingPng || isExportingPdf}
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải ảnh PNG độ nét cao (2x) có đầy đủ đường vẽ nối để gửi Zalo hoặc in ấn"
            >
              {isExportingPng ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExportingPng ? 'Đang xuất PNG...' : 'Tải Ảnh Sơ Đồ (PNG)'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls (Ẩn khi in) */}
        <div className="bg-slate-50 border-b border-slate-200 p-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shrink-0">
          
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-900" />
              <span>Phạm vi in:</span>
            </span>
            <div className="bg-white border border-slate-300 rounded-xl p-0.5 flex items-center gap-1 shadow-xs flex-wrap">
              <button
                onClick={() => setPrintScope('tree_symmetrical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  printScope === 'tree_symmetrical'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                🌳 Sơ Đồ Toàn Diện (Full Trang Canh Giữa)
              </button>
              <button
                onClick={() => setPrintScope('group_a')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printScope === 'group_a'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Nhánh Bảng A
              </button>
              <button
                onClick={() => setPrintScope('group_b')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printScope === 'group_b'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Nhánh Bảng B
              </button>
              <button
                onClick={() => setPrintScope('finals')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printScope === 'finals'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Chung Kết
              </button>
              <button
                onClick={() => setPrintScope('list_table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  printScope === 'list_table'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                📋 Bảng Danh Sách Trận
              </button>
            </div>
          </div>

          {/* Zoom Controls & Toggles */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded-xl shadow-xs">
              <button
                onClick={() => setDiagramZoom((prev) => Math.max(60, prev - 10))}
                title="Thu nhỏ xem trên màn hình"
                className="p-1 text-slate-600 hover:text-blue-950 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-xs px-1 text-blue-950">{diagramZoom}%</span>
              <button
                onClick={() => setDiagramZoom((prev) => Math.min(120, prev + 10))}
                title="Phóng to xem trên màn hình"
                className="p-1 text-slate-600 hover:text-blue-950 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDiagramZoom(85)}
                className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded text-slate-700 ml-0.5 cursor-pointer"
              >
                Vừa màn hình
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap text-xs font-bold text-slate-700">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-900 border-slate-300 focus:ring-0"
                />
                <span>Tỉ số</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDatesTimes}
                  onChange={(e) => setShowDatesTimes(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-900 border-slate-300 focus:ring-0"
                />
                <span>Giờ đấu</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-900 border-slate-300 focus:ring-0"
                />
                <span>Chữ ký BTC</span>
              </label>
            </div>
          </div>
        </div>

        {/* Thông báo hướng dẫn in đẹp & Toast */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              💡 Bản in đã được thiết lập kích thước chuẩn `1140px × 780px` để <strong>tràn đầy 100% trang A4 nằm ngang</strong>, giữ nguyên chữ ký và chú thích.
            </span>
          </div>
          {exportSuccessMsg && (
            <span className="font-bold text-emerald-800 ml-2 animate-pulse">{exportSuccessMsg}</span>
          )}
        </div>

        {/* =================================================================== */}
        {/* MODAL VIEWPORT CONTAINER (Hỗ trợ cuộn / zoom trên màn hình)         */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-auto p-4 bg-slate-200/50 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
          
          {/* ================================================================= */}
          {/* THE EXACT 1140px x 780px PRINTABLE A4 CANVAS (UNCLIPPED FULL PAGE)*/}
          {/* ================================================================= */}
          <div
            style={{
              transform: `scale(${diagramZoom / 100})`,
              transformOrigin: 'top center',
              width: '1140px',
              height: '780px',
              minWidth: '1140px',
              minHeight: '780px'
            }}
            className="printable-canvas-scaling-wrapper shadow-xl print:shadow-none print:transform-none"
          >
            <div 
              ref={printContainerRef}
              id="printable-tournament-bracket"
              style={{
                width: '1140px',
                height: '780px',
                boxSizing: 'border-box'
              }}
              className="bg-white p-3 text-slate-900 flex flex-col justify-between overflow-hidden select-none border border-slate-300 print:border-none"
            >
              {/* 1. Header Cơ Quan & Giải Đấu (Cao ~65px) */}
              <div className="border-b-2 border-slate-900 pb-1.5 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  {/* Left School Identity */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-900 shrink-0 flex items-center justify-center p-0.5 bg-white">
                      <img
                        src={SCHOOL_LOGO_DATA_URI}
                        alt="Logo THPT Phú Lâm"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 leading-tight">
                        SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH
                      </h4>
                      <h3 className="text-sm font-black uppercase text-slate-950 font-serif leading-tight">
                        TRƯỜNG THPT PHÚ LÂM - HỘI THAO HỌC ĐƯỜNG NĂM HỌC 2026 - 2027
                      </h3>
                    </div>
                  </div>

                  {/* Right Document Code */}
                  <div className="text-right text-[10px] text-slate-600 leading-tight shrink-0">
                    <span className="font-mono text-[9px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      BRK-{currentSport.id.toUpperCase()}-2026 · A4 LANDSCAPE FULL
                    </span>
                    <div className="mt-1">Địa điểm: <strong>{currentSport.venue}</strong> · Ngày in: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></div>
                  </div>
                </div>

                {/* Tiêu Đề Chính */}
                <div className="text-center mt-1 pt-1 border-t border-slate-200">
                  <h1 className="text-base font-black uppercase tracking-tight text-slate-950 leading-tight font-sans">
                    SƠ ĐỒ PHÂN NHÁNH THI ĐẤU TOÀN DIỆN: MÔN {currentSport.name.toUpperCase()}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-semibold leading-tight mt-0.5">
                    {printScope === 'tree_symmetrical' && 'BẢNG A (MIỄN VÒNG & ĐẤU TRƯỚC) ➔ CHUNG KẾT CÚP VÔ ĐỊCH ➔ BẢNG B (CÓ ĐƯỜNG NỐI VECTOR ĐẦY ĐỦ)'}
                    {printScope === 'group_a' && 'SƠ ĐỒ CHI TIẾT BẢNG A: VÒNG LOẠI (TRẬN 1-5, MIỄN VÒNG & ĐẤU TRƯỚC) ➔ BÁN KẾT ➔ CHUNG KẾT BẢNG A'}
                    {printScope === 'group_b' && 'SƠ ĐỒ CHI TIẾT BẢNG B: VÒNG LOẠI (TRẬN 1-5, MIỄN VÒNG & ĐẤU TRƯỚC) ➔ BÁN KẾT ➔ CHUNG KẾT BẢNG B'}
                    {printScope === 'finals' && 'SƠ ĐỒ VÒNG CHUNG KẾT LIÊN BẢNG TOÀN TRƯỜNG & TRANH HẠNG BA ĐỒNG'}
                    {printScope === 'list_table' && 'BẢNG DANH SÁCH CHI TIẾT TẤT CẢ CÁC TRẬN ĐẤU VÀ KẾT QUẢ'}
                  </p>
                </div>
              </div>

              {/* 2. KHU VỰC SƠ ĐỒ CHÍNH (Cao 560px, Rộng 1140px) */}
              {printScope === 'tree_symmetrical' && (
                <div className="relative w-full h-[560px] my-auto bg-white overflow-hidden shrink-0">
                  
                  {/* Cột tiêu đề vòng đấu trên đỉnh */}
                  <div className="absolute top-1 left-0 w-full flex items-center text-[8.5px] font-black pointer-events-none uppercase">
                    <div style={{ position: 'absolute', left: '10px', width: '116px' }} className="text-center py-1 bg-blue-100 text-blue-950 rounded border border-blue-300">
                      VÒNG 1 A (5 TRẬN)
                    </div>
                    <div style={{ position: 'absolute', left: '142px', width: '114px' }} className="text-center py-1 bg-blue-100 text-blue-900 rounded border border-blue-300">
                      BK 1 & PLAYOFF A
                    </div>
                    <div style={{ position: 'absolute', left: '272px', width: '114px' }} className="text-center py-1 bg-blue-100 text-blue-900 rounded border border-blue-300">
                      BÁN KẾT 2 (A)
                    </div>
                    <div style={{ position: 'absolute', left: '400px', width: '106px' }} className="text-center py-1 bg-amber-100 text-amber-950 rounded border border-amber-300">
                      CK BẢNG A
                    </div>
                    <div style={{ position: 'absolute', left: '512px', width: '116px' }} className="text-center py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 rounded border border-amber-500 font-extrabold tracking-wider">
                      🏆 VCK TOÀN TRƯỜNG
                    </div>
                    <div style={{ position: 'absolute', left: '634px', width: '106px' }} className="text-center py-1 bg-amber-100 text-amber-950 rounded border border-amber-300">
                      CK BẢNG B
                    </div>
                    <div style={{ position: 'absolute', left: '748px', width: '112px' }} className="text-center py-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-300">
                      BÁN KẾT 2 (B)
                    </div>
                    <div style={{ position: 'absolute', left: '874px', width: '112px' }} className="text-center py-1 bg-indigo-100 text-indigo-900 rounded border border-indigo-300">
                      BK 1 & PLAYOFF B
                    </div>
                    <div style={{ position: 'absolute', left: '1000px', width: '130px' }} className="text-center py-1 bg-indigo-100 text-indigo-950 rounded border border-indigo-300">
                      VÒNG 1 B (5 TRẬN)
                    </div>
                  </div>

                  {/* SVG VECTOR CONNECTING LINES (Chính xác từng điểm ảnh) */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width="1140"
                    height="560"
                    viewBox="0 0 1140 560"
                  >
                    {/* ====== NHÁNH TRÁI (BẢNG A) ====== */}
                    {/* 1. Trận 1 & 2 -> BK 1 (A) */}
                    <g key="svg-l-bk1">
                      <path d="M 126 130 H 134 V 212 H 126 M 134 171 H 142" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 126 130 H 134 V 212 H 126 M 134 171 H 142" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 2. Trận 4 & 5 (ĐẤU TRƯỚC) -> Playoff (A) */}
                    <g key="svg-l-playoff">
                      <path d="M 126 384 H 134 V 466 H 126 M 134 425 H 142" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 126 384 H 134 V 466 H 126 M 134 425 H 142" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 3. Trận 3 (MIỄN 1 VÒNG ⭐) -> Bán Kết 2 (A) & Playoff nối lên BK 2 */}
                    <g key="svg-l-t3-bk2">
                      <path d="M 126 298 H 272" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 126 298 H 272" fill="none" stroke="#059669" strokeWidth="3.2" strokeLinecap="round" />
                      <path d="M 256 425 H 264 V 315 H 272" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 256 425 H 264 V 315 H 272" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 4. BK 1 (A) & BK 2 (A) -> Chung Kết Bảng A */}
                    <g key="svg-l-bk-ck">
                      <path d="M 256 171 H 393 V 298 H 386 M 393 234 H 400" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 256 171 H 393 V 298 H 386 M 393 234 H 400" fill="none" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 5. Chung Kết Bảng A -> Center Stage */}
                    <g key="svg-l-ck-center">
                      <path d="M 506 234 H 509 V 200 H 512" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 506 234 H 509 V 200 H 512" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 509 234 V 297 H 512" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                    </g>

                    {/* ====== NHÁNH PHẢI (BẢNG B - ĐỐI XỨNG HOÀN HẢO) ====== */}
                    {/* 1. Trận 1 & 2 (B) -> BK 1 (B) */}
                    <g key="svg-r-bk1">
                      <path d="M 1004 130 H 996 V 212 H 1004 M 996 171 H 986" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 1004 130 H 996 V 212 H 1004 M 996 171 H 986" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 2. Trận 4 & 5 (B) -> Playoff (B) */}
                    <g key="svg-r-playoff">
                      <path d="M 1004 384 H 996 V 466 H 1004 M 996 425 H 986" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 1004 384 H 996 V 466 H 1004 M 996 425 H 986" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 3. Trận 3 (B) (MIỄN 1 VÒNG ⭐) -> Bán Kết 2 (B) & Playoff B nối lên BK 2 */}
                    <g key="svg-r-t3-bk2">
                      <path d="M 1004 298 H 860" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 1004 298 H 860" fill="none" stroke="#059669" strokeWidth="3.2" strokeLinecap="round" />
                      <path d="M 874 425 H 867 V 315 H 860" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 874 425 H 867 V 315 H 860" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 4. BK 1 (B) & BK 2 (B) -> Chung Kết Bảng B */}
                    <g key="svg-r-bk-ck">
                      <path d="M 874 171 H 747 V 298 H 754 M 747 234 H 740" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 874 171 H 747 V 298 H 754 M 747 234 H 740" fill="none" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* 5. Chung Kết Bảng B -> Center Stage */}
                    <g key="svg-r-ck-center">
                      <path d="M 634 234 H 631 V 200 H 628" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 634 234 H 631 V 200 H 628" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 631 234 V 297 H 628" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                    </g>
                  </svg>

                  {/* CÁC THẺ TRẬN ĐẤU BẢNG A (CÁNH TRÁI) */}
                  <ProportionalMatchCard match={groupARound1[0]} title="Trận 1 (A)" defaultTeamA="A1 (Đội 1)" defaultTeamB="A2 (Đội 2)" style={{ left: '10px', top: '96px', width: '116px', height: '68px' }} />
                  <ProportionalMatchCard match={groupARound1[1]} title="Trận 2 (A)" defaultTeamA="A3 (Đội 3)" defaultTeamB="A4 (Đội 4)" style={{ left: '10px', top: '178px', width: '116px', height: '68px' }} />
                  <ProportionalMatchCard match={groupARound1[2]} title="Trận 3 (A)" badge="⭐ MIỄN VÒNG" badgeColor="emerald" defaultTeamA="A5 (Đội 5)" defaultTeamB="A6 (Đội 6)" style={{ left: '10px', top: '262px', width: '116px', height: '72px' }} />
                  <ProportionalMatchCard match={groupARound1[3]} title="Trận 4 (A)" badge="⚔️ ĐẤU TRƯỚC" badgeColor="amber" defaultTeamA="A7 (Đội 7)" defaultTeamB="A8 (Đội 8)" style={{ left: '10px', top: '350px', width: '116px', height: '68px' }} />
                  <ProportionalMatchCard match={groupARound1[4]} title="Trận 5 (A)" badge="⚔️ ĐẤU TRƯỚC" badgeColor="amber" defaultTeamA="A9 (Đội 9)" defaultTeamB="A10 (Đội 10)" style={{ left: '10px', top: '432px', width: '116px', height: '68px' }} />

                  {/* BK 1 & Playoff A */}
                  <ProportionalMatchCard match={groupASemis[0]} title="BÁN KẾT 1 (A)" defaultTeamA="Thắng Trận 1" defaultTeamB="Thắng Trận 2" style={{ left: '142px', top: '136px', width: '114px', height: '70px' }} />
                  <ProportionalMatchCard match={groupAPlayoff} title="TRẬN PLAYOFF (A)" badge="⚔️ PLAYOFF" badgeColor="amber" defaultTeamA="Thắng Trận 4" defaultTeamB="Thắng Trận 5" style={{ left: '142px', top: '390px', width: '114px', height: '70px' }} />

                  {/* Bán Kết 2 A */}
                  <ProportionalMatchCard match={groupASemis[1]} title="BÁN KẾT 2 (A)" badge="BK2" defaultTeamA="Thắng T3 (Miễn vòng)" defaultTeamB="Thắng Playoff" style={{ left: '272px', top: '263px', width: '114px', height: '70px' }} />

                  {/* Chung Kết Bảng A */}
                  <ProportionalMatchCard match={groupAFinal} title="CK BẢNG A" badge="🏆 CK BẢNG" badgeColor="gold" defaultTeamA="Thắng BK 1" defaultTeamB="Thắng BK 2" style={{ left: '400px', top: '198px', width: '106px', height: '73px' }} />

                  {/* KHU VỰC TRUNG TÂM: CÚP VÔ ĐỊCH & CHUNG KẾT TOÀN TRƯỜNG */}
                  <div style={{ position: 'absolute', left: '512px', width: '116px', top: '96px' }} className="space-y-1.5">
                    <div className="py-1 px-1 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-200 rounded-xl border-2 border-amber-500 shadow-xs text-center leading-none">
                      <div className="text-base">🏆</div>
                      <div className="font-black text-blue-950 text-[8.5px] uppercase tracking-wider mt-0.5">
                        CÚP VÔ ĐỊCH 2026
                      </div>
                    </div>

                    <div className="p-1.5 bg-slate-900 rounded-xl border-2 border-amber-400 text-white shadow-md space-y-1 leading-none">
                      <div className="font-black text-[8px] uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>CK TOÀN TRƯỜNG</span>
                      </div>
                      <div className="space-y-0.5 text-[8.5px]">
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-800 text-amber-100 font-bold">
                          <span className="truncate max-w-[76px]" title={grandFinal?.teamA || 'Nhất Bảng A'}>{grandFinal?.teamA || 'Nhất Bảng A'}</span>
                          <span className="font-mono font-black text-amber-400">{showScores && grandFinal?.scoreA !== undefined ? grandFinal.scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-800 text-amber-100 font-bold">
                          <span className="truncate max-w-[76px]" title={grandFinal?.teamB || 'Nhất Bảng B'}>{grandFinal?.teamB || 'Nhất Bảng B'}</span>
                          <span className="font-mono font-black text-amber-400">{showScores && grandFinal?.scoreB !== undefined ? grandFinal.scoreB : '-'}</span>
                        </div>
                      </div>
                      <div className="text-[7.5px] font-black text-amber-300 text-center py-0.5 bg-amber-500/20 rounded">
                        👑 Tranh Cúp Vàng Hội Thao
                      </div>
                    </div>

                    <div className="p-1.5 bg-amber-50 rounded-xl border-2 border-amber-400 shadow-xs space-y-1 leading-none">
                      <div className="font-black text-[8px] uppercase text-amber-900 text-center">
                        🥉 TRANH HẠNG BA
                      </div>
                      <div className="space-y-0.5 text-[8px]">
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white text-slate-800 font-semibold border border-amber-200">
                          <span className="truncate max-w-[76px]" title={bronzeMatch?.teamA || 'Nhì Bảng A'}>{bronzeMatch?.teamA || 'Nhì Bảng A'}</span>
                          <span className="font-mono font-bold text-amber-900">{showScores && bronzeMatch?.scoreA !== undefined ? bronzeMatch.scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white text-slate-800 font-semibold border border-amber-200">
                          <span className="truncate max-w-[76px]" title={bronzeMatch?.teamB || 'Nhì Bảng B'}>{bronzeMatch?.teamB || 'Nhì Bảng B'}</span>
                          <span className="font-mono font-bold text-amber-900">{showScores && bronzeMatch?.scoreB !== undefined ? bronzeMatch.scoreB : '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 bg-slate-100 rounded-lg border border-slate-300 text-[6.8px] text-slate-700 space-y-0.5 font-medium leading-tight">
                      <div>⭐ <strong>Miễn vòng:</strong> Đội thắng Trận 3 vào thẳng Bán Kết 2.</div>
                      <div>⚔️ <strong>Đấu trước:</strong> Đội thắng Trận 4 & 5 đá Playoff tranh vé vào BK 2.</div>
                    </div>
                  </div>

                  {/* CÁC THẺ TRẬN ĐẤU BẢNG B (CÁNH PHẢI - ĐỐI XỨNG) */}
                  <ProportionalMatchCard match={groupBFinal} title="CK BẢNG B" badge="🏆 CK BẢNG" badgeColor="gold" defaultTeamA="Thắng BK 1" defaultTeamB="Thắng BK 2" style={{ left: '634px', top: '198px', width: '106px', height: '73px' }} />
                  <ProportionalMatchCard match={groupBSemis[1]} title="BÁN KẾT 2 (B)" badge="BK2" defaultTeamA="Thắng T3 (Miễn vòng)" defaultTeamB="Thắng Playoff" style={{ left: '748px', top: '263px', width: '112px', height: '70px' }} />
                  <ProportionalMatchCard match={groupBSemis[0]} title="BÁN KẾT 1 (B)" defaultTeamA="Thắng Trận 1" defaultTeamB="Thắng Trận 2" style={{ left: '874px', top: '136px', width: '112px', height: '70px' }} />
                  <ProportionalMatchCard match={groupBPlayoff} title="TRẬN PLAYOFF (B)" badge="⚔️ PLAYOFF" badgeColor="amber" defaultTeamA="Thắng Trận 4" defaultTeamB="Thắng Trận 5" style={{ left: '874px', top: '390px', width: '112px', height: '70px' }} />

                  <ProportionalMatchCard match={groupBRound1[0]} title="Trận 1 (B)" defaultTeamA="B1 (Đội 1)" defaultTeamB="B2 (Đội 2)" style={{ left: '1004px', top: '96px', width: '112px', height: '68px' }} />
                  <ProportionalMatchCard match={groupBRound1[1]} title="Trận 2 (B)" defaultTeamA="B3 (Đội 3)" defaultTeamB="B4 (Đội 4)" style={{ left: '1004px', top: '178px', width: '112px', height: '68px' }} />
                  <ProportionalMatchCard match={groupBRound1[2]} title="Trận 3 (B)" badge="⭐ MIỄN VÒNG" badgeColor="emerald" defaultTeamA="B5 (Đội 5)" defaultTeamB="B6 (Đội 6)" style={{ left: '1004px', top: '262px', width: '112px', height: '72px' }} />
                  <ProportionalMatchCard match={groupBRound1[3]} title="Trận 4 (B)" badge="⚔️ ĐẤU TRƯỚC" badgeColor="amber" defaultTeamA="B7 (Đội 7)" defaultTeamB="B8 (Đội 8)" style={{ left: '1004px', top: '350px', width: '112px', height: '68px' }} />
                  <ProportionalMatchCard match={groupBRound1[4]} title="Trận 5 (B)" badge="⚔️ ĐẤU TRƯỚC" badgeColor="amber" defaultTeamA="B9 (Đội 9)" defaultTeamB="B10 (Đội 10)" style={{ left: '1004px', top: '432px', width: '112px', height: '68px' }} />

                </div>
              )}

              {/* 3. Chú thích màu sắc (Cao 20px) */}
              <div className="w-full pt-1 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-700 font-bold shrink-0">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-xs"></span>
                    <span>⭐ Miễn 1 vòng (Đường xanh ngọc bích vào thẳng Bán Kết 2)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs"></span>
                    <span>⚔️ Đấu trước (Đường màu hổ phách tranh vé Playoff)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block shadow-xs"></span>
                    <span>Nhánh trực tiếp</span>
                  </span>
                </div>
                <div className="text-slate-500 italic text-[8.5px]">
                  * Kết quả cập nhật trực tiếp theo biên bản chính thức của tổ trọng tài
                </div>
              </div>

              {/* 4. Phần Ký Tên Ban Tổ Chức & Trọng Tài (Cao ~100px) */}
              {showSignatures && (
                <div className="pt-2 border-t-2 border-slate-900 grid grid-cols-3 text-center text-[9.5px] shrink-0">
                  <div className="space-y-0.5">
                    <div className="font-bold uppercase text-[9.5px] text-slate-900">
                      ĐẠI DIỆN TỔ TRỌNG TÀI
                    </div>
                    <div className="text-[8px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                    <div className="h-10"></div>
                    <div className="font-semibold text-slate-700">................................................</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-bold uppercase text-[9.5px] text-slate-900">
                      BAN CHUYÊN MÔN THỂ THAO
                    </div>
                    <div className="text-[8px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                    <div className="h-10"></div>
                    <div className="font-semibold text-slate-700">................................................</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[8.5px] text-slate-500 italic">
                      TP. Hồ Chí Minh, ngày ..... tháng ..... năm 2026
                    </div>
                    <div className="font-bold uppercase text-[9.5px] text-slate-900">
                      TRƯỞNG BAN TỔ CHỨC HỘI THAO
                    </div>
                    <div className="text-[8px] text-slate-500 italic">(Ký tên và đóng dấu)</div>
                    <div className="h-9"></div>
                    <div className="font-semibold text-slate-700">................................................</div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Embedded Print CSS: Khóa trang in A4 Landscape 297mm x 210mm tràn đầy trang */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm 5mm;
          }

          #root {
            display: none !important;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #print-bracket-portal-container {
            position: static !important;
            inset: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            overflow: hidden !important;
          }

          .printable-canvas-scaling-wrapper {
            transform: none !important;
            width: 287mm !important;
            height: 202mm !important;
            min-width: 287mm !important;
            min-height: 202mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
          }

          #printable-tournament-bracket {
            width: 284mm !important;
            height: 198mm !important;
            max-width: 284mm !important;
            max-height: 198mm !important;
            margin: 6mm auto !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            border: none !important;
          }

          .print\\:hidden, button {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
};
