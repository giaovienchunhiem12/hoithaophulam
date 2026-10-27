import React, { useState, useRef, useMemo } from 'react';
import { Match, SportCategory, Registration } from '../types/sports';
import { Printer, X, Trophy, ZoomIn, ZoomOut, Download, Image as ImageIcon, Loader2, GitMerge } from 'lucide-react';
import { getTeamEmblem, isSystemPlaceholderTeam } from '../data/mockSportsData';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface PrintBracketModalProps {
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  selectedSportId: string;
  onClose: () => void;
  tournamentName?: string;
  tournamentTeamsCount?: number;
}

interface PrintSlotNode {
  index: number;
  label: string;
  teamName: string;
  emblem: string;
  subLabel: string;
  centerY: number;
}

interface PrintMatchNode {
  id: string;
  roundIndex: number; // 1..totalRounds
  matchIndex: number; // 0..count-1
  roundTitle: string;
  matchLabel: string;
  teamA: string;
  teamB: string;
  scoreA?: string | number;
  scoreB?: string | number;
  winner?: 'A' | 'B' | null;
  status: 'Finished' | 'Live' | 'Upcoming';
  time?: string;
  venue?: string;
  centerY: number;
  sourceTopY: number;
  sourceBotY?: number;
  isBye?: boolean;
}

const isPlaceholderTeamName = (name?: string, registrations: Registration[] = []): boolean => {
  return isSystemPlaceholderTeam(name, registrations);
};

export const PrintBracketModal: React.FC<PrintBracketModalProps> = ({
  matches,
  sports,
  registrations = [],
  selectedSportId,
  onClose,
  tournamentName,
  tournamentTeamsCount
}) => {
  const [printScope, setPrintScope] = useState<string>('all_single_branch');
  const [pageOrientation, setPageOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewScale, setPreviewScale] = useState<number>(85);
  const [showScores, setShowScores] = useState<boolean>(true);
  const [showScheduleTime, setShowScheduleTime] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Exact A4 dimensions at 96 DPI:
  // Landscape (297mm x 210mm): 1123px x 794px
  // Portrait  (210mm x 297mm): 794px x 1123px
  const sheetWidth = pageOrientation === 'landscape' ? 1123 : 794;
  const sheetHeight = pageOrientation === 'landscape' ? 794 : 1123;

  const currentSport = useMemo(() => {
    return sports.find((s) => s.id === selectedSportId) || sports[0];
  }, [sports, selectedSportId]);

  const sportMatches = useMemo(() => {
    const filtered =
      selectedSportId === 'all'
        ? matches
        : matches.filter((m) => m.sportId === selectedSportId);
    return filtered.length > 0 ? filtered : matches;
  }, [matches, selectedSportId]);

  const sportRegs = useMemo(() => {
    return registrations.filter((r) => selectedSportId === 'all' || r.sportId === selectedSportId);
  }, [registrations, selectedSportId]);

  // Available groups in the current tournament
  const availableGroups = useMemo(() => {
    const groups = Array.from(
      new Set(
        sportMatches
          .map((m) => m.groupName)
          .filter((g): g is string => Boolean(g && g !== 'Toàn Trường'))
      )
    );
    return groups.sort();
  }, [sportMatches]);

  // Matches filtered by printScope (if a specific group tab is chosen)
  const scopedMatches = useMemo(() => {
    if (
      printScope === 'all_single_branch' ||
      printScope === 'table_list' ||
      !availableGroups.includes(printScope)
    ) {
      return sportMatches;
    }
    return sportMatches.filter((m) => m.groupName === printScope);
  }, [sportMatches, printScope, availableGroups]);

  // Dynamically extract real teams from the current tournament's matches or registrations
  const extractedTeams = useMemo(() => {
    const result: { name: string; emblem: string; sub: string }[] = [];
    const seen = new Set<string>();

    const addTeam = (rawName: string | undefined, groupLabel: string) => {
      if (!rawName || isPlaceholderTeamName(rawName, registrations)) return;
      const clean = rawName.trim();
      if (seen.has(clean)) return;
      seen.add(clean);
      result.push({
        name: clean,
        emblem: getTeamEmblem(clean, registrations),
        sub: groupLabel
      });
    };

    if (scopedMatches.length > 0) {
      const r1Candidates = scopedMatches.filter(
        (m) =>
          m.stage === 'Vòng bảng' ||
          m.id.includes('R1') ||
          m.subCategory?.includes('Vòng Loại') ||
          m.subCategory?.includes('Vòng 1') ||
          m.subCategory?.includes('Cặp')
      );
      r1Candidates.forEach((m) => {
        addTeam(m.teamA, m.groupName || 'Toàn giải');
        addTeam(m.teamB, m.groupName || 'Toàn giải');
      });

      scopedMatches.forEach((m) => {
        addTeam(m.teamA, m.groupName || 'Toàn giải');
        addTeam(m.teamB, m.groupName || 'Toàn giải');
      });
    }

    if ((result.length === 0 || printScope === 'all_single_branch') && sportRegs.length > 0) {
      sportRegs.forEach((r) => {
        const label = r.className.trim();
        if (label && !seen.has(label)) {
          seen.add(label);
          result.push({
            name: label,
            emblem: r.emblem || getTeamEmblem(label, registrations),
            sub: r.subCategory || 'Chính thức'
          });
        }
      });
    }

    return result;
  }, [scopedMatches, sportRegs, registrations, printScope]);

  // Target team count strictly follows the current tournament's teams (minimum 4 if empty)
  const targetTeamCount = useMemo(() => {
    const effectiveTourCount =
      printScope === 'all_single_branch' && tournamentTeamsCount && tournamentTeamsCount >= 2
        ? tournamentTeamsCount
        : 0;

    if (extractedTeams.length >= 2 || effectiveTourCount >= 2) {
      return Math.max(extractedTeams.length, effectiveTourCount);
    }
    if (scopedMatches.length > 0) {
      const r1Count = scopedMatches.filter(
        (m) => m.stage === 'Vòng bảng' || m.stage === 'Tứ kết' || m.id.includes('R1')
      ).length;
      if (r1Count >= 2) return r1Count * 2;
    }
    return 8;
  }, [extractedTeams.length, scopedMatches, printScope, tournamentTeamsCount]);

  // =========================================================================
  // BUILD SINGLE-BRANCH LEFT-TO-RIGHT BRACKET TREE FOR CURRENT TOURNAMENT
  // =========================================================================
  const bracketTree = useMemo(() => {
    const N = Math.max(2, targetTeamCount);
    const SLOT_TOP_OFFSET = 16;
    const SLOT_HEIGHT = 38;
    const SLOT_PITCH = N > 24 ? 50 : 56;

    // 1. Build Column 0: N Team Slots on the Left
    const slots: PrintSlotNode[] = Array.from({ length: N }, (_, i) => {
      const realTeam = extractedTeams[i];
      const prefix =
        printScope !== 'all_single_branch' && printScope.startsWith('Bảng ')
          ? `${printScope.replace('Bảng ', '')}${i + 1}`
          : `${i + 1}`;
      return {
        index: i,
        label: prefix,
        teamName: realTeam?.name || '',
        emblem: realTeam?.emblem || '',
        subLabel: realTeam?.sub || '',
        centerY: SLOT_TOP_OFFSET + i * SLOT_PITCH + SLOT_HEIGHT / 2
      };
    });

    // Calculate rounds needed from Left (Vòng loại) to Right (Chung kết)
    const roundCounts: number[] = [];
    let currentCount = N;
    while (currentCount > 1) {
      const nextCount = Math.ceil(currentCount / 2);
      roundCounts.push(nextCount);
      currentCount = nextCount;
    }
    const totalRounds = roundCounts.length;

    const getRoundMeta = (roundIdx: number, totalR: number) => {
      const distFromFinal = totalR - roundIdx;
      if (distFromFinal === 0) {
        return { header: 'CHUNG KẾT VÔ ĐỊCH', cardPrefix: 'CHUNG KẾT', shortCode: 'CK' };
      }
      if (distFromFinal === 1) {
        return { header: 'VÒNG BÁN KẾT', cardPrefix: 'BÁN KẾT', shortCode: 'BK' };
      }
      if (distFromFinal === 2) {
        return { header: 'VÒNG TỨ KẾT', cardPrefix: 'Tứ Kết', shortCode: 'TK' };
      }
      if (distFromFinal === 3) {
        return { header: 'VÒNG 1/8', cardPrefix: 'Vòng 1/8', shortCode: 'R1/8' };
      }
      if (distFromFinal === 4) {
        return { header: 'VÒNG 1/16', cardPrefix: 'Vòng 1/16', shortCode: 'R1/16' };
      }
      if (distFromFinal === 5) {
        return { header: 'VÒNG 1/32', cardPrefix: 'Vòng 1/32', shortCode: 'R1/32' };
      }
      return { header: `VÒNG LOẠI ${roundIdx}`, cardPrefix: `Vòng ${roundIdx}`, shortCode: `R${roundIdx}` };
    };

    const r1RealMatches = scopedMatches.filter(
      (m) =>
        m.stage === 'Vòng bảng' ||
        m.id.includes('R1') ||
        m.subCategory?.includes('Vòng Loại') ||
        m.subCategory?.includes('Vòng 1') ||
        m.subCategory?.includes('Cặp')
    );
    const qfRealMatches = scopedMatches.filter((m) => m.stage === 'Tứ kết');
    const sfRealMatches = scopedMatches.filter((m) => m.stage === 'Bán kết');
    const finRealMatches = scopedMatches.filter((m) => m.stage === 'Chung kết');
    const bronzeRealMatch = scopedMatches.find((m) => m.stage === 'Trận Tranh Hạng 3');

    const getWinnerSide = (m?: Match): 'A' | 'B' | null => {
      if (!m || m.status !== 'Finished' || m.scoreA === undefined || m.scoreB === undefined) return null;
      if (Number(m.scoreA) > Number(m.scoreB)) return 'A';
      if (Number(m.scoreB) > Number(m.scoreA)) return 'B';
      return null;
    };

    const rounds: PrintMatchNode[][] = [];
    const roundHeaders: string[] = [];

    for (let r = 1; r <= totalRounds; r++) {
      const count = roundCounts[r - 1];
      const meta = getRoundMeta(r, totalRounds);
      roundHeaders.push(`${meta.header} (${count} TRẬN)`);

      const prevRound = r === 1 ? null : rounds[r - 2];
      const prevMeta = r === 1 ? null : getRoundMeta(r - 1, totalRounds);
      const currentRoundNodes: PrintMatchNode[] = [];

      const distFromFinal = totalRounds - r;
      const candidateRealPool =
        distFromFinal === 0
          ? finRealMatches
          : distFromFinal === 1
          ? sfRealMatches
          : distFromFinal === 2
          ? qfRealMatches.length > 0
            ? qfRealMatches
            : r === 1
            ? r1RealMatches
            : []
          : r === 1
          ? r1RealMatches
          : [];

      for (let mIdx = 0; mIdx < count; mIdx++) {
        const realM = candidateRealPool[mIdx];

        if (r === 1) {
          const topSlot = slots[mIdx * 2];
          const botSlot = slots[mIdx * 2 + 1];

          if (botSlot) {
            const centerY = (topSlot.centerY + botSlot.centerY) / 2;
            const teamA = topSlot.teamName || `Đội ${topSlot.index + 1}`;
            const teamB = botSlot.teamName || `Đội ${botSlot.index + 1}`;

            const matchedReal =
              scopedMatches.find(
                (m) =>
                  (m.teamA === topSlot.teamName && m.teamB === botSlot.teamName && topSlot.teamName) ||
                  (m.teamA === botSlot.teamName && m.teamB === topSlot.teamName && topSlot.teamName)
              ) || realM;

            currentRoundNodes.push({
              id: matchedReal?.id || `PRINT-R1-M${mIdx + 1}`,
              roundIndex: r,
              matchIndex: mIdx,
              roundTitle: meta.header,
              matchLabel:
                meta.cardPrefix === 'Vòng 1/8' || meta.cardPrefix === 'Vòng 1/16' || meta.cardPrefix === 'Vòng 1/32'
                  ? `${meta.cardPrefix} (${mIdx + 1})`
                  : `${meta.cardPrefix} ${mIdx + 1}`,
              teamA,
              teamB,
              scoreA: matchedReal?.scoreA,
              scoreB: matchedReal?.scoreB,
              winner: getWinnerSide(matchedReal),
              status: matchedReal?.status || 'Upcoming',
              time: matchedReal?.time || `${String(8 + (mIdx % 8)).padStart(2, '0')}:${mIdx % 2 === 0 ? '00' : '30'}`,
              venue: matchedReal?.venue || currentSport.venue,
              centerY,
              sourceTopY: topSlot.centerY,
              sourceBotY: botSlot.centerY,
              isBye: false
            });
          } else {
            const centerY = topSlot.centerY;
            const teamA = topSlot.teamName || `Đội ${topSlot.index + 1}`;
            currentRoundNodes.push({
              id: `PRINT-R1-BYE-${mIdx + 1}`,
              roundIndex: r,
              matchIndex: mIdx,
              roundTitle: meta.header,
              matchLabel:
                meta.cardPrefix === 'Vòng 1/8' || meta.cardPrefix === 'Vòng 1/16' || meta.cardPrefix === 'Vòng 1/32'
                  ? `${meta.cardPrefix} (${mIdx + 1})`
                  : `${meta.cardPrefix} ${mIdx + 1}`,
              teamA,
              teamB: 'Miễn đấu (Vào thẳng)',
              scoreA: undefined,
              scoreB: undefined,
              winner: 'A',
              status: 'Upcoming',
              time: '--:--',
              venue: currentSport.venue,
              centerY,
              sourceTopY: topSlot.centerY,
              sourceBotY: undefined,
              isBye: true
            });
          }
        } else if (prevRound && prevMeta) {
          const topPrev = prevRound[mIdx * 2];
          const botPrev = prevRound[mIdx * 2 + 1];

          const getAdvancingLabel = (prevNode: PrintMatchNode, idxInPrev: number) => {
            if (prevNode.isBye) return prevNode.teamA;
            if (prevNode.winner === 'A') return prevNode.teamA;
            if (prevNode.winner === 'B') return prevNode.teamB;
            return `Thắng ${prevMeta.shortCode}${idxInPrev + 1}`;
          };

          if (botPrev) {
            const centerY = (topPrev.centerY + botPrev.centerY) / 2;
            const defaultTeamA = getAdvancingLabel(topPrev, mIdx * 2);
            const defaultTeamB = getAdvancingLabel(botPrev, mIdx * 2 + 1);

            const teamA =
              realM && !isPlaceholderTeamName(realM.teamA, registrations) ? realM.teamA : defaultTeamA;
            const teamB =
              realM && !isPlaceholderTeamName(realM.teamB, registrations) ? realM.teamB : defaultTeamB;

            currentRoundNodes.push({
              id: realM?.id || `PRINT-R${r}-M${mIdx + 1}`,
              roundIndex: r,
              matchIndex: mIdx,
              roundTitle: meta.header,
              matchLabel:
                distFromFinal === 0
                  ? 'CHUNG KẾT VÔ ĐỊCH'
                  : meta.cardPrefix === 'Vòng 1/8' || meta.cardPrefix === 'Vòng 1/16'
                  ? `${meta.cardPrefix} (${mIdx + 1})`
                  : `${meta.cardPrefix} ${mIdx + 1}`,
              teamA,
              teamB,
              scoreA: realM?.scoreA,
              scoreB: realM?.scoreB,
              winner: getWinnerSide(realM),
              status: realM?.status || 'Upcoming',
              time: realM?.time || (distFromFinal === 0 ? '16:00' : distFromFinal === 1 ? '14:30' : '10:00'),
              venue: realM?.venue || currentSport.venue,
              centerY,
              sourceTopY: topPrev.centerY,
              sourceBotY: botPrev.centerY,
              isBye: false
            });
          } else {
            const centerY = topPrev.centerY;
            const advTeam = getAdvancingLabel(topPrev, mIdx * 2);
            currentRoundNodes.push({
              id: `PRINT-R${r}-BYE-${mIdx + 1}`,
              roundIndex: r,
              matchIndex: mIdx,
              roundTitle: meta.header,
              matchLabel:
                meta.cardPrefix === 'Vòng 1/8' || meta.cardPrefix === 'Vòng 1/16' || meta.cardPrefix === 'Vòng 1/32'
                  ? `${meta.cardPrefix} (${mIdx + 1})`
                  : `${meta.cardPrefix} ${mIdx + 1}`,
              teamA: advTeam,
              teamB: 'Đặc cách vào vòng sau',
              scoreA: undefined,
              scoreB: undefined,
              winner: 'A',
              status: 'Upcoming',
              time: '--:--',
              venue: currentSport.venue,
              centerY,
              sourceTopY: topPrev.centerY,
              sourceBotY: undefined,
              isBye: true
            });
          }
        }
      }

      rounds.push(currentRoundNodes);
    }

    const finalNode = rounds[totalRounds - 1]?.[0];
    const bronzeTeamA =
      bronzeRealMatch && !isPlaceholderTeamName(bronzeRealMatch.teamA, registrations)
        ? bronzeRealMatch.teamA
        : 'Thua Bán Kết 1';
    const bronzeTeamB =
      bronzeRealMatch && !isPlaceholderTeamName(bronzeRealMatch.teamB, registrations)
        ? bronzeRealMatch.teamB
        : 'Thua Bán Kết 2';

    const colStep = 245;
    const naturalWidth = Math.max(920, 275 + totalRounds * colStep + 50);
    const finalBottomY = finalNode ? finalNode.centerY + 52 + 14 + 78 + 16 : 400;
    const naturalHeight = Math.max(420, SLOT_TOP_OFFSET + N * SLOT_PITCH + 28, finalBottomY);
    const totalTreeHeight = naturalHeight + 44; // includes 44px column header bar

    // Compute exact fit scale for the diagram area inside either A4 Landscape (1123x794) or A4 Portrait (794x1123)
    // Guarantees 100% of content fits neatly inside 1 single page without clipping or page overflow
    const chromeHeight = pageOrientation === 'portrait'
      ? (showSignatures ? 236 : 156)
      : (showSignatures ? 226 : 148);
    const availableW = sheetWidth - 56;
    const availableH = sheetHeight - chromeHeight;
    const fitScale = Math.min(1, availableW / naturalWidth, availableH / totalTreeHeight);

    return {
      slots,
      rounds,
      roundHeaders,
      totalRounds,
      finalNode,
      bronzeRealMatch,
      bronzeTeamA,
      bronzeTeamB,
      naturalWidth,
      naturalHeight,
      totalTreeHeight,
      colStep,
      fitScale
    };
  }, [
    targetTeamCount,
    extractedTeams,
    printScope,
    scopedMatches,
    registrations,
    currentSport.venue,
    showSignatures,
    pageOrientation,
    sheetWidth,
    sheetHeight
  ]);

  const handlePrintNow = () => {
    if (!printAreaRef.current) {
      window.print();
      return;
    }

    const printContent = printAreaRef.current.outerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const pageWidthMm = pageOrientation === 'landscape' ? '297mm' : '210mm';
    const pageHeightMm = pageOrientation === 'landscape' ? '210mm' : '297mm';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>In Sơ Đồ Thi Đấu - ${tournamentName || currentSport.name}</title>
          ${styles}
          <style>
            @page {
              size: A4 ${pageOrientation};
              margin: 0mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${pageWidthMm} !important;
              height: ${pageHeightMm} !important;
              max-height: ${pageHeightMm} !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: hidden !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            #printable-bracket-sheet {
              width: ${sheetWidth}px !important;
              height: ${sheetHeight}px !important;
              max-width: ${sheetWidth}px !important;
              max-height: ${sheetHeight}px !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              transform: scale(0.97) !important;
              transform-origin: center center !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              overflow: hidden !important;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Lỗi khi gọi lệnh in:', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 600);
  };

  const captureSheetAsPng = async (): Promise<string> => {
    const element = printAreaRef.current;
    if (!element) {
      throw new Error('Không tìm thấy vùng sơ đồ để xuất file');
    }

    return await toPng(element, {
      quality: 1.0,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      width: sheetWidth,
      height: sheetHeight,
      cacheBust: true,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        width: `${sheetWidth}px`,
        height: `${sheetHeight}px`,
        margin: '0',
        borderRadius: '0',
        boxShadow: 'none'
      }
    });
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current || isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const imgData = await captureSheetAsPng();
      const pdf = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: 'a4'
      });

      const pdfW = pageOrientation === 'landscape' ? 297 : 210;
      const pdfH = pageOrientation === 'landscape' ? 210 : 297;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      const fileSlug = (tournamentName || currentSport.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const orientSlug = pageOrientation === 'landscape' ? 'Ngang' : 'Dung';
      pdf.save(`So-Do-1-Nhanh-${orientSlug}-${fileSlug}-2026.pdf`);
    } catch (error) {
      console.error('Lỗi xuất PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printAreaRef.current || isExportingImage) return;
    setIsExportingImage(true);
    try {
      const imgData = await captureSheetAsPng();
      const link = document.createElement('a');
      const fileSlug = (tournamentName || currentSport.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const orientSlug = pageOrientation === 'landscape' ? 'Ngang' : 'Dung';
      link.download = `So-Do-1-Nhanh-${orientSlug}-${fileSlug}-2026.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Lỗi tải ảnh sơ đồ:', error);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Clean tournament title: only keep the tournament name itself without extra prefixes or technical suffixes
  const displayTournamentTitle = useMemo(() => {
    const raw = (tournamentName || `Giải ${currentSport.name} THPT Phú Lâm 2026`).trim();
    return raw
      .replace(/^sơ đồ thi đấu:\s*/i, '')
      .replace(/\s*\((bốc thăm[^)]*|loại trực tiếp[^)]*|\d+\s*bảng[^)]*)\)\s*$/i, '')
      .trim()
      .toUpperCase();
  }, [tournamentName, currentSport.name]);

  // Table list auto-fit calculation so all matches always fit inside 1 single page
  const tableColumns = useMemo(() => {
    const maxSingleColRows = pageOrientation === 'portrait' ? 22 : 14;
    if (scopedMatches.length <= maxSingleColRows) {
      return [scopedMatches];
    }
    const mid = Math.ceil(scopedMatches.length / 2);
    return [scopedMatches.slice(0, mid), scopedMatches.slice(mid)];
  }, [scopedMatches, pageOrientation]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 no-print-backdrop">
      <style>{`
        @media print {
          @page {
            size: A4 ${pageOrientation};
            margin: 0mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-bracket-sheet, #printable-bracket-sheet * {
            visibility: visible;
          }
          #printable-bracket-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${sheetWidth}px !important;
            height: ${sheetHeight}px !important;
            max-width: ${sheetWidth}px !important;
            max-height: ${sheetHeight}px !important;
            margin: 0 !important;
            transform: scale(0.97) !important;
            transform-origin: center center !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {/* ================================================================= */}
      {/* TOP CONTROL BAR (HIDDEN WHEN PRINTING)                            */}
      {/* ================================================================= */}
      <div className="w-full max-w-7xl bg-white rounded-3xl border-2 border-blue-900 shadow-2xl overflow-hidden mb-4 shrink-0 no-print">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-3 border-b-4 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight font-sans text-white">
                  {displayTournamentTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                  {pageOrientation === 'landscape' ? 'Khổ A4 Nằm Ngang' : 'Khổ A4 Trang Đứng'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Print Button */}
            <button
              onClick={handlePrintNow}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>
                In Ngay ({pageOrientation === 'landscape' ? 'Trang Ngang 1 Tờ' : 'Trang Đứng 1 Tờ'})
              </span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 border border-indigo-400/40"
            >
              {isExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isExportingPDF
                  ? 'Đang tạo PDF...'
                  : `Tải PDF (${pageOrientation === 'landscape' ? 'A4 Ngang' : 'A4 Đứng'})`}
              </span>
            </button>

            {/* Download PNG Image Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExportingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>{isExportingImage ? 'Đang xuất ảnh...' : 'Tải Ảnh Sơ Đồ (PNG)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-blue-900/80 hover:bg-rose-600 text-blue-200 hover:text-white transition-colors border border-blue-700 cursor-pointer"
              title="Đóng cửa sổ in"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Options Toolbar */}
        <div className="p-3.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Page Orientation Selector: Trang Đứng vs Trang Nằm Ngang */}
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-700">Khổ trang in:</span>
              <div className="bg-white p-1 rounded-xl border-2 border-blue-900/20 flex items-center gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPageOrientation('portrait')}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    pageOrientation === 'portrait'
                      ? 'bg-blue-950 text-amber-300 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-block w-2.5 h-3.5 border-2 border-current rounded-[2px]" />
                  <span>Trang Đứng (A4 Dọc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPageOrientation('landscape')}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    pageOrientation === 'landscape'
                      ? 'bg-blue-950 text-amber-300 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-block w-3.5 h-2.5 border-2 border-current rounded-[2px]" />
                  <span>Trang Nằm Ngang (A4 Ngang)</span>
                </button>
              </div>
            </div>

            {/* Scope Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-black text-slate-700 flex items-center gap-1">
                <GitMerge className="w-3.5 h-3.5 text-blue-900" />
                <span>Nội dung:</span>
              </span>
              <div className="bg-white p-1 rounded-xl border border-slate-300 flex flex-wrap items-center gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPrintScope('all_single_branch')}
                  className={`px-2.5 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                    printScope === 'all_single_branch'
                      ? 'bg-blue-950 text-amber-300 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🌿 Sơ Đồ 1 Nhánh ({targetTeamCount} Đội)
                </button>

                {availableGroups.map((gName) => (
                  <button
                    type="button"
                    key={gName}
                    onClick={() => setPrintScope(gName)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      printScope === gName
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Nhánh {gName}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPrintScope('table_list')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    printScope === 'table_list'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📋 Bảng Danh Sách ({scopedMatches.length})
                </button>
              </div>
            </div>
          </div>

          {/* Toggle switches & Preview Zoom */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
              <button
                type="button"
                onClick={() => setPreviewScale((s) => Math.max(50, s - 10))}
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Thu nhỏ bản xem trước"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-slate-800 min-w-[38px] text-center">
                {previewScale}%
              </span>
              <button
                type="button"
                onClick={() => setPreviewScale((s) => Math.min(115, s + 10))}
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
                title="Phóng to bản xem trước"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(85)}
                className="text-[10px] font-bold text-blue-700 hover:underline px-1"
              >
                Vừa màn hình
              </button>
            </div>

            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showScores}
                onChange={(e) => setShowScores(e.target.checked)}
                className="rounded text-blue-900 focus:ring-blue-900"
              />
              <span>Tỉ số</span>
            </label>

            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showScheduleTime}
                onChange={(e) => setShowScheduleTime(e.target.checked)}
                className="rounded text-blue-900 focus:ring-blue-900"
              />
              <span>Giờ đấu</span>
            </label>

            <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded text-blue-900 focus:ring-blue-900"
              />
              <span>Chữ ký BTC</span>
            </label>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PRINTABLE PAPER SHEET PREVIEW (AUTO-FITS 1 SINGLE A4 PAGE)        */}
      {/* ================================================================= */}
      <div className="w-full overflow-x-auto flex justify-center pb-10 print-wrapper">
        <div
          ref={printAreaRef}
          id="printable-bracket-sheet"
          style={{
            transform: `scale(${previewScale / 100})`,
            transformOrigin: 'top center',
            width: `${sheetWidth}px`,
            height: `${sheetHeight}px`
          }}
          className="bg-white text-slate-950 rounded-none sm:rounded-2xl shadow-2xl border border-slate-300 px-5 py-3.5 transition-all duration-150 print-sheet flex flex-col justify-between overflow-hidden box-border select-none"
        >
          {/* 1. SCHOOL LOGO, SCHOOL NAME & TOURNAMENT TITLE HEADER FOR PRINT */}
          <div className="border-b-2 border-slate-900 pb-2 mb-1.5 text-center shrink-0">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 shadow-2xs shrink-0 bg-white">
                <img
                  src={SCHOOL_LOGO_DATA_URI}
                  alt="Logo Trường THPT Phú Lâm"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-950">
                TRƯỜNG THPT PHÚ LÂM
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-blue-950 leading-tight">
              {displayTournamentTitle}
            </h1>
          </div>

          {/* =============================================================== */}
          {/* MODE A: SINGLE-BRANCH LEFT-TO-RIGHT BRACKET TREE                */}
          {/* =============================================================== */}
          {printScope !== 'table_list' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              {/* Auto-Scaled Single-Branch Left-to-Right Tree Viewport */}
              <div className="flex-1 min-h-0 relative w-full overflow-hidden flex items-center justify-center bg-slate-50/40 rounded-xl border border-slate-200 p-1.5">
                <div
                  style={{
                    width: `${Math.floor(bracketTree.naturalWidth * bracketTree.fitScale)}px`,
                    height: `${Math.floor(bracketTree.totalTreeHeight * bracketTree.fitScale)}px`,
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      width: `${bracketTree.naturalWidth}px`,
                      height: `${bracketTree.totalTreeHeight}px`,
                      transform: `scale(${bracketTree.fitScale})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                  >
                    {/* Column Header Pills (Aligned Left-to-Right directly above each column) */}
                    <div className="relative h-8 text-[10px] font-black mb-2">
                      {/* Col 0: Team Slots Header */}
                      <div
                        style={{ position: 'absolute', left: '16px', width: '200px' }}
                        className="text-center"
                      >
                        <span className="px-3 py-1 rounded-full bg-blue-950 text-white shadow-xs border border-blue-800 uppercase tracking-wide block truncate">
                          DANH SÁCH ĐỘI ({targetTeamCount} ĐỘI)
                        </span>
                      </div>

                      {/* Col 1..R: Round Headers from Left to Right */}
                      {bracketTree.roundHeaders.map((hTitle, idx) => {
                        const isFinalCol = idx === bracketTree.totalRounds - 1;
                        const colLeft = 275 + idx * bracketTree.colStep;
                        const colWidth = isFinalCol ? 225 : 190;
                        return (
                          <div
                            key={`print-col-hdr-${idx}`}
                            style={{ position: 'absolute', left: `${colLeft}px`, width: `${colWidth}px` }}
                            className="text-center"
                          >
                            <span
                              className={`px-3 py-1 rounded-full shadow-xs uppercase tracking-wide block truncate ${
                                isFinalCol
                                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-blue-950 font-black border border-amber-400'
                                  : idx === bracketTree.totalRounds - 2
                                  ? 'bg-indigo-900 text-white border border-indigo-700'
                                  : 'bg-blue-800 text-white border border-blue-600'
                              }`}
                            >
                              {hTitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tree Canvas */}
                    <div
                      style={{
                        width: `${bracketTree.naturalWidth}px`,
                        height: `${bracketTree.naturalHeight}px`,
                        position: 'relative'
                      }}
                    >
                      {/* SVG ORTHOGONAL VECTOR CONNECTORS WITH ARROWHEADS */}
                      <svg
                        width={bracketTree.naturalWidth}
                        height={bracketTree.naturalHeight}
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{ shapeRendering: 'geometricPrecision' }}
                      >
                        <defs>
                          <marker
                            id="print-arrow-blue"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="5.5"
                            markerHeight="5.5"
                            orient="auto"
                          >
                            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#2563eb" />
                          </marker>
                          <marker
                            id="print-arrow-indigo"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="5.5"
                            markerHeight="5.5"
                            orient="auto"
                          >
                            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#4338ca" />
                          </marker>
                          <marker
                            id="print-arrow-emerald"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="5.5"
                            markerHeight="5.5"
                            orient="auto"
                          >
                            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#059669" />
                          </marker>
                          <marker
                            id="print-arrow-gold"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="5.5"
                            markerHeight="5.5"
                            orient="auto"
                          >
                            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b45309" />
                          </marker>
                        </defs>

                        {bracketTree.rounds.map((roundNodes, rIdx) => {
                          const r = rIdx + 1;
                          const isFinalRound = r === bracketTree.totalRounds;
                          const xPrevRight =
                            r === 1 ? 216 : 275 + (r - 2) * bracketTree.colStep + 190;
                          const xCurrLeft = 275 + (r - 1) * bracketTree.colStep;
                          const xMid = Math.round((xPrevRight + xCurrLeft) / 2);

                          const strokeColor = isFinalRound
                            ? '#b45309'
                            : r === 1
                            ? '#2563eb'
                            : '#4338ca';
                          const markerId = isFinalRound
                            ? 'url(#print-arrow-gold)'
                            : r === 1
                            ? 'url(#print-arrow-blue)'
                            : 'url(#print-arrow-indigo)';

                          return roundNodes.map((node) => {
                            if (node.isBye || node.sourceBotY === undefined) {
                              return (
                                <g key={`print-svg-r${r}-m${node.matchIndex}`}>
                                  <path
                                    d={`M ${xPrevRight} ${node.sourceTopY} H ${xCurrLeft - 2}`}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                  />
                                  <path
                                    d={`M ${xPrevRight} ${node.sourceTopY} H ${xCurrLeft - 2}`}
                                    fill="none"
                                    stroke="#059669"
                                    strokeWidth="2.4"
                                    strokeDasharray="6 3"
                                    strokeLinecap="round"
                                    markerEnd="url(#print-arrow-emerald)"
                                  />
                                </g>
                              );
                            }

                            return (
                              <g key={`print-svg-r${r}-m${node.matchIndex}`}>
                                <path
                                  d={`M ${xPrevRight} ${node.sourceTopY} H ${xMid} V ${node.sourceBotY} H ${xPrevRight} M ${xMid} ${node.centerY} H ${xCurrLeft - 2}`}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="5"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={`M ${xPrevRight} ${node.sourceTopY} H ${xMid} V ${node.sourceBotY} H ${xPrevRight}`}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth="2.3"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                                <path
                                  d={`M ${xMid} ${node.centerY} H ${xCurrLeft - 2}`}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  markerEnd={markerId}
                                />
                              </g>
                            );
                          });
                        })}
                      </svg>

                      {/* COLUMN 0: TEAM SLOTS ON THE LEFT */}
                      {bracketTree.slots.map((slot) => {
                        const hasTeam = Boolean(slot.teamName);
                        return (
                          <div
                            key={`print-slot-${slot.index}`}
                            style={{
                              position: 'absolute',
                              left: '16px',
                              top: `${slot.centerY - 19}px`,
                              width: '200px',
                              height: '38px'
                            }}
                            className={`z-10 rounded-full px-2 flex items-center gap-2 transition-all ${
                              hasTeam
                                ? 'bg-white border-2 border-blue-900 shadow-xs'
                                : 'bg-slate-50/95 border-2 border-dashed border-slate-300'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                              {slot.label}
                            </span>
                            {hasTeam ? (
                              <span className="text-[11px] font-bold text-slate-900 truncate flex items-center gap-1">
                                {slot.emblem && <span>{slot.emblem}</span>}
                                <span className="truncate">{slot.teamName}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-600 tracking-wide truncate">
                                --- (Trống) ---
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* COLUMNS 1..R: ROUND MATCH CARDS FROM LEFT TO RIGHT */}
                      {bracketTree.rounds.map((roundNodes, rIdx) => {
                        const r = rIdx + 1;
                        const isFinalRound = r === bracketTree.totalRounds;
                        const colLeft = 275 + (r - 1) * bracketTree.colStep;

                        return roundNodes.map((node) => {
                          if (isFinalRound) {
                            const finalHeight = 104;
                            const finalTop = node.centerY - finalHeight / 2;
                            return (
                              <React.Fragment key={node.id}>
                                {/* Trophy Badge Directly Above Final */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${colLeft}px`,
                                    top: `${Math.max(2, finalTop - 56)}px`,
                                    width: '225px'
                                  }}
                                  className="z-10 flex flex-col items-center pointer-events-none"
                                >
                                  <div className="px-3 py-1 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-900 shadow flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4 text-slate-950" />
                                    <span className="text-[10px] font-black uppercase text-slate-950 tracking-wider">
                                      CÚP VÔ ĐỊCH 🏆
                                    </span>
                                  </div>
                                </div>

                                {/* Final Match Box */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${colLeft}px`,
                                    top: `${finalTop}px`,
                                    width: '225px',
                                    height: `${finalHeight}px`
                                  }}
                                  className="z-10 rounded-2xl bg-gradient-to-b from-red-700 via-red-800 to-slate-950 text-white p-2.5 shadow-lg border-2 border-amber-400 flex flex-col justify-between"
                                >
                                  <div className="flex items-center justify-between border-b border-red-400/40 pb-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                                      🏆 {node.matchLabel}
                                    </span>
                                    {showScheduleTime && node.time && (
                                      <span className="text-[8px] font-mono text-amber-200">
                                        {node.time}
                                      </span>
                                    )}
                                  </div>

                                  <div className="h-10" />
                                </div>

                                {/* 3rd Place Match Below Final */}
                                {targetTeamCount >= 4 && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${colLeft}px`,
                                      top: `${finalTop + finalHeight + 14}px`,
                                      width: '225px',
                                      height: '78px'
                                    }}
                                    className="z-10 rounded-xl bg-amber-50/95 border-2 border-amber-500 p-2 shadow flex flex-col justify-between"
                                  >
                                    <div className="flex items-center justify-between border-b border-amber-200 pb-0.5">
                                      <span className="text-[9px] font-black uppercase text-amber-950">
                                        TRANH HẠNG BA 🥉
                                      </span>
                                      {showScheduleTime && (
                                        <span className="text-[8px] font-mono text-amber-800">
                                          {bracketTree.bronzeRealMatch?.time || '14:30'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-6" />
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          }

                          // Standard Round Match Card
                          const cardHeight = 54;
                          const cardTop = node.centerY - cardHeight / 2;

                          return (
                            <div
                              key={node.id}
                              style={{
                                position: 'absolute',
                                left: `${colLeft}px`,
                                top: `${cardTop}px`,
                                width: '190px',
                                height: `${cardHeight}px`
                              }}
                              className={`z-10 rounded-2xl px-2.5 py-1.5 shadow-xs flex flex-col justify-between transition-all ${
                                node.isBye
                                  ? 'bg-emerald-50/95 border-2 border-emerald-500'
                                  : r === bracketTree.totalRounds - 1
                                  ? 'bg-indigo-50/95 border-2 border-indigo-600'
                                  : 'bg-blue-50/95 border-2 border-blue-500'
                              }`}
                            >
                              <div className="flex items-center justify-between border-b border-blue-900/20 pb-0.5">
                                <span className="text-[10px] font-black text-slate-900 truncate">
                                  {node.matchLabel}
                                </span>
                                {showScheduleTime && node.time && !node.isBye && (
                                  <span className="text-[8px] font-mono text-slate-600 shrink-0">
                                    {node.time}
                                  </span>
                                )}
                              </div>

                              <div className="h-5" />
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend Bar */}
              <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px] text-slate-600 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    <strong>Sơ đồ 1 nhánh:</strong> Danh sách {targetTeamCount} đội (Trái) ➔ Vòng loại ➔ Chung kết (Phải)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                    <strong>Nét đứt xanh lá:</strong> Đội miễn đấu / đặc cách vào vòng tiếp theo
                  </span>
                </div>
                <div className="italic shrink-0">
                  * Tự động căn chỉnh vừa khít 1 trang {pageOrientation === 'landscape' ? 'A4 Ngang' : 'A4 Đứng'}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MODE B: PRINT SCHEDULE TABLE VIEW (AUTO-FIT 1 PAGE)             */}
          {/* =============================================================== */}
          {printScope === 'table_list' && (
            <div className="py-1 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              <div className={`flex-1 min-h-0 overflow-hidden grid ${tableColumns.length > 1 ? 'grid-cols-2 gap-3' : 'grid-cols-1'} items-start`}>
                {tableColumns.map((colMatches, colIdx) => {
                  const indexOffset = colIdx === 0 ? 0 : tableColumns[0].length;
                  const isCompact = scopedMatches.length > 16;
                  return (
                    <table
                      key={`print-table-col-${colIdx}`}
                      className={`w-full border-collapse border border-slate-900 ${isCompact ? 'text-[8.5px]' : 'text-[9.5px]'}`}
                    >
                      <thead>
                        <tr className="bg-slate-200 text-slate-950 font-black uppercase">
                          <th className="border border-slate-900 px-1.5 py-1 text-center w-7">STT</th>
                          <th className="border border-slate-900 px-1.5 py-1 text-left">Vòng</th>
                          <th className="border border-slate-900 px-1.5 py-1 text-right">Đội A</th>
                          <th className="border border-slate-900 px-1.5 py-1 text-center w-14">Tỉ Số</th>
                          <th className="border border-slate-900 px-1.5 py-1 text-left">Đội B</th>
                          <th className="border border-slate-900 px-1.5 py-1 text-center w-22">Giờ / Ngày</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colMatches.map((m, idx) => (
                          <tr key={m.id} className="border-b border-slate-400">
                            <td className="border border-slate-900 px-1.5 py-0.5 text-center font-mono font-bold">
                              {indexOffset + idx + 1}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-0.5 font-bold truncate max-w-[90px]">
                              {m.stage}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-0.5 text-right font-bold truncate max-w-[115px]">
                              {m.teamA}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-0.5 text-center font-mono font-black bg-slate-50">
                              {m.scoreA !== undefined && m.scoreB !== undefined
                                ? `${m.scoreA} - ${m.scoreB}`
                                : 'vs'}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-0.5 text-left font-bold truncate max-w-[115px]">
                              {m.teamB}
                            </td>
                            <td className="border border-slate-900 px-1.5 py-0.5 text-center font-mono whitespace-nowrap">
                              {m.time} · {m.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* OFFICIAL FOOTER & SIGNATURES FOR PAPER                          */}
          {/* =============================================================== */}
          {showSignatures && (
            <div className="mt-1 pt-1.5 border-t-2 border-slate-900 grid grid-cols-3 gap-3 text-center text-[9.5px] shrink-0">
              <div>
                <div className="font-black uppercase text-slate-900">ĐẠI DIỆN TỔ TRỌNG TÀI</div>
                <div className="text-[8px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-6"></div>
              </div>
              <div>
                <div className="font-black uppercase text-slate-900">BAN CHUYÊN MÔN THỂ THAO</div>
                <div className="text-[8px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-6"></div>
              </div>
              <div>
                <div className="text-[8px] italic text-slate-600">
                  TP. Hồ Chí Minh, ngày ..... tháng ..... năm 2026
                </div>
                <div className="font-black uppercase text-slate-900">
                  TRƯỞNG BAN TỔ CHỨC HỘI THAO
                </div>
                <div className="text-[8px] text-slate-500 italic">(Ký tên và đóng dấu)</div>
                <div className="h-5"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
