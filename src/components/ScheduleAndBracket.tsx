import React, { useState } from 'react';
import { Match, SportCategory, SportId, Registration } from '../types/sports';
import { Calendar, MapPin, Clock, Trophy, Filter, Plus, Shuffle, Printer } from 'lucide-react';
import { GroupAndDrawTool } from './GroupAndDrawTool';
import { TournamentBracketTree } from './TournamentBracketTree';
import { PrintBracketModal } from './PrintBracketModal';
import { getTeamEmblem } from '../data/mockSportsData';

interface ScheduleAndBracketProps {
  matches: Match[];
  sports: SportCategory[];
  registrations: Registration[];
  isAdmin: boolean;
  onOpenMatchEdit: (match: Match) => void;
  onOpenAddMatch: () => void;
  onApplyNewMatches: (newMatches: Match[]) => void;
  selectedSportFilter: string;
  setSelectedSportFilter: (sport: string) => void;
}

export const ScheduleAndBracket: React.FC<ScheduleAndBracketProps> = ({
  matches,
  sports,
  registrations,
  isAdmin,
  onOpenMatchEdit,
  onOpenAddMatch,
  onApplyNewMatches,
  selectedSportFilter,
  setSelectedSportFilter
}) => {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'list' | 'bracket' | 'draw'>('list');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    const matchSport = selectedSportFilter === 'all' || m.sportId === selectedSportFilter;
    const matchStage = stageFilter === 'all' || m.stage === stageFilter;
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSport && matchStage && matchStatus;
  });

  return (
    <div className="py-8 bg-white min-h-screen text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Royal Blue Floating Header Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl shadow-xl border-4 border-amber-400/90 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Lịch Thi Đấu & Cây Sơ Đồ Trực Tiếp</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans font-bold tracking-tight mt-2">
              Xếp Lịch & Sơ Đồ Thi Đấu
            </h1>
            <p className="text-sm text-blue-100/90 mt-1">
              Theo dõi thời gian, địa điểm thi đấu và sơ đồ loại trực tiếp các môn thể thao THPT Phú Lâm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle View Mode */}
            <div className="bg-blue-950/90 p-1.5 rounded-xl border-2 border-blue-800 flex items-center gap-1 text-xs font-medium shadow-inner">
              <button
                onClick={() => setActiveView('list')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors font-bold ${
                  activeView === 'list'
                    ? 'bg-amber-400 text-blue-950 shadow-md font-black'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                Danh Sách Trận
              </button>
              <button
                onClick={() => setActiveView('bracket')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors font-bold ${
                  activeView === 'bracket'
                    ? 'bg-amber-400 text-blue-950 shadow-md font-black'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                Cây Sơ Đồ (Bracket)
              </button>
              <button
                onClick={() => setActiveView('draw')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-bold ${
                  activeView === 'draw'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 shadow-md font-black'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>🎲 Bốc Thăm & Chia Bảng</span>
              </button>
            </div>

            {/* Print Bracket Diagram Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="py-2 px-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-md border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              title="In sơ đồ nhánh thi đấu dạng biểu đồ chuẩn A4"
            >
              <Printer className="w-4 h-4 text-blue-950" />
              <span>In Sơ Đồ Thi Đấu</span>
            </button>

            {/* Admin Add Match Button */}
            {isAdmin && (
              <button
                onClick={onOpenAddMatch}
                className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Trận Đấu</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar in Crisp White Card */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Sport Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-blue-900" />
              <select
                value={selectedSportFilter}
                onChange={(e) => setSelectedSportFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-200 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-blue-700"
              >
                <option value="all">Tất cả 09 Môn Thi</option>
                {sports.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-blue-700"
            >
              <option value="all">Tất cả Vòng đấu</option>
              <option value="Vòng bảng">Vòng Bảng</option>
              <option value="Tứ kết">Vòng Tứ Kết</option>
              <option value="Bán kết">Vòng Bán Kết</option>
              <option value="Chung kết">Trận Chung Kết</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-blue-700"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="Live">Đang Trực Tiếp</option>
              <option value="Upcoming">Sắp Thi Đấu</option>
              <option value="Finished">Đã Kết Thúc</option>
            </select>
          </div>

          <div className="text-xs text-slate-600 font-medium flex items-center gap-3">
            <span>Hiển thị <span className="font-mono text-blue-900 font-black">{filteredMatches.length}</span> trận đấu</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const headers = 'Ma_Tran,Mon_Thi,Vong_Dau,Bang_Dau,Doi_A,Doi_B,Ty_So_A,Ty_So_B,Ngay,Gio,Dia_Diem,Trang_Thai\n';
                  const rows = filteredMatches.map((m) => {
                    const sportName = sports.find((s) => s.id === m.sportId)?.name || m.sportId;
                    return `"${m.id}","${sportName}","${m.stage}","${m.groupName || ''}","${m.teamA}","${m.teamB}","${m.scoreA !== undefined ? m.scoreA : ''}","${m.scoreB !== undefined ? m.scoreB : ''}","${m.date}","${m.time}","${m.venue}","${m.status}"`;
                  }).join('\n');

                  const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Lich_Thi_Dau_THPT_Phu_Lam_${selectedSportFilter}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                title="Xuất file Excel / CSV để in ấn & phân phát"
              >
                <span>📥 Xuất Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                title="In lịch thi đấu hoặc lưu thành file PDF"
              >
                <span>🖨️ In / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: List View */}
        {activeView === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.length === 0 ? (
              <div className="col-span-full text-center p-12 bg-slate-50 rounded-2xl border-2 border-slate-200 text-slate-500 font-medium">
                Chưa có trận đấu nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredMatches.map((m) => {
                const sp = sports.find((s) => s.id === m.sportId);
                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex flex-col justify-between hover:border-blue-600 transition-all shadow-md hover:shadow-xl relative group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-extrabold text-blue-900 font-sans">
                          {sp?.name || m.sportId} · {m.stage}
                        </span>

                        {m.status === 'Live' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black tracking-wider uppercase border border-red-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                            ĐANG ĐẤU
                          </span>
                        )}
                        {m.status === 'Upcoming' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Sắp thi đấu
                          </span>
                        )}
                        {m.status === 'Finished' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ✓ Kết thúc
                          </span>
                        )}
                      </div>

                      {/* Teams & Score */}
                      <div className="py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 font-sans max-w-[170px] truncate flex items-center gap-1.5">
                            <span className="text-base leading-none shrink-0" title="Biểu tượng đội">
                              {m.teamAEmblem || getTeamEmblem(m.teamA, registrations)}
                            </span>
                            <span className="truncate">{m.teamA}</span>
                          </span>
                          <span className="text-xl font-black font-mono text-blue-900">
                            {m.scoreA !== undefined ? m.scoreA : '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-center text-[10px] font-mono text-slate-400 uppercase tracking-widest my-1">
                          VS
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 font-sans max-w-[170px] truncate flex items-center gap-1.5">
                            <span className="text-base leading-none shrink-0" title="Biểu tượng đội">
                              {m.teamBEmblem || getTeamEmblem(m.teamB, registrations)}
                            </span>
                            <span className="truncate">{m.teamB}</span>
                          </span>
                          <span className="text-xl font-black font-mono text-blue-900">
                            {m.scoreB !== undefined ? m.scoreB : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Sets Detail */}
                      {m.setsDetail && (
                        <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center mb-3">
                          {m.setsDetail}
                        </div>
                      )}

                      {/* Date, Time & Venue */}
                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{m.date} · {m.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{m.venue}</span>
                        </div>
                        {m.mvpPlayer && (
                          <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>MVP: {m.mvpPlayer}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Action Button */}
                    {isAdmin && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => onOpenMatchEdit(m)}
                          className="w-full py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                        >
                          Cập Nhật Tỉ Số & Điểm
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View Mode 2: Knockout Bracket Visualizer Tree */}
        {activeView === 'bracket' && (
          <div className="space-y-6">
            {/* 1 Master Unified Tournament Bracket Tree with Every Match Pair, Branch Connectors & Advancement */}
            <TournamentBracketTree
              matches={matches}
              sports={sports}
              registrations={registrations}
              selectedSportId={selectedSportFilter}
              onOpenMatchEdit={onOpenMatchEdit}
              isAdmin={isAdmin}
              onSwitchToDraw={() => setActiveView('draw')}
            />
          </div>
        )}

        {/* View Mode 3: Group Stage & Draw Tool */}
        {activeView === 'draw' && (
          <GroupAndDrawTool
            sports={sports}
            registrations={registrations}
            onApplyMatches={(newMatches) => {
              onApplyNewMatches(newMatches);
              setActiveView('bracket');
            }}
          />
        )}

        {/* Print Bracket Diagram Modal */}
        {isPrintModalOpen && (
          <PrintBracketModal
            matches={matches}
            sports={sports}
            registrations={registrations}
            selectedSportId={selectedSportFilter}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}

      </div>
    </div>
  );
};
