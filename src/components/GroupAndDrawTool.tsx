import React, { useState } from 'react';
import { SportCategory, Registration, Match, SportId } from '../types/sports';
import { Shuffle, Trophy, CheckCircle, Sparkles, RefreshCw, ArrowRight, Layers, ShieldCheck, Flame, Edit3, Grid, GitBranch, Zap, MoveHorizontal, Dices } from 'lucide-react';
import { InteractiveBracketDraw } from './InteractiveBracketDraw';

interface GroupAndDrawToolProps {
  sports: SportCategory[];
  registrations: Registration[];
  onApplyMatches: (newMatches: Match[]) => void;
  onClose?: () => void;
}

const ALL_CLASSES = [
  '10A1', '10A2', '10A3', '10A4', '10A5', '10A6', '10A7', '10A8', '10A9', '10A10',
  '11A1', '11A2',
  '12A1', '12A2', '12A3', '12A4', '12A5', '12A7', '12A8', '12A9'
];

interface GroupResult {
  groupName: string; // e.g. "Bảng A"
  teams: string[];
}

interface PairingResult {
  matchId: string;
  stage: 'Tứ kết' | 'Bán kết' | 'Vòng Bảng';
  teamA: string;
  teamB: string;
}

export const GroupAndDrawTool: React.FC<GroupAndDrawToolProps> = ({
  sports,
  registrations,
  onApplyMatches,
  onClose
}) => {
  const [toolView, setToolView] = useState<'interactive_bracket' | 'fast_draw'>('interactive_bracket');
  const [selectedSportId, setSelectedSportId] = useState<SportId>('football');
  const [drawMode, setRegDrawMode] = useState<
    'round_robin' | 'knockout' | 'groups' | 'group_knockout' | 'manual' | 'manual_group_knockout'
  >('group_knockout');
  const [numGroups, setNumGroups] = useState<number>(4); // 2 to 8 groups
  const [seedMethod, setSeedMethod] = useState<'random' | 'seeded'>('random');

  // Advancement Format After Group Stage
  const [advancementFormat, setAdvancementFormat] = useState<
    'top2_knockout' | 'winners_wildcard' | 'cross_playoff' | 'championship_round'
  >('top2_knockout');

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [groupResults, setGroupResults] = useState<GroupResult[]>([]);
  const [pairingResults, setPairingResults] = useState<PairingResult[]>([]);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [randomizePairings, setRandomizePairings] = useState<boolean>(true);

  // Manual Custom Group Assignments: map className -> "Bảng A" | "Bảng B" | "Bảng C" | "Bảng D"
  const [manualAssignments, setManualAssignments] = useState<{ [cls: string]: string }>({
    '10A1': 'Bảng A', '10A2': 'Bảng B', '10A3': 'Bảng A', '10A4': 'Bảng B',
    '11A1': 'Bảng A', '11A2': 'Bảng B', '12A1': 'Bảng A', '12A2': 'Bảng B'
  });

  const currentSport = sports.find((s) => s.id === selectedSportId) || sports[0];

  // Get list of teams available for draw for current sport
  const registeredTeamsForSport = registrations
    .filter((r) => r.sportId === selectedSportId)
    .map((r) => `Lớp ${r.className}`);

  // Fallback to all 20 classes
  const teamsToDraw =
    registeredTeamsForSport.length >= 4
      ? registeredTeamsForSport
      : ALL_CLASSES.map((c) => `Lớp ${c}`);

  // Handle Manual Assignment Change
  const handleAssignClassGroup = (classNameOnly: string, groupName: string) => {
    setManualAssignments((prev) => ({
      ...prev,
      [classNameOnly]: groupName
    }));
  };

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const activeGroupNames = groupLetters.slice(0, numGroups).map((l) => `Bảng ${l}`);

  // Generate Group Results from Manual Selection
  const buildManualGroupResults = (): GroupResult[] => {
    const groupMap: { [gName: string]: string[] } = {};
    activeGroupNames.forEach((gn) => (groupMap[gn] = []));

    ALL_CLASSES.forEach((c) => {
      const g = manualAssignments[c] || activeGroupNames[0];
      if (groupMap[g]) {
        groupMap[g].push(`Lớp ${c}`);
      } else {
        groupMap[activeGroupNames[0]].push(`Lớp ${c}`);
      }
    });

    return activeGroupNames.map((gn) => ({
      groupName: gn,
      teams: groupMap[gn] || []
    }));
  };

  // Handle Draw Action
  const handleStartDraw = () => {
    setIsDrawing(true);
    setAppliedSuccess(false);

    setTimeout(() => {
      if (drawMode === 'round_robin') {
        const shuffled = [...teamsToDraw].sort(() => Math.random() - 0.5);
        const pairings: PairingResult[] = [];
        for (let i = 0; i < shuffled.length; i++) {
          for (let j = i + 1; j < shuffled.length; j++) {
            pairings.push({
              matchId: `M-RR-${i + 1}-${j + 1}`,
              stage: 'Vòng Bảng' as any,
              teamA: shuffled[i],
              teamB: shuffled[j]
            });
          }
        }
        setPairingResults(pairings);
        setGroupResults([]);
      } else if (drawMode === 'manual' || drawMode === 'manual_group_knockout') {
        const manualResults = buildManualGroupResults();
        setGroupResults(manualResults);
        setPairingResults([]);
      } else if (drawMode === 'groups' || drawMode === 'group_knockout') {
        const shuffled = [...teamsToDraw].sort(() => Math.random() - 0.5);
        const groups: GroupResult[] = [];

        for (let i = 0; i < numGroups; i++) {
          groups.push({
            groupName: `Bảng ${groupLetters[i]}`,
            teams: []
          });
        }

        // Distribute teams evenly into groups
        shuffled.forEach((team, idx) => {
          const groupIdx = idx % numGroups;
          groups[groupIdx].teams.push(team);
        });

        setGroupResults(groups);
        setPairingResults([]);
      } else {
        // Knockout pairings
        const shuffled = [...teamsToDraw].sort(() => Math.random() - 0.5);
        const pairings: PairingResult[] = [];
        for (let i = 0; i < shuffled.length - 1; i += 2) {
          pairings.push({
            matchId: `M-DRAW-${i + 1}`,
            stage: 'Tứ kết',
            teamA: shuffled[i],
            teamB: shuffled[i + 1]
          });
        }
        setPairingResults(pairings);
        setGroupResults([]);
      }

      setIsDrawing(false);
    }, 500);
  };

  // Apply Draw & Subsequent Advancement Tree to Official Match Schedule
  const handleApplyToSchedule = async () => {
    const generatedMatches: Match[] = [];
    const today = new Date().toISOString().split('T')[0];

    const activeGroups =
      drawMode === 'manual' || drawMode === 'manual_group_knockout'
        ? buildManualGroupResults()
        : groupResults;

    if (drawMode === 'round_robin') {
      const shuffled = [...teamsToDraw].sort(() => Math.random() - 0.5);
      const topTeams = shuffled.slice(0, 8);
      let count = 0;
      for (let i = 0; i < topTeams.length; i++) {
        for (let j = i + 1; j < topTeams.length; j++) {
          count++;
          generatedMatches.push({
            id: `M-RR-${Date.now().toString().slice(-4)}-${i}${j}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Vòng Tròn',
            stage: 'Vòng bảng',
            groupName: 'Vòng Tròn Tính Điểm',
            teamA: topTeams[i],
            teamB: topTeams[j],
            status: 'Upcoming',
            date: today,
            time: `${String(8 + (count % 6)).padStart(2, '0')}:00`,
            venue: currentSport.venue
          });
        }
      }
    } else if (drawMode === 'group_knockout' || drawMode === 'manual_group_knockout') {
      // INTERNAL GROUP KNOCKOUT MODE: Teams inside each group play knockout matches against each other!
      activeGroups.forEach((group, gIdx) => {
        const tList = randomizePairings
          ? [...group.teams].sort(() => Math.random() - 0.5)
          : group.teams;
        // Internal knockout pairs (e.g., 0 vs 1, 2 vs 3)
        for (let i = 0; i < tList.length - 1; i += 2) {
          generatedMatches.push({
            id: `M-GK-${Date.now().toString().slice(-4)}-${gIdx}${i}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Vòng Loại Nội Bộ',
            stage: 'Bán kết',
            groupName: group.groupName,
            teamA: tList[i],
            teamB: tList[i + 1],
            status: 'Upcoming',
            date: today,
            time: `${String(8 + gIdx + Math.floor(i / 2)).padStart(2, '0')}:00`,
            venue: currentSport.venue
          });
        }
        if (tList.length >= 4) {
          generatedMatches.push({
            id: `M-GK-FIN-${Date.now().toString().slice(-4)}-${gIdx}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Chung Kết Bảng',
            stage: 'Chung kết',
            groupName: group.groupName,
            teamA: `Thắng Bán Kết ${group.groupName} (1)`,
            teamB: `Thắng Bán Kết ${group.groupName} (2)`,
            status: 'Upcoming',
            date: '2026-10-08',
            time: `${String(14 + gIdx).padStart(2, '0')}:30`,
            venue: currentSport.venue
          });
        }
      });

      // Grand Final between Group Winners
      generatedMatches.push({
        id: `M-GRAND-FIN-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Tranh Vô Địch Toàn Trường',
        stage: 'Chung kết',
        teamA: 'Nhất Bảng A',
        teamB: numGroups === 4 ? 'Nhất Bảng C' : 'Nhất Bảng B',
        status: 'Upcoming',
        date: '2026-10-09',
        time: '16:00',
        venue: currentSport.venue
      });

      // 3rd Place Playoff between Group Runners-Up
      generatedMatches.push({
        id: `M-GRAND-BRONZE-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Tranh Hạng 3 Toàn Trường',
        stage: 'Trận Tranh Hạng 3',
        teamA: 'Nhì Bảng A',
        teamB: numGroups === 4 ? 'Nhì Bảng C' : 'Nhì Bảng B',
        status: 'Upcoming',
        date: '2026-10-09',
        time: '14:30',
        venue: currentSport.venue
      });
    } else if (drawMode === 'groups' || drawMode === 'manual') {
      // 1. Group stage round-robin matches
      activeGroups.forEach((group, gIdx) => {
        const tList = group.teams;
        for (let i = 0; i < tList.length; i++) {
          for (let j = i + 1; j < tList.length; j++) {
            generatedMatches.push({
              id: `M-G-${Date.now().toString().slice(-4)}-${gIdx}${i}${j}`,
              sportId: selectedSportId,
              subCategory: currentSport.subCategories[0] || 'Vòng Bảng',
              stage: 'Vòng bảng',
              groupName: group.groupName,
              teamA: tList[i],
              teamB: tList[j],
              status: 'Upcoming',
              date: today,
              time: `${String(8 + gIdx).padStart(2, '0')}:${(i * 30).toString().padStart(2, '0')}`,
              venue: currentSport.venue
            });
          }
        }
      });

      // 2. Playoff / Knockout Matches according to Advancement Format
      if (advancementFormat === 'top2_knockout' || advancementFormat === 'cross_playoff') {
        if (numGroups === 2) {
          generatedMatches.push({
            id: `M-SF1-${Date.now().toString().slice(-4)}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Bán kết',
            stage: 'Bán kết',
            teamA: 'Nhất Bảng A',
            teamB: 'Nhì Bảng B',
            status: 'Upcoming',
            date: '2026-10-08',
            time: '14:00',
            venue: currentSport.venue
          });
          generatedMatches.push({
            id: `M-SF2-${Date.now().toString().slice(-4)}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Bán kết',
            stage: 'Bán kết',
            teamA: 'Nhất Bảng B',
            teamB: 'Nhì Bảng A',
            status: 'Upcoming',
            date: '2026-10-08',
            time: '15:00',
            venue: currentSport.venue
          });
        } else {
          generatedMatches.push({
            id: `M-QF1-${Date.now().toString().slice(-4)}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Tứ kết',
            stage: 'Tứ kết',
            teamA: 'Nhất Bảng A',
            teamB: 'Nhì Bảng B',
            status: 'Upcoming',
            date: '2026-10-08',
            time: '08:00',
            venue: currentSport.venue
          });
          generatedMatches.push({
            id: `M-QF2-${Date.now().toString().slice(-4)}`,
            sportId: selectedSportId,
            subCategory: currentSport.subCategories[0] || 'Tứ kết',
            stage: 'Tứ kết',
            teamA: 'Nhất Bảng C',
            teamB: 'Nhì Bảng D',
            status: 'Upcoming',
            date: '2026-10-08',
            time: '09:00',
            venue: currentSport.venue
          });
        }

        generatedMatches.push({
          id: `M-BRONZE-${Date.now().toString().slice(-4)}`,
          sportId: selectedSportId,
          subCategory: currentSport.subCategories[0] || 'Tranh Hạng 3',
          stage: 'Trận Tranh Hạng 3',
          teamA: 'Thua Bán Kết 1',
          teamB: 'Thua Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-09',
          time: '14:30',
          venue: currentSport.venue
        });

        generatedMatches.push({
          id: `M-FIN-${Date.now().toString().slice(-4)}`,
          sportId: selectedSportId,
          subCategory: currentSport.subCategories[0] || 'Chung kết',
          stage: 'Chung kết',
          teamA: 'Thắng Bán Kết 1',
          teamB: 'Thắng Bán Kết 2',
          status: 'Upcoming',
          date: '2026-10-09',
          time: '16:00',
          venue: currentSport.venue
        });
      }
    } else {
      // DIRECT KNOCKOUT
      pairingResults.forEach((p, idx) => {
        generatedMatches.push({
          id: `M-KNOCK-QF-${Date.now().toString().slice(-4)}-${idx}`,
          sportId: selectedSportId,
          subCategory: currentSport.subCategories[0] || 'Loại Trực Tiếp',
          stage: 'Tứ kết',
          teamA: p.teamA,
          teamB: p.teamB,
          status: 'Upcoming',
          date: today,
          time: `${String(9 + Math.floor(idx / 2)).padStart(2, '0')}:${(idx % 2 === 0 ? '00' : '30')}`,
          venue: currentSport.venue
        });
      });

      generatedMatches.push({
        id: `M-KNOCK-SF1-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Loại Trực Tiếp',
        stage: 'Bán kết',
        teamA: 'Thắng Tứ Kết 1',
        teamB: 'Thắng Tứ Kết 2',
        status: 'Upcoming',
        date: '2026-10-08',
        time: '14:00',
        venue: currentSport.venue
      });

      generatedMatches.push({
        id: `M-KNOCK-SF2-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Loại Trực Tiếp',
        stage: 'Bán kết',
        teamA: 'Thắng Tứ Kết 3',
        teamB: 'Thắng Tứ Kết 4',
        status: 'Upcoming',
        date: '2026-10-08',
        time: '15:00',
        venue: currentSport.venue
      });

      generatedMatches.push({
        id: `M-KNOCK-BRONZE-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Tranh Hạng 3',
        stage: 'Trận Tranh Hạng 3',
        teamA: 'Thua Bán Kết 1',
        teamB: 'Thua Bán Kết 2',
        status: 'Upcoming',
        date: '2026-10-09',
        time: '14:30',
        venue: currentSport.venue
      });

      generatedMatches.push({
        id: `M-KNOCK-FINAL-${Date.now().toString().slice(-4)}`,
        sportId: selectedSportId,
        subCategory: currentSport.subCategories[0] || 'Chung kết',
        stage: 'Chung kết',
        teamA: 'Thắng Bán Kết 1',
        teamB: 'Thắng Bán Kết 2',
        status: 'Upcoming',
        date: '2026-10-09',
        time: '16:00',
        venue: currentSport.venue
      });
    }

    if (generatedMatches.length === 0) return;

    for (const m of generatedMatches) {
      try {
        await fetch('/api/match/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m)
        });
      } catch (e) {
        console.error(e);
      }
    }

    onApplyMatches(generatedMatches);
    setAppliedSuccess(true);
  };

  if (toolView === 'interactive_bracket') {
    return (
      <div className="space-y-4">
        {/* Toggle Bar */}
        <div className="flex items-center justify-between bg-slate-100 p-2 rounded-2xl border border-slate-300">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setToolView('interactive_bracket')}
              className="px-4 py-2 rounded-xl bg-blue-950 text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Sơ Đồ Nhánh & Bốc Thăm Quay Vị Trí</span>
            </button>
            <button
              onClick={() => setToolView('fast_draw')}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-white font-bold text-xs flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-900" />
              <span>Bốc Thăm Nhanh Toàn Bộ</span>
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
            >
              Đóng
            </button>
          )}
        </div>

        <InteractiveBracketDraw
          sports={sports}
          registrations={registrations}
          selectedSportId={selectedSportId}
          numGroupsDefault={numGroups}
          onApplyMatches={onApplyMatches}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 space-y-6 shadow-2xl text-slate-900">
      
      {/* Toggle to Interactive Bracket */}
      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-2xl border border-blue-200">
        <span className="text-xs font-bold text-blue-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Muốn trải nghiệm bốc thăm quay ngẫu nhiên theo từng vị trí trên cây sơ đồ?</span>
        </span>
        <button
          onClick={() => setToolView('interactive_bracket')}
          className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Mở Sơ Đồ Bốc Thăm Vị Trí</span>
        </button>
      </div>
      
      {/* Royal Blue Floating Header Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl shadow-xl border-4 border-amber-400/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full mb-2">
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Công Cụ Phân Bảng & Đấu Loại Trực Tiếp Nội Bộ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-sans font-bold">
            Chia 2 Bảng Hoặc 4 Bảng - Các Đội Đấu Loại Trực Tiếp Trong Bảng
          </h2>
          <p className="text-xs text-blue-100/90 mt-1">
            Hệ thống chia các lớp thành 2 hoặc 4 bảng đấu, trong đó các đội trong mỗi bảng sẽ thi đấu loại trực tiếp với nhau để chọn ra Quán Quân mỗi bảng.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs font-bold text-blue-100 hover:text-white px-3.5 py-2 bg-blue-900/80 rounded-xl border border-blue-700 shadow-sm"
          >
            Đóng
          </button>
        )}
      </div>

      {/* Control Form Bar in Crisp Slate Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
        
        {/* Sport Select */}
        <div>
          <label className="block text-xs font-black text-blue-950 mb-1.5 uppercase tracking-wider">
            Chọn Môn Áp Dụng *
          </label>
          <select
            value={selectedSportId}
            onChange={(e) => setSelectedSportId(e.target.value as SportId)}
            className="w-full bg-white border-2 border-slate-300 text-blue-950 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
          >
            {sports.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Draw Mode Select */}
        <div>
          <label className="block text-xs font-black text-blue-950 mb-1.5 uppercase tracking-wider">
            Hình Thức Thi Đấu *
          </label>
          <select
            value={drawMode}
            onChange={(e) => setRegDrawMode(e.target.value as any)}
            className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
          >
            <option value="round_robin">1. Đấu vòng tròn</option>
            <option value="knockout">2. Đấu loại trực tiếp</option>
            <option value="groups">3. Đấu theo bảng</option>
            <option value="group_knockout">4. Đấu loại trực tiếp theo Bảng</option>
          </select>
        </div>

        {/* Number of Groups */}
        {(drawMode === 'groups' || drawMode === 'group_knockout') ? (
          <div>
            <label className="block text-xs font-black text-blue-950 mb-1.5 uppercase tracking-wider">
              Số Bảng Đấu *
            </label>
            <select
              value={numGroups}
              onChange={(e) => setNumGroups(parseInt(e.target.value))}
              className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
            >
              <option value={2}>02 Bảng (Bảng A, B)</option>
              <option value={3}>03 Bảng (Bảng A, B, C)</option>
              <option value={4}>04 Bảng (Bảng A, B, C, D)</option>
              <option value={5}>05 Bảng (Bảng A, B, C, D, E)</option>
              <option value={6}>06 Bảng (Bảng A, B, C, D, E, F)</option>
              <option value={7}>07 Bảng (Bảng A, B, C, D, E, F, G)</option>
              <option value={8}>08 Bảng (Bảng A, B, C, D, E, F, G, H)</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-black text-blue-950 mb-1.5 uppercase tracking-wider">
              Chế Độ Phân Nhánh *
            </label>
            <select
              value={seedMethod}
              onChange={(e) => setSeedMethod(e.target.value as any)}
              className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
            >
              <option value="random">🎲 Bốc thăm ngẫu nhiên toàn bộ</option>
              <option value="seeded">⭐ Phân nhánh hạt giống Khối 10, 11, 12</option>
            </select>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-end">
          <button
            onClick={handleStartDraw}
            disabled={isDrawing}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Shuffle className={`w-4 h-4 ${isDrawing ? 'animate-spin' : ''}`} />
            <span>{isDrawing ? 'Đang Xử Lý...' : '🎰 Bắt Đầu Bốc Thăm & Chia Bảng'}</span>
          </button>
        </div>

      </div>

      {/* Manual Group Selection Table (Shown when drawMode === 'manual' or 'manual_group_knockout') */}
      {(drawMode === 'manual' || drawMode === 'manual_group_knockout') && (
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-900" />
                <span>Bảng Chọn Bảng Thủ Công ({numGroups} Bảng)</span>
              </h3>
            </div>
            <button
              onClick={handleStartDraw}
              className="py-1.5 px-3.5 bg-blue-900 text-white font-bold text-xs rounded-lg hover:bg-blue-800 shadow-sm"
            >
              Cập nhật bảng
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {ALL_CLASSES.map((cls) => (
              <div key={cls} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs font-black text-slate-800">Lớp {cls}</div>
                <select
                  value={manualAssignments[cls] || activeGroupNames[0]}
                  onChange={(e) => handleAssignClassGroup(cls, e.target.value)}
                  className="w-full bg-white text-blue-950 font-bold text-[11px] px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-700"
                >
                  {activeGroupNames.map((gn) => (
                    <option key={gn} value={gn}>
                      {gn}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draw Results & Action Button */}
      {isDrawing ? (
        <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border-2 border-slate-200">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-blue-950 uppercase tracking-widest animate-pulse">
            Đang Chia 2/4 Bảng & Tạo Cặp Đấu Loại Trực Tiếp Cho Môn {currentSport.name}...
          </p>
        </div>
      ) : groupResults.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-blue-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>
                Kết Quả Chia {numGroups} Bảng Đấu Loại Trực Tiếp Nội Bộ - Môn {currentSport.name}
              </span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {(drawMode === 'group_knockout' || drawMode === 'manual_group_knockout') && (
                <label className="flex items-center gap-2 text-xs text-blue-950 font-bold cursor-pointer bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-sm">
                  <input
                    type="checkbox"
                    checked={randomizePairings}
                    onChange={(e) => setRandomizePairings(e.target.checked)}
                    className="rounded border-slate-300 text-blue-900 focus:ring-blue-700 w-4 h-4"
                  />
                  <span>🎲 Trộn ngẫu nhiên cặp đấu trong bảng</span>
                </label>
              )}

              {/* Prominent Action Button */}
              <button
                onClick={handleApplyToSchedule}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-full shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                <CheckCircle className="w-5 h-5 text-white" />
                <Zap className="w-4 h-4 fill-white text-white" />
                <span>
                  {appliedSuccess ? '✓ Đã Tạo Lịch Đấu Loại Trực Tiếp Theo Bảng!' : 'Tạo Lịch Đấu Loại Trực Tiếp Trong Bảng'}
                </span>
              </button>
            </div>
          </div>

          {appliedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>🎉 Đã tạo thành công lịch đấu loại trực tiếp nội bộ cho từng bảng VÀ trận chung kết toàn trường! Xem ngay tại mục "Danh Sách Trận" hoặc "Cây Sơ Đồ (Bracket)".</span>
            </div>
          )}

          {/* Group Results with Smooth Horizontal Scroll */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold sm:hidden">
              <MoveHorizontal className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>Vuốt ngang để xem đủ các bảng đấu</span>
            </div>

            <div className="horizontal-scroll-container overflow-x-auto scroll-smooth pb-3 -mx-2 px-2">
              <div className={`grid grid-cols-1 ${groupResults.length === 2 ? 'sm:grid-cols-2 min-w-[540px]' : ''} ${groupResults.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4 min-w-[840px]' : ''} gap-6`}>
                {groupResults.map((group, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border-2 border-slate-200 space-y-3 shadow-md shrink-0 hover:border-blue-700 transition-all">
                    <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white p-2.5 rounded-xl flex items-center justify-between border-2 border-amber-400/80 shadow-sm">
                      <span className="text-xs font-black font-sans font-bold uppercase tracking-wider">
                        {group.groupName} (Đấu Loại Trực Tiếp)
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 font-bold">{group.teams.length} Lớp</span>
                    </div>

                    <div className="space-y-2">
                      {group.teams.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-700" />
                            <span>{t}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">Hạt giống #{tIdx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : pairingResults.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-black text-blue-950 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Kết Quả Bốc Thăm Cặp Đấu Loại Trực Tiếp (Knockout Bracket)</span>
            </h3>

            <button
              onClick={handleApplyToSchedule}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-full shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <CheckCircle className="w-5 h-5 text-white" />
              <Zap className="w-4 h-4 fill-white text-white" />
              <span>
                {appliedSuccess ? '✓ Đã Tạo Lịch & Cây Sơ Đồ!' : 'Tạo Lịch Thi Đấu & Cây Sơ Đồ Loại Trực Tiếp'}
              </span>
            </button>
          </div>

          {appliedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>🎉 Đã tạo thành công lịch đấu loại trực tiếp toàn bộ các vòng!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairingResults.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-slate-200 space-y-2 text-xs shadow-md">
                <div className="flex justify-between text-blue-950 font-black">
                  <span>Trận #{idx + 1} ({p.stage})</span>
                  <span>{currentSport.name}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm">
                  <span>{p.teamA}</span>
                  <span className="text-slate-400 text-xs font-mono font-bold">VS</span>
                  <span>{p.teamB}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-slate-200 text-slate-600 text-xs font-medium">
          Nhấp nút <span className="text-blue-900 font-black">"🎰 Bắt Đầu Bốc Thăm & Chia Bảng"</span> ở trên để khởi tạo.
        </div>
      )}

    </div>
  );
};
