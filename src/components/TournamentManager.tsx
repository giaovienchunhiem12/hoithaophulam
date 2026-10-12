import React, { useState } from 'react';
import { SportCategory, Registration, SportId, TeamMember, Match } from '../types/sports';
import { OFFICIAL_20_CLASSES, getDefault20Registrations, DEFAULT_CLASS_EMBLEMS, PRESET_EMBLEMS, getTeamEmblem } from '../data/mockSportsData';
import { 
  Trophy, Flame, Plus, Trash2, Search, Filter, Phone, User, 
  ShieldCheck, Zap, Layers, Sparkles, CheckCircle2, RotateCcw, 
  ArrowRight, Users, Calendar, MapPin, Shuffle, ChevronDown, ChevronUp,
  Activity, Award, Check, Download, Upload, FileText, Clipboard, Edit3, Dices, GitBranch
} from 'lucide-react';
import { InteractiveBracketDraw } from './InteractiveBracketDraw';
import { 
  repairVietnameseText, 
  parseCsvLine, 
  decodeFileBuffer, 
  createUtf8BomCsvBlob 
} from '../utils/vietnameseEncoding';

interface TournamentManagerProps {
  sports: SportCategory[];
  registrations: Registration[];
  onNewRegistration: (newReg: Registration) => void;
  onUpdateRegistration?: (updatedReg: Registration) => void;
  onBulkRegistration: (newRegs: Registration[]) => void;
  onDeleteRegistration?: (id: string) => void;
  onClearAllRegistrations?: () => void;
  onCreateTournament?: (generatedMatches: Match[]) => void;
  preselectedSportId?: SportId;
  onNavigateToSchedule?: () => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({
  sports,
  registrations,
  onNewRegistration,
  onUpdateRegistration,
  onBulkRegistration,
  onDeleteRegistration,
  onClearAllRegistrations,
  onCreateTournament,
  preselectedSportId = 'basketball',
  onNavigateToSchedule
}) => {
  // Navigation Sub-tabs: 'create_wizard' | 'bracket_draw' | 'import_file' | 'roster_list' | 'add_manual'
  const [activeSubTab, setActiveSubTab] = useState<'create_wizard' | 'bracket_draw' | 'import_file' | 'roster_list' | 'add_manual'>('create_wizard');

  // ==============================================================
  // 1. GIẢI ĐẤU ĐƯỢC NHẬP THỦ CÔNG (MANUAL TOURNAMENT INFO)
  // ==============================================================
  const [tournamentName, setTournamentName] = useState<string>('Giải Hội Thao Học Đường THPT Phú Lâm 2026');
  const [selectedSportId, setSelectedSportId] = useState<SportId>(preselectedSportId || 'basketball');
  const [customSportName, setCustomSportName] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('Bóng rổ Nam Toàn Trường (5x5)');
  const [tournamentFormat, setTournamentFormat] = useState<'round_robin' | 'knockout' | 'groups' | 'group_knockout'>('group_knockout');
  const [venue, setVenue] = useState<string>('Sân bóng rổ Đa năng THPT Phú Lâm');
  const [startDate, setStartDate] = useState<string>('2026-10-12');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [tournamentNotes, setTournamentNotes] = useState<string>('Thi đấu theo điều lệ giải thể thao học đường THPT Phú Lâm năm học 2026-2027.');

  // ==============================================================
  // 2. PHN BẢNG ĐẤU (2, 3, 4, 5, 6, 7, 8 BẢNG) TỰ ĐỘNG HOẶC THỦ CÔNG
  // ==============================================================
  const [numGroups, setNumGroups] = useState<number>(4); // 2, 3, 4, 5, 6, 7, 8
  const [groupAssignMode, setGroupAssignMode] = useState<'auto_random' | 'manual_assign'>('auto_random');
  
  // Manual group assignments: teamName -> 'Bảng A', 'Bảng B', etc.
  const [manualGroupMap, setManualGroupMap] = useState<Record<string, string>>({});

  // ==============================================================
  // 3. FILE IMPORT & PASTE DATA STATE
  // ==============================================================
  const [pastedData, setPastedData] = useState<string>('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // General state
  const [isCreatingTournament, setIsCreatingTournament] = useState<boolean>(false);
  const [tournamentSuccessMsg, setTournamentSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Registration | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleEditTeam = (team: Registration) => {
    setEditingTeam(team);
    setManualClassName(team.className);
    setManualGrade(team.grade);
    setManualSportId(team.sportId);
    setManualCaptain(team.captainName);
    setManualPhone(team.phone);
    setManualTeacher(team.teacherName);
    setManualMembers(team.members);
    setManualEmblem(team.emblem || DEFAULT_CLASS_EMBLEMS[team.className] || '🦁');
    setActiveSubTab('add_manual');
  };

  const handleSportChange = (sId: SportId) => {
    setSelectedSportId(sId);
    const sp = sports.find((s) => s.id === sId);
    if (sp) {
      setVenue(sp.venue);
      setSubCategory(sp.subCategories[0] || 'Chính thức');
      setTournamentName(`Giải ${sp.name} Vô Địch THPT Phú Lâm 2026`);
    }
  };

  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];

  // Group labels based on numGroups: ['Bảng A', 'Bảng B', 'Bảng C', 'Bảng D', ...]
  const groupLetterList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const activeGroupNames = groupLetterList.slice(0, numGroups).map((letter) => `Bảng ${letter}`);

  // Filtered registrations for roster view
  const filteredRegistrations = registrations.filter((reg) => {
    const matchGrade = filterGrade === 'all' || reg.grade.toString() === filterGrade;
    const matchSport = filterSport === 'all' || reg.sportId === filterSport;
    const matchSearch =
      reg.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGrade && matchSport && matchSearch;
  });

  // Handle single team deletion
  const handleDeleteTeam = (id: string, className: string) => {
    if (onDeleteRegistration) {
      onDeleteRegistration(id);
    }
    showToast(`Đã xoá bớt đội ${className} khỏi danh sách giải đấu!`);
    setDeletingTeamId(null);
  };

  // Handle clearing all teams to create manually
  const handleClearAllTeams = () => {
    if (onClearAllRegistrations) {
      onClearAllRegistrations();
    }
    showToast('Đã xóa danh sách đội! Giờ bạn có thể tạo các đội thủ công theo ý muốn.');
  };

  // ==============================================================
  // DOWNLOAD SAMPLE FILE (CSV TEMPLATE WITH UTF-8 BOM)
  // ==============================================================
  const handleDownloadSampleFile = () => {
    const sampleHeaders = 'Tên_Lớp_Đội,Khối,Đội_Trưởng,Số_Điện_Thoại,GVCN_HLV,Môn_Thi_Đấu,Danh_Sách_VĐV\n';
    const sampleRows = [
      '10A1,10,Nguyễn Văn A,0901122334,Giáo viên chủ nhiệm,Bóng đá,"Nguyễn Văn A; Trần Văn B; Lê Văn C; Phạm Văn D"',
      '10A2,10,Trần Minh Quân,0902233445,Thầy Phan Thanh Tùng,Bóng đá,"Trần Minh Quân; Đỗ Thành Long; Nguyễn Anh Tuấn; Lê Tấn Lộc"',
      '11A1,11,Nguyễn Mai Chi,0911122334,Thầy Hoàng Tiến Dũng,Bóng rổ,"Nguyễn Mai Chi; Trần Văn Duy; Lê Quốc Khánh; Vũ Minh Hải"',
      '11A2,11,Lê Minh Triết,0912233445,Cô Trần Thu Trang,Bóng rổ,"Lê Minh Triết; Ngô Tấn Tài; Vũ Quốc Huy; Bùi Việt Cường"',
      '12A1,12,Trần Hoàng Nam,0913344556,Thầy Nguyễn Văn Đức,Cầu lông,"Trần Hoàng Nam; Nguyễn Quốc Bảo; Phạm Minh Tuấn; Đặng Hải Long"',
      '12A2,12,Phạm Văn Hùng,0914455667,Cô Lê Thị Mai,Kéo co,"Phạm Văn Hùng; Hoàng Quốc Việt; Lê Tấn Phát; Trịnh Công Sơn"'
    ].join('\n');

    const blob = createUtf8BomCsvBlob(sampleHeaders + sampleRows);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Danh_Sach_Doi_Mau_THPT_Phu_Lam_UTF8.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file mẫu danh sách đội chuẩn font tiếng Việt (UTF-8)!');
  };

  // ==============================================================
  // PARSE FILE UPLOAD OR PASTED TEXT DATA
  // ==============================================================
  const parsePastedOrFileContent = (rawText: string) => {
    if (!rawText.trim()) {
      showToast('⚠️ Vui lòng nhập hoặc dán dữ liệu danh sách đội!');
      return;
    }

    try {
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const newTeams: Registration[] = [];

      // Check if header exists
      const firstLineLower = lines[0].toLowerCase();
      const startIndex = firstLineLower.includes('ten') || firstLineLower.includes('tên') || firstLineLower.includes('lớp') || firstLineLower.includes('lop') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const cols = parseCsvLine(line);

        if (cols.length >= 1 && cols[0].trim()) {
          const rawClassName = repairVietnameseText(cols[0].trim().replace(/"/g, '')).toUpperCase();
          const rawGrade = cols[1] ? parseInt(cols[1].trim()) || 10 : parseInt(rawClassName.substring(0, 2)) || 10;
          const rawCaptain = repairVietnameseText(cols[2] ? cols[2].trim() : `Đội Trưởng ${rawClassName}`);
          const rawPhone = cols[3] ? cols[3].trim().replace(/"/g, '') : '0900000000';
          const rawTeacher = repairVietnameseText(cols[4] ? cols[4].trim() : `GVCN ${rawClassName}`);
          const rawSport = selectedSportId;
          const rawMembersText = cols[6] || cols[5] || '';
          
          const memberList: TeamMember[] = rawMembersText
            .split(/[;,]/)
            .map((name, idx) => ({
              name: repairVietnameseText(name.trim()) || `VĐV ${idx + 1}`,
              shirtSize: 'M',
              jerseyNumber: idx + 1
            }))
            .filter((m) => m.name.length > 0);

          if (memberList.length === 0) {
            memberList.push(
              { name: rawCaptain, shirtSize: 'L', jerseyNumber: 10 },
              { name: `Thành viên 1 (${rawClassName})`, shirtSize: 'M', jerseyNumber: 7 },
              { name: `Thành viên 2 (${rawClassName})`, shirtSize: 'M', jerseyNumber: 5 }
            );
          }

          newTeams.push({
            id: `REG-IMP-${Date.now().toString().slice(-4)}-${i}`,
            sportId: rawSport,
            subCategory,
            className: rawClassName,
            grade: rawGrade,
            captainName: rawCaptain,
            phone: rawPhone,
            teacherName: rawTeacher,
            members: memberList,
            status: 'Approved',
            registeredAt: new Date().toISOString().split('T')[0],
            emblem: DEFAULT_CLASS_EMBLEMS[rawClassName] || '🦁',
            notes: 'Nhập từ file mẫu danh sách đội'
          });
        }
      }

      if (newTeams.length > 0) {
        onBulkRegistration(newTeams);
        setImportFeedback(`Đã nhập thành công ${newTeams.length} đội vào giải đấu với font chữ tiếng Việt chuẩn!`);
        setPastedData('');
        showToast(`Đã thêm ${newTeams.length} đội mới từ dữ liệu file mẫu chuẩn font!`);
        setActiveSubTab('roster_list');
      } else {
        showToast('⚠️ Không tìm thấy dữ liệu đội hợp lệ trong nội dung đã nhập.');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Đã xảy ra lỗi khi phân tích dữ liệu file. Vui lòng kiểm tra lại định dạng!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const text = decodeFileBuffer(buffer);
      parsePastedOrFileContent(text);
    };
    reader.readAsArrayBuffer(file);
  };

  // ==============================================================
  // TAB 3: MANUAL ADD FORM STATE
  // ==============================================================
  const [manualClassName, setManualClassName] = useState<string>('11A3');
  const [manualGrade, setManualGrade] = useState<number>(11);
  const [manualSportId, setManualSportId] = useState<SportId>(selectedSportId);
  const [manualCaptain, setManualCaptain] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualTeacher, setManualTeacher] = useState<string>('');
  const [manualEmblem, setManualEmblem] = useState<string>('🦁');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualMembers, setManualMembers] = useState<TeamMember[]>([
    { name: '', shirtSize: 'L', jerseyNumber: 10 },
    { name: '', shirtSize: 'M', jerseyNumber: 7 },
    { name: '', shirtSize: 'XL', jerseyNumber: 1 }
  ]);

  const addManualMember = () => {
    setManualMembers([
      ...manualMembers,
      { name: '', shirtSize: 'M', jerseyNumber: manualMembers.length + 1 }
    ]);
  };

  const removeManualMember = (idx: number) => {
    if (manualMembers.length > 1) {
      setManualMembers(manualMembers.filter((_, i) => i !== idx));
    }
  };

  const handleManualMemberChange = (idx: number, field: keyof TeamMember, val: any) => {
    const updated = [...manualMembers];
    updated[idx] = { ...updated[idx], [field]: val };
    setManualMembers(updated);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClassName.trim()) {
      alert('Vui lòng nhập tên Lớp / Đội thi đấu!');
      return;
    }

    if (editingTeam) {
      const updated: Registration = {
        ...editingTeam,
        sportId: manualSportId,
        className: manualClassName.trim().toUpperCase(),
        grade: manualGrade,
        captainName: manualCaptain.trim() || `Đội Trưởng ${manualClassName}`,
        phone: manualPhone.trim() || '0900000000',
        teacherName: manualTeacher.trim() || `GVCN ${manualClassName}`,
        members: manualMembers.filter((m) => m.name.trim().length > 0),
        emblem: manualEmblem,
        notes: manualNotes.trim() || editingTeam.notes
      };
      if (onUpdateRegistration) {
        onUpdateRegistration(updated);
      } else {
        onNewRegistration(updated);
      }
      showToast(`Đã cập nhật thành công đội ${updated.className} với biểu tượng ${manualEmblem}!`);
      setEditingTeam(null);
    } else {
      const newTeam: Registration = {
        id: `REG-MANUAL-${Date.now().toString().slice(-4)}`,
        sportId: manualSportId,
        subCategory: sports.find((s) => s.id === manualSportId)?.subCategories[0] || 'Chính thức',
        className: manualClassName.trim().toUpperCase(),
        grade: manualGrade,
        captainName: manualCaptain.trim() || `Đội Trưởng ${manualClassName}`,
        phone: manualPhone.trim() || '0900000000',
        teacherName: manualTeacher.trim() || `GVCN ${manualClassName}`,
        members: manualMembers.filter((m) => m.name.trim().length > 0),
        status: 'Approved',
        registeredAt: new Date().toISOString().split('T')[0],
        emblem: manualEmblem,
        notes: manualNotes.trim() || 'Đội bổ sung thủ công'
      };

      onNewRegistration(newTeam);
      showToast(`Đã thêm thành công đội ${newTeam.className} với biểu tượng ${manualEmblem}!`);
    }

    // Reset form
    setManualClassName('');
    setManualCaptain('');
    setManualPhone('');
    setManualTeacher('');
    setManualNotes('');
    setManualEmblem('🦁');
    setActiveSubTab('roster_list');
  };

  // ==============================================================
  // 4. LẬP LỊCH THI ĐẤU & SƠ ĐỒ ĐẦY ĐỦ CÁC VÒNG (VÒNG BẢNG ➔ ĐỐI ĐẦU ➔ TỨ KẾT ➔ BÁN KẾT ➔ CHUNG KẾT)
  // ==============================================================
  const handleGenerateTournamentMatches = () => {
    setIsCreatingTournament(true);

    setTimeout(() => {
      // Pick team names strictly from user-created registrations
      const currentTeamNames = registrations.map((r) => r.className);
      const uniqueTeams = Array.from(new Set(currentTeamNames));

      if (uniqueTeams.length < 2) {
        setIsCreatingTournament(false);
        showToast('⚠️ Bạn chưa tạo đủ đội! Vui lòng bấm "Thêm Đội" để tạo ít nhất 2 đội thi đấu.');
        setActiveSubTab('add_manual');
        return;
      }
      const generatedMatches: Match[] = [];
      const timestamp = Date.now().toString().slice(-4);

      if (tournamentFormat === 'round_robin') {
        // -------------------------------------------------------------
        // 1. ĐẤU VÒNG TRÒN (ROUND ROBIN)
        // -------------------------------------------------------------
        const numTeams = Math.min(uniqueTeams.length, 12);
        const activeTeams = uniqueTeams.slice(0, numTeams);
        let matchIdx = 0;

        for (let i = 0; i < activeTeams.length; i++) {
          for (let j = i + 1; j < activeTeams.length; j++) {
            matchIdx++;
            const matchHour = 8 + (matchIdx % 5) * 2;
            generatedMatches.push({
              id: `M-RR-${timestamp}-${i}-${j}`,
              sportId: selectedSportId,
              subCategory,
              stage: 'Vòng bảng',
              groupName: 'Vòng Tròn Tính Điểm',
              teamA: activeTeams[i],
              teamB: activeTeams[j],
              status: 'Upcoming',
              date: startDate,
              time: `${String(matchHour).padStart(2, '0')}:00`,
              venue
            });
          }
        }

      } else if (tournamentFormat === 'knockout') {
        // -------------------------------------------------------------
        // 2. ĐẤU LOẠI TRỰC TIẾP (DIRECT KNOCKOUT: TỨ KẾT -> BÁN KẾT -> CHUNG KẾT)
        // -------------------------------------------------------------
        const topTeams = [...uniqueTeams].sort(() => Math.random() - 0.5).slice(0, 8);
        
        // Tứ kết (Quarter-finals)
        for (let i = 0; i < 4; i++) {
          generatedMatches.push({
            id: `M-KO-${timestamp}-QF-${i + 1}`,
            sportId: selectedSportId,
            subCategory,
            stage: 'Tứ kết',
            teamA: topTeams[i * 2] || `Đội hạt giống ${i * 2 + 1}`,
            teamB: topTeams[i * 2 + 1] || `Đội hạt giống ${i * 2 + 2}`,
            status: 'Upcoming',
            date: startDate,
            time: `${String(8 + i).padStart(2, '0')}:30`,
            venue
          });
        }
        // Bán kết (Semi-finals)
        generatedMatches.push({
          id: `M-KO-${timestamp}-SF-1`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Bán kết',
          teamA: 'Thắng Tứ Kết 1',
          teamB: 'Thắng Tứ Kết 2',
          status: 'Upcoming',
          date: '2026-10-14',
          time: '14:00',
          venue
        });
        generatedMatches.push({
          id: `M-KO-${timestamp}-SF-2`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Bán kết',
          teamA: 'Thắng Tứ Kết 3',
          teamB: 'Thắng Tứ Kết 4',
          status: 'Upcoming',
          date: '2026-10-14',
          time: '15:30',
          venue
        });
        // Tranh hạng 3
        generatedMatches.push({
          id: `M-KO-${timestamp}-BRONZE`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Trận Tranh Hạng 3',
          teamA: 'Thua Bán Kết 1',
          teamB: 'Thua Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-15',
          time: '14:30',
          venue
        });
        // Chung kết
        generatedMatches.push({
          id: `M-KO-${timestamp}-FINAL`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Chung kết',
          teamA: 'Thắng Bán Kết 1',
          teamB: 'Thắng Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-15',
          time: '16:00',
          venue
        });

      } else if (tournamentFormat === 'groups') {
        // -------------------------------------------------------------
        // 3. ĐẤU THEO BẢNG (VÒNG BẢNG VÒNG TRÒN -> BÁN KẾT CHÉO -> CHUNG KẾT)
        // -------------------------------------------------------------
        const groups: Record<string, string[]> = {};
        activeGroupNames.forEach((g) => (groups[g] = []));

        if (groupAssignMode === 'manual_assign') {
          uniqueTeams.forEach((t) => {
            const assignedGroup = manualGroupMap[t] || activeGroupNames[0];
            if (groups[assignedGroup]) groups[assignedGroup].push(t);
            else groups[activeGroupNames[0]].push(t);
          });
        } else {
          // Auto random distribution into selected number of groups (2,3,4,5,6,7,8)
          const shuffled = [...uniqueTeams].sort(() => Math.random() - 0.5);
          shuffled.forEach((t, idx) => {
            const gName = activeGroupNames[idx % activeGroupNames.length];
            groups[gName].push(t);
          });
        }

        // Generate group stage matches
        Object.entries(groups).forEach(([gName, tList], gIdx) => {
          for (let i = 0; i < tList.length; i++) {
            for (let j = i + 1; j < tList.length; j++) {
              generatedMatches.push({
                id: `M-GRP-${timestamp}-${gIdx}-${i}-${j}`,
                sportId: selectedSportId,
                subCategory,
                stage: 'Vòng bảng',
                groupName: gName,
                teamA: tList[i],
                teamB: tList[j],
                status: 'Upcoming',
                date: startDate,
                time: `${String(8 + (i % 4) * 2).padStart(2, '0')}:00`,
                venue
              });
            }
          }
        });

        // Bán kết chéo & Chung kết
        generatedMatches.push({
          id: `M-GRP-${timestamp}-SEMI-1`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Bán kết',
          teamA: `Nhất ${activeGroupNames[0]}`,
          teamB: `Nhì ${activeGroupNames[1] || activeGroupNames[0]}`,
          status: 'Upcoming',
          date: '2026-10-14',
          time: '14:00',
          venue
        });
        generatedMatches.push({
          id: `M-GRP-${timestamp}-SEMI-2`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Bán kết',
          teamA: `Nhất ${activeGroupNames[1] || activeGroupNames[0]}`,
          teamB: `Nhì ${activeGroupNames[0]}`,
          status: 'Upcoming',
          date: '2026-10-14',
          time: '15:30',
          venue
        });
        generatedMatches.push({
          id: `M-GRP-${timestamp}-BRONZE`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Trận Tranh Hạng 3',
          teamA: 'Thua Bán Kết 1',
          teamB: 'Thua Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-15',
          time: '14:30',
          venue
        });
        generatedMatches.push({
          id: `M-GRP-${timestamp}-FINAL`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Chung kết',
          teamA: 'Thắng Bán Kết 1',
          teamB: 'Thắng Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-15',
          time: '16:00',
          venue
        });

      } else {
        // -------------------------------------------------------------
        // 4. ĐẤU LOẠI TRỰC TIẾP THEO BẢNG (INTERNAL GROUP KNOCKOUT -> FINALS)
        // -------------------------------------------------------------
        const groups: Record<string, string[]> = {};
        activeGroupNames.forEach((g) => (groups[g] = []));

        if (groupAssignMode === 'manual_assign') {
          uniqueTeams.forEach((t) => {
            const assignedGroup = manualGroupMap[t] || activeGroupNames[0];
            if (groups[assignedGroup]) groups[assignedGroup].push(t);
            else groups[activeGroupNames[0]].push(t);
          });
        } else {
          // Auto random distribution into 2, 3, 4, 5, 6, 7, 8 groups
          const shuffled = [...uniqueTeams].sort(() => Math.random() - 0.5);
          shuffled.forEach((t, idx) => {
            const gName = activeGroupNames[idx % activeGroupNames.length];
            groups[gName].push(t);
          });
        }

        // Generate internal group knockout matches for ALL teams in each group (e.g. 10 teams in A -> 5 pairs, 10 teams in B -> 5 pairs)
        Object.entries(groups).forEach(([gName, tList], gIdx) => {
          const pairCount = Math.floor(tList.length / 2);
          for (let p = 0; p < pairCount; p++) {
            const teamA = tList[p * 2];
            const teamB = tList[p * 2 + 1];
            const matchNum = p + 1;
            const stageName = tList.length > 4 ? 'Vòng bảng' : 'Bán kết';

            generatedMatches.push({
              id: `M-GK-${timestamp}-${gIdx}-R1-${matchNum}`,
              sportId: selectedSportId,
              subCategory: `${subCategory} - Vòng 1 ${gName}`,
              stage: stageName,
              groupName: gName,
              teamA,
              teamB,
              status: 'Upcoming',
              date: startDate,
              time: `${String(8 + gIdx + Math.floor(p / 3)).padStart(2, '0')}:${String((p % 3) * 30).padStart(2, '0')}`,
              venue
            });
          }

          // If odd number of teams, add extra match for last team
          if (tList.length % 2 === 1) {
            generatedMatches.push({
              id: `M-GK-${timestamp}-${gIdx}-R1-EXTRA`,
              sportId: selectedSportId,
              subCategory: `${subCategory} - Vòng 1 ${gName}`,
              stage: 'Vòng bảng',
              groupName: gName,
              teamA: tList[tList.length - 1],
              teamB: `Đội Đấu Loại ${gName}`,
              status: 'Upcoming',
              date: startDate,
              time: `${String(8 + gIdx + 2).padStart(2, '0')}:30`,
              venue
            });
          }

          // Bán kết 1 của Bảng
          generatedMatches.push({
            id: `M-GK-${timestamp}-${gIdx}-SF1`,
            sportId: selectedSportId,
            subCategory: `${subCategory} - Bán Kết 1 ${gName}`,
            stage: 'Bán kết',
            groupName: gName,
            teamA: tList.length >= 4 ? `Thắng Trận 1 ${gName}` : tList[0] || `Hạt Giống 1 ${gName}`,
            teamB: tList.length >= 4 ? `Thắng Trận 2 ${gName}` : tList[1] || `Hạt Giống 2 ${gName}`,
            status: 'Upcoming',
            date: '2026-10-13',
            time: `${String(8 + gIdx).padStart(2, '0')}:00`,
            venue
          });

          // Bán kết 2 của Bảng
          generatedMatches.push({
            id: `M-GK-${timestamp}-${gIdx}-SF2`,
            sportId: selectedSportId,
            subCategory: `${subCategory} - Bán Kết 2 ${gName}`,
            stage: 'Bán kết',
            groupName: gName,
            teamA: tList.length >= 4 ? `Thắng Trận 3 ${gName}` : tList[2] || `Hạt Giống 3 ${gName}`,
            teamB: tList.length >= 4 ? `Thắng Trận 4 ${gName}` : tList[3] || `Hạt Giống 4 ${gName}`,
            status: 'Upcoming',
            date: '2026-10-13',
            time: `${String(8 + gIdx).padStart(2, '0')}:45`,
            venue
          });

          // Group Final
          generatedMatches.push({
            id: `M-GK-${timestamp}-${gIdx}-FIN`,
            sportId: selectedSportId,
            subCategory: `${subCategory} - Chung Kết ${gName}`,
            stage: 'Chung kết',
            groupName: gName,
            teamA: `Thắng Bán Kết 1 ${gName}`,
            teamB: `Thắng Bán Kết 2 ${gName}`,
            status: 'Upcoming',
            date: '2026-10-14',
            time: `${String(14 + gIdx).padStart(2, '0')}:00`,
            venue
          });
        });

        // Grand Final Toàn Trường
        generatedMatches.push({
          id: `M-GK-${timestamp}-GRAND-FIN`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Chung kết',
          teamA: `Nhất ${activeGroupNames[0]}`,
          teamB: `Nhất ${activeGroupNames[2] || activeGroupNames[1] || activeGroupNames[0]}`,
          status: 'Upcoming',
          date: '2026-10-15',
          time: '16:00',
          venue
        });

        // Trận Tranh Hạng 3 Toàn Trường
        generatedMatches.push({
          id: `M-GK-${timestamp}-BRONZE`,
          sportId: selectedSportId,
          subCategory,
          stage: 'Trận Tranh Hạng 3',
          teamA: `Nhì ${activeGroupNames[0]}`,
          teamB: `Nhì ${activeGroupNames[2] || activeGroupNames[1] || activeGroupNames[0]}`,
          status: 'Upcoming',
          date: '2026-10-15',
          time: '14:30',
          venue
        });
      }

      if (onCreateTournament) {
        onCreateTournament(generatedMatches);
      }

      setIsCreatingTournament(false);
      setTournamentSuccessMsg(`Khởi tạo thành công giải đấu ${tournamentName} (${generatedMatches.length} trận đấu)! Đang mở lịch và sơ đồ nhánh đấu...`);

      setTimeout(() => {
        setTournamentSuccessMsg(null);
        if (onNavigateToSchedule) {
          onNavigateToSchedule();
        }
      }, 1200);
    }, 600);
  };

  return (
    <div className="py-8 bg-white min-h-screen text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Toast notification */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-950 to-indigo-950 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold font-sans font-bold">{toastMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MASTER HEADER BAR (ROYAL BLUE FLOATING)                        */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/40">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Khởi Tạo & Quản Lý Giải Đấu Tự Động / Thủ Công</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[11px] font-black border border-orange-400/30">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>Tùy Chọn 2 - 8 Bảng Đấu Linh Hoạt</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans font-bold tracking-tight">
              Khởi Tạo Giải Đấu & Lập Sơ Đồ Thi Đấu
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-3xl leading-relaxed">
              Nhập thông tin giải đấu thủ công, nạp danh sách đội từ file mẫu (CSV/Excel) hoặc nhập tay, phân chia bảng đấu (2 - 8 bảng) tự động/thủ công và lập cây sơ đồ nhánh đấu hoàn chỉnh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveSubTab('create_wizard')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Khởi Tạo Giải Đấu</span>
            </button>
            <button
              onClick={() => setActiveSubTab('import_file')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-cyan-300" />
              <span>Nhập Từ File Mẫu</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUBTABS SWITCHER                                               */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 shadow-sm">
            <button
              onClick={() => setActiveSubTab('create_wizard')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'create_wizard'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>1. Khởi Tạo Giải Đấu</span>
            </button>

            <button
              onClick={() => setActiveSubTab('bracket_draw')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'bracket_draw'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Dices className="w-4 h-4 text-amber-500 animate-spin" />
              <span>2. 🎲 Sơ Đồ Nhánh & Bốc Thăm Vị Trí</span>
            </button>

            <button
              onClick={() => setActiveSubTab('import_file')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'import_file'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>3. Nhập File Mẫu</span>
            </button>

            <button
              onClick={() => setActiveSubTab('roster_list')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'roster_list'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>4. Danh Sách Đội ({registrations.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('add_manual')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === 'add_manual'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>5. Tạo Đội Thủ Công</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('add_manual')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border border-emerald-500 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
              title="Tạo đội thi đấu thủ công mới"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Tạo Đội Thủ Công</span>
            </button>
            {registrations.length > 0 && (
              <button
                onClick={handleClearAllTeams}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Xóa toàn bộ các đội hiện tại để nhập lại thủ công từ đầu"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa Hết Đội ({registrations.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: KHỞI TẠO GIẢI ĐẤU & PHN BẢNG ĐẤU                      */}
        {/* ============================================================== */}
        {activeSubTab === 'create_wizard' && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl">
            
            {tournamentSuccessMsg && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 animate-bounce" />
                <span>{tournamentSuccessMsg}</span>
              </div>
            )}

            {/* Step 1: Manual Tournament Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-xl sm:text-2xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <span>1. Nhập Thông Tin Giải Đấu Thủ Công</span>
                </h2>
                <span className="text-xs font-bold text-slate-500">Bước 1 / 3</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Custom Tournament Name */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Tên Giải Đấu * (Nhập thủ công theo yêu cầu)
                  </label>
                  <input
                    type="text"
                    required
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="VD: Giải Bóng Rổ Vô Địch THPT Phú Lâm 2026..."
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

                {/* Sub-category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Hạng Mục / Nội Dung Thi Đấu
                  </label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="VD: Bóng rổ Nam 5x5 Toàn Trường, Bóng đá Nam..."
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

              </div>

              {/* Sport Selector */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Chọn Bộ Môn Thể Thao Thi Đấu *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                  {sports.map((sp) => {
                    const isSelected = sp.id === selectedSportId;
                    const isBasketball = sp.id === 'basketball';

                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleSportChange(sp.id)}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-blue-900 bg-blue-50/90 text-blue-950 shadow-md ring-2 ring-blue-900/30 font-black'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold'
                        }`}
                      >
                        <span className="text-xs truncate max-w-full font-sans font-bold">
                          {sp.name} {isBasketball ? '🏀' : ''}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format, Venue, Date, Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-3">
                
                {/* 4 Tournament Formats */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Thể Thức Thi Đấu *
                  </label>
                  <select
                    value={tournamentFormat}
                    onChange={(e) => setTournamentFormat(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  >
                    <option value="round_robin">1. Đấu vòng tròn</option>
                    <option value="knockout">2. Đấu loại trực tiếp</option>
                    <option value="groups">3. Đấu theo bảng</option>
                    <option value="group_knockout">4. Đấu loại trực tiếp theo Bảng</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {tournamentFormat === 'round_robin' && 'Tất cả các đội thi đấu vòng tròn tính điểm với nhau'}
                    {tournamentFormat === 'knockout' && 'Thi đấu loại trực tiếp từ vòng đầu đến Chung kết'}
                    {tournamentFormat === 'groups' && 'Chia bảng thi đấu vòng tròn trong bảng, chọn đội Nhất/Nhì vào Bán kết'}
                    {tournamentFormat === 'group_knockout' && 'Chia bảng, các đội trong bảng đấu loại trực tiếp nội bộ chọn Quán quân bảng'}
                  </p>
                </div>

                {/* Venue */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Địa Điểm Tổ Chức
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Ngày Khởi Tranh
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Giờ Khai Mạc
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

              </div>
            </div>

            {/* Step 2: Grouping Configuration (Chia ngẫu nhiên 2,3,4,5,6,7,8 hoặc nhập thủ công) */}
            {(tournamentFormat === 'groups' || tournamentFormat === 'group_knockout') && (
              <div className="space-y-4 pt-4 border-t-2 border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h2 className="text-xl sm:text-2xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                    <Layers className="w-6 h-6 text-cyan-600" />
                    <span>2. Phân Bảng Đấu (Chọn 2, 3, 4, 5, 6, 7, 8 Bảng)</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-500">Bước 2 / 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Select Number of Groups: 2 to 8 */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Chọn Số Lượng Bảng Đấu Cần Chia *
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNumGroups(n)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            numGroups === n
                              ? 'border-blue-900 bg-blue-900 text-white font-black shadow-md'
                              : 'border-slate-300 bg-slate-50 hover:bg-white text-slate-800 font-bold'
                          }`}
                        >
                          <div className="text-sm font-black">{n}</div>
                          <div className="text-[10px] uppercase font-semibold">Bảng</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hệ thống sẽ tạo: <strong className="text-blue-950">{activeGroupNames.join(', ')}</strong>
                    </p>
                  </div>

                  {/* Mode: Auto Random vs Manual Group Assignment */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Phương Thức Chia Bảng *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGroupAssignMode('auto_random')}
                        className={`p-3 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center gap-2 ${
                          groupAssignMode === 'auto_random'
                            ? 'border-blue-900 bg-blue-50 text-blue-950 shadow ring-2 ring-blue-900/30'
                            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Shuffle className="w-4 h-4 text-amber-500" />
                        <span>Tự Động Chia Ngẫu Nhiên</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGroupAssignMode('manual_assign')}
                        className={`p-3 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center gap-2 ${
                          groupAssignMode === 'manual_assign'
                            ? 'border-blue-900 bg-blue-50 text-blue-950 shadow ring-2 ring-blue-900/30'
                            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Edit3 className="w-4 h-4 text-blue-700" />
                        <span>Nhập Thủ Công Từng Bảng</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {groupAssignMode === 'auto_random'
                        ? 'Bốc thăm tự động phân bổ đều các đội vào các bảng được chọn.'
                        : 'Cho phép bạn tự chọn bảng đấu cụ thể cho từng đội bên dưới.'}
                    </p>
                  </div>

                </div>

                {/* Manual Group Assignment Table (When manual_assign is active) */}
                {groupAssignMode === 'manual_assign' && (
                  <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">
                        Phân Bổ Thủ Công Từng Đội Vào {numGroups} Bảng Đấu ({activeGroupNames.join(', ')})
                      </h4>
                      <span className="text-xs font-bold text-slate-500">
                        {registrations.length} đội tham gia
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                      {registrations.map((team) => (
                        <div key={team.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-sm">
                          <span className="text-xs font-black text-blue-950 truncate">{team.className}</span>
                          <select
                            value={manualGroupMap[team.className] || activeGroupNames[0]}
                            onChange={(e) => {
                              setManualGroupMap({
                                ...manualGroupMap,
                                [team.className]: e.target.value
                              });
                            }}
                            className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2 py-1 text-slate-900 focus:border-blue-800 outline-none"
                          >
                            {activeGroupNames.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Step 3: Final Launch Action Box */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm shadow">
                    {registrations.length}
                  </span>
                  <h4 className="text-base font-black text-blue-950 font-sans font-bold">
                    Sẵn Sàng Tạo Lịch Đấu & Sơ Đồ Nhánh Đấu
                  </h4>
                </div>
                <p className="text-xs text-slate-600 max-w-xl">
                  Hệ thống sẽ tự động bốc thăm, sinh lịch thi đấu các vòng (vòng bảng, đối đầu, tứ kết, bán kết, chung kết & tranh hạng 3) và mở cây sơ đồ nhánh đấu liên hoàn.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('bracket_draw')}
                  className="px-5 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Dices className="w-4 h-4 animate-spin" />
                  <span>🎲 Sang Sơ Đồ Bốc Thăm Quay Vị Trí</span>
                </button>
                <button
                  type="button"
                  disabled={isCreatingTournament}
                  onClick={handleGenerateTournamentMatches}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white border-2 border-amber-400 font-black text-xs rounded-xl shadow-2xl transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>{isCreatingTournament ? 'Đang Khởi Tạo...' : '⚡ Bốc Thăm & Tạo Nhanh'}</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SƠ ĐỒ NHÁNH ĐẤU & BỐC THĂM QUAY VỊ TRÍ TƯƠNG TÁC        */}
        {/* ============================================================== */}
        {activeSubTab === 'bracket_draw' && (
          <InteractiveBracketDraw
            sports={sports}
            registrations={registrations}
            selectedSportId={selectedSportId}
            subCategory={subCategory}
            venue={venue}
            startDate={startDate}
            numGroupsDefault={numGroups}
            onAddTeamsClick={() => setActiveSubTab('add_manual')}
            onApplyMatches={(newMatches) => {
              if (onCreateTournament) {
                onCreateTournament(newMatches);
              }
              showToast(`Đã áp dụng thành công ${newMatches.length} trận đấu từ sơ đồ bốc thăm!`);
              if (onNavigateToSchedule) {
                onNavigateToSchedule();
              }
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 2: NHẬP DANH SÁCH ĐỘI TỪ FILE MẪU HOẶC EXCEL               */}
        {/* ============================================================== */}
        {activeSubTab === 'import_file' && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl max-w-4xl mx-auto">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                  <Upload className="w-6 h-6 text-cyan-600" />
                  <span>Nhập Danh Sách Đội Từ File Mẫu Hoặc Dán Bảng Tính</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Tải file mẫu về máy, chỉnh sửa trên Excel/Google Sheets rồi tải lên hoặc dán trực tiếp.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleFile}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải File Mẫu (.CSV)</span>
              </button>
            </div>

            {/* Upload File Input Zone */}
            <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-3">
              <Upload className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <label className="cursor-pointer px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black rounded-xl inline-flex items-center gap-2 shadow transition-all">
                  <span>Chọn File Từ Máy Tính (.CSV / .TXT)</span>
                  <input
                    type="file"
                    accept=".csv, .txt, .json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Hỗ trợ file định dạng CSV, văn bản phân cách dấu phẩy hoặc tab Excel.
              </p>
            </div>

            {/* Paste Data Directly Zone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-blue-900" />
                  <span>Hoặc Dán Trực Tiếp Dữ Liệu Từ Bảng Tính Excel:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPastedData([
                      '10A1,10,Đặng Ngọc Ánh,0901122334,Cô Vũ Thị Hà',
                      '10A2,10,Trần Minh Quân,0902233445,Thầy Phan Thanh Tùng',
                      '11A1,11,Nguyễn Mai Chi,0911122334,Thầy Hoàng Tiến Dũng',
                      '12A1,12,Trần Hoàng Nam,0913344556,Thầy Nguyễn Văn Đức'
                    ].join('\n'));
                  }}
                  className="text-xs font-bold text-blue-900 hover:underline"
                >
                  Dán dữ liệu mẫu nhanh
                </button>
              </div>

              <textarea
                rows={6}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="Dán các dòng từ Excel vào đây... (Định dạng: Tên Lớp, Khối, Đội Trưởng, Số Điện Thoại, GVCN)"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 focus:border-blue-800 outline-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('roster_list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => parsePastedOrFileContent(pastedData)}
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Phân Tích & Nạp Danh Sách Đội</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DANH SÁCH 20 ĐỘI THAM GIA (THÊM / XOÁ BỚT)              */}
        {/* ============================================================== */}
        {activeSubTab === 'roster_list' && (
          <div className="space-y-6">
            
            {/* Control Bar: Search + Filter + Actions */}
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm lớp (12A1, 10A5), đội trưởng, GVCN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-800 outline-none"
                />
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-800 outline-none"
                >
                  <option value="all">Tất cả Khối (10, 11, 12)</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>

                <button
                  onClick={() => setActiveSubTab('import_file')}
                  className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Nhập Từ File</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('add_manual')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Đội Thủ Công</span>
                </button>
              </div>

            </div>

            {/* Summary Tag */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-2">
              <span>
                Hiển thị: <strong className="text-blue-950 font-black">{filteredRegistrations.length}</strong> / {registrations.length} đội tham gia
              </span>
              <span className="text-slate-500 italic">
                * Bấm &quot;Xóa Đội&quot; để loại bớt các đội xin rút lui hoặc bấm &quot;Thêm Đội&quot; để bổ sung
              </span>
            </div>

            {/* Team Cards Grid or Empty State */}
            {filteredRegistrations.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
                  <Users className="w-8 h-8 text-blue-700" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-blue-950 font-sans">
                    Chưa Có Đội Nào Trong Danh Sách
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Hệ thống đã bỏ 20 đội mặc định và chuyển sang chế độ tạo thủ công. Bạn có thể tự thêm từng đội hoặc tải file danh sách lên.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveSubTab('add_manual')}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tạo Đội Thủ Công Đầu Tiên</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab('import_file')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-cyan-600" />
                    <span>Nhập Từ File Excel / CSV</span>
                  </button>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredRegistrations.map((team) => {
                const isExpanded = expandedTeamId === team.id;
                const isConfirmingDelete = deletingTeamId === team.id;
                const spObj = sports.find((s) => s.id === team.sportId) || sports[0];

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-700 p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center font-black font-sans font-bold text-base shadow border border-amber-400">
                              {team.className}
                            </span>
                            <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full px-1 shadow border border-slate-200" title="Biểu tượng linh vật đội">
                              {team.emblem || getTeamEmblem(team.className, registrations)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                                <span>Lớp {team.className}</span>
                                <span className="text-sm" title="Linh vật đội">{team.emblem || getTeamEmblem(team.className, registrations)}</span>
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                                K{team.grade}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 block truncate">
                              {repairVietnameseText(team.teacherName)}
                            </span>
                          </div>
                        </div>

                        {/* Edit and Delete Team Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa thông tin đội"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 animate-pulse">
                              <button
                                onClick={() => handleDeleteTeam(team.id, team.className)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg shadow"
                                title="Xác nhận xóa"
                              >
                                Xóa
                              </button>
                              <button
                                onClick={() => setDeletingTeamId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingTeamId(team.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa bớt đội khỏi giải đấu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sport & Details */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Môn thi đấu:</span>
                          <span className="font-bold text-blue-950 flex items-center gap-1">
                            {team.sportId === 'basketball' && <Flame className="w-3.5 h-3.5 text-orange-500 inline" />}
                            {spObj.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Đội trưởng:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[140px]">
                            {repairVietnameseText(team.captainName)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Liên hệ SĐT:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {team.phone || '090...'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Số lượng VĐV:</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-extrabold text-blue-950 text-[11px]">
                            {team.members.length || 5} VĐV
                          </span>
                        </div>
                      </div>

                      {/* Expandable Member Roster */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-100 bg-slate-50 p-2.5 rounded-xl space-y-1.5 text-[11px]">
                          <span className="font-bold text-slate-700 block">Danh sách thành viên:</span>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {team.members.map((m, mIdx) => (
                              <div key={mIdx} className="flex items-center justify-between text-slate-600 border-b border-slate-200/60 pb-0.5">
                                <span className="font-medium truncate max-w-[150px]">{mIdx + 1}. {repairVietnameseText(m.name)}</span>
                                <span className="font-mono text-slate-500 text-[10px]">Áo #{m.jerseyNumber || mIdx + 1} ({m.shirtSize || 'M'})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Toggle Expand */}
                    <div className="pt-3 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        className="w-full py-1.5 text-center text-xs font-bold text-blue-900 hover:text-blue-950 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{isExpanded ? 'Thu gọn danh sách' : 'Xem danh sách VĐV'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: THÊM ĐỘI MỚI THỦ CÔNG (MANUAL ADD FORM)                 */}
        {/* ============================================================== */}
        {activeSubTab === 'add_manual' && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 space-y-8 shadow-xl max-w-4xl mx-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-emerald-500" />
                  <span>Thêm Đội Tham Gia Mới Thủ Công</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Nhập thông tin lớp, đội trưởng và danh sách vận động viên để đưa vào sơ đồ giải đấu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('roster_list')}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Quay lại danh sách
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Class / Team Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Tên Lớp / Tên Đội *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 11A3, 12A6 hoặc Đội Năng Khiếu"
                    value={manualClassName}
                    onChange={(e) => setManualClassName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none uppercase"
                  />
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Khối Lớp *
                  </label>
                  <select
                    value={manualGrade}
                    onChange={(e) => setManualGrade(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  >
                    <option value={10}>Khối 10</option>
                    <option value={11}>Khối 11</option>
                    <option value={12}>Khối 12</option>
                  </select>
                </div>

                {/* Sport */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Môn Đăng Ký Thi Đấu *
                  </label>
                  <select
                    value={manualSportId}
                    onChange={(e) => setManualSportId(e.target.value as SportId)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.id === 'basketball' ? '🏀 (Bóng rổ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Linh Vật / Biểu Tượng Đội Tuyển (Team Mascot / Class Emblem) */}
              <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border-2 border-blue-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-blue-200">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2.5 bg-white rounded-2xl shadow-sm border-2 border-amber-400">
                      {manualEmblem || '🦁'}
                    </span>
                    <div>
                      <label className="block text-xs font-black text-blue-950 uppercase tracking-wider">
                        Biểu Tượng / Linh Vật Đội Tuyển (Team Mascot & Emblem)
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Biểu tượng này sẽ xuất hiện trang trọng trên cây sơ đồ nhánh đấu và lịch thi đấu
                      </span>
                    </div>
                  </div>

                  {/* Custom emoji input */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Tự nhập:</span>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="VD: 🦁, 🔥..."
                      value={manualEmblem}
                      onChange={(e) => setManualEmblem(e.target.value)}
                      className="w-20 bg-white border-2 border-slate-300 rounded-xl px-2.5 py-1.5 text-center text-lg font-black text-blue-950 focus:border-blue-800 outline-none shadow-xs"
                    />
                  </div>
                </div>

                {/* Preset Emblems Quick Selection */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Gợi ý linh vật phổ biến (nhấp chọn nhanh):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {PRESET_EMBLEMS.map((emb) => {
                      const isSelected = manualEmblem === emb.icon;
                      return (
                        <button
                          key={emb.name}
                          type="button"
                          onClick={() => setManualEmblem(emb.icon)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-amber-400 text-blue-950 border-amber-500 shadow-md font-black scale-105 ring-2 ring-amber-400/50'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                          }`}
                        >
                          <span className="text-base">{emb.icon}</span>
                          <span className="text-[11px]">{emb.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Captain, Phone, Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Họ Tên Đội Trưởng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={manualCaptain}
                    onChange={(e) => setManualCaptain(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Số Điện Thoại Liên Hệ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0912345678"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Giáo Viên Chủ Nhiệm / HLV
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thầy Nguyễn Văn Đức"
                    value={manualTeacher}
                    onChange={(e) => setManualTeacher(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                  />
                </div>

              </div>

              {/* Member Roster Inputs */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Danh Sách Vận Động Viên ({manualMembers.length} VĐV)
                  </label>
                  <button
                    type="button"
                    onClick={addManualMember}
                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm VĐV</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {manualMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="w-6 text-center text-xs font-bold text-slate-500">#{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Họ và tên VĐV..."
                        value={m.name}
                        onChange={(e) => handleManualMemberChange(idx, 'name', e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Số áo"
                        value={m.jerseyNumber || ''}
                        onChange={(e) => handleManualMemberChange(idx, 'jerseyNumber', parseInt(e.target.value) || 0)}
                        className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none text-center"
                      />
                      <select
                        value={m.shirtSize || 'M'}
                        onChange={(e) => handleManualMemberChange(idx, 'shirtSize', e.target.value)}
                        className="w-16 bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-800 outline-none"
                      >
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                      {manualMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManualMember(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('roster_list')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white border border-amber-400 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Xác Nhận Thêm Đội Vào Giải Đấu</span>
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
};
