import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Calendar, Award, Plus, Trash2, Edit3, 
  Search, Shield, CheckCircle2, AlertCircle, RefreshCw, 
  FileText, ArrowLeft, Download, Upload, Eye, Layers, ChevronRight, Printer
} from 'lucide-react';
import { TournamentData, SportCategory, Match, Registration, SportId } from '../types/sports';
import { getSportIcon } from '../utils/sportIcons';
import { TournamentBracketTree } from './TournamentBracketTree';
import { PrintBracketModal } from './PrintBracketModal';

interface SportDetailCardModalProps {
  sport: SportCategory;
  tournamentData: TournamentData;
  isAdmin: boolean;
  onClose: () => void;
  onUpdateRegistration: (updatedReg: Registration) => void;
  onDeleteRegistration: (id: string) => void;
  onAddNewMatch: (match: Match) => void;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
}

export const SportDetailCardModal: React.FC<SportDetailCardModalProps> = ({
  sport,
  tournamentData,
  isAdmin,
  onClose,
  onUpdateRegistration,
  onDeleteRegistration,
  onAddNewMatch,
  onUpdateMatch,
  onDeleteMatch
}) => {
  const [activeTab, setActiveTab] = useState<'registrations' | 'schedule' | 'bracket' | 'results'>('registrations');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Filtered Data for this Sport
  const sportRegistrations = tournamentData.registrations.filter(
    (r) => r.sportId === sport.id && (selectedSubCategory === 'all' || r.subCategory === selectedSubCategory)
  );

  const sportMatches = tournamentData.matches.filter(
    (m) => m.sportId === sport.id && (selectedSubCategory === 'all' || m.subCategory === selectedSubCategory || !m.subCategory)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-amber-400 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-4 border-amber-400 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-amber-400 flex items-center justify-center shadow-md p-2">
              {getSportIcon(sport.id, "w-8 h-8 text-amber-400")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-blue-950 text-[10px] font-black uppercase tracking-wider">
                  Môn Thi Đấu Chính Thức
                </span>
                <span className="text-xs text-blue-200 font-mono">📍 {sport.venue}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white mt-0.5">
                {sport.name}
              </h2>
              <p className="text-xs text-blue-100/80">{sport.englishName} · {sport.rulesSummary}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Sơ Đồ & Lịch Môn</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SubCategory Filter & Tab Switcher Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
          
          {/* SubCategories */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-900" />
              <span>Hạng Mục:</span>
            </span>
            <button
              onClick={() => setSelectedSubCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSubCategory === 'all'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Tất Cả ({sport.subCategories.length})
            </button>
            {sport.subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubCategory(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSubCategory === sub
                    ? 'bg-blue-950 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Main 4 Tabs */}
          <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'registrations'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danh Sách Đăng Ký ({sportRegistrations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lịch Thi Đấu ({sportMatches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'bracket'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Sơ Đồ Thi Đấu</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Kết Quả & Xếp Hạng</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {/* TAB 1: REGISTRATIONS */}
          {activeTab === 'registrations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Danh Sách Các Đội & Vận Động Viên Đăng Ký Môn {sport.name}
                </h3>
                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                  Tổng số: {sportRegistrations.length} đơn đăng ký
                </span>
              </div>

              {sportRegistrations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                  <Users className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-semibold text-sm">Chưa có lớp nào đăng ký tham gia môn {sport.name} trong hạng mục này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sportRegistrations.map((reg) => (
                    <div key={reg.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{reg.emblem || '🏅'}</span>
                          <div>
                            <span className="font-black text-blue-950 text-base">{reg.className}</span>
                            <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              {reg.subCategory}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {reg.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                        <div>Đội trưởng / VĐV: <strong>{reg.captainName}</strong> ({reg.phone || 'Chưa có SĐT'})</div>
                        <div>Giáo viên chủ nhiệm: <strong>{reg.teacherName || 'Chưa cập nhật'}</strong></div>
                        {reg.members && reg.members.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            Thành viên: {reg.members.map(m => m.name).join(', ')}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => onDeleteRegistration(reg.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa đăng ký"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Lịch Thi Đấu Chi Tiết Môn {sport.name}
                </h3>
                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                  Tổng số: {sportMatches.length} trận đấu
                </span>
              </div>

              {sportMatches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-semibold text-sm">Chưa có lịch thi đấu cho môn này. Vui lòng vào trang Quản lý giải đấu để tạo cây sơ đồ.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sportMatches.map((match) => (
                    <div key={match.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {match.stage} {match.groupName ? `(${match.groupName})` : ''}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg font-mono ${
                          match.status === 'Finished' ? 'bg-emerald-100 text-emerald-800' :
                          match.status === 'Live' ? 'bg-amber-100 text-amber-800 animate-pulse font-black' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {match.status === 'Finished' ? '🏁 Đã xong' : match.status === 'Live' ? '🔴 Đang diễn ra' : '⏰ Sắp diễn ra'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 py-2">
                        <div className="flex-1 text-right font-bold text-slate-900 text-sm truncate">
                          {match.teamA}
                        </div>
                        <div className="px-3 py-1.5 bg-slate-900 text-amber-400 font-mono font-black text-sm rounded-xl shrink-0">
                          {match.scoreA !== undefined ? match.scoreA : '-'} : {match.scoreB !== undefined ? match.scoreB : '-'}
                        </div>
                        <div className="flex-1 text-left font-bold text-slate-900 text-sm truncate">
                          {match.teamB}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>📅 {match.date} lúc {match.time}</span>
                        <span>📍 {match.venue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BRACKET */}
          {activeTab === 'bracket' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <TournamentBracketTree
                matches={sportMatches}
                sports={[sport]}
                selectedSportId={sport.id}
                isAdmin={isAdmin}
                onOpenMatchEdit={onUpdateMatch}
              />
            </div>
          )}

          {/* TAB 4: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-black text-blue-950 uppercase tracking-tight flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>Thẻ Kết Quả Theo Từng Giải Đấu Môn {sport.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mỗi giải đấu được hiển thị thẻ kết quả riêng biệt, không hiển thị chung.
                  </p>
                </div>
                {(tournamentData.tournaments || []).filter((t) => t.sportId === sport.id).length > 0 && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-950 text-xs font-black rounded-full border border-blue-200">
                    {(tournamentData.tournaments || []).filter((t) => t.sportId === sport.id).length} giải đấu độc lập
                  </span>
                )}
              </div>

              {(tournamentData.tournaments || []).filter((t) => t.sportId === sport.id).length > 0 ? (
                (tournamentData.tournaments || [])
                  .filter((t) => t.sportId === sport.id)
                  .map((tour) => {
                    const tourMatches = sportMatches.filter((m) => m.tournamentId === tour.id || (!m.tournamentId && (tournamentData.tournaments || []).filter((t) => t.sportId === sport.id).length === 1));
                    const finals = tourMatches.filter((m) => m.stage === 'Chung kết' || m.stage === 'Trận Tranh Hạng 3' || m.stage === 'Bán kết');
                    const grandFinal = tourMatches.find((m) => m.stage === 'Chung kết');
                    const champion = grandFinal && grandFinal.status === 'Finished' && grandFinal.scoreA !== undefined && grandFinal.scoreB !== undefined
                      ? grandFinal.scoreA > grandFinal.scoreB ? grandFinal.teamA : grandFinal.teamB
                      : null;

                    return (
                      <div key={tour.id} className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-amber-400 text-blue-950 font-black text-xs">
                              🏆
                            </span>
                            <div>
                              <h4 className="text-sm font-black text-blue-950">{tour.name}</h4>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {tour.subCategory || 'Toàn trường'} · {tourMatches.length} trận đấu riêng
                              </span>
                            </div>
                          </div>

                          {champion && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-black text-amber-950">
                              <span>🥇 Quán Quân:</span>
                              <span className="text-blue-950 font-sans">{champion}</span>
                            </div>
                          )}
                        </div>

                        {finals.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">
                            Giải đấu này chưa có các trận bán kết hoặc chung kết được xếp lịch.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {finals.map((m) => {
                              const isFinished = m.status === 'Finished';
                              const winner = isFinished && m.scoreA !== undefined && m.scoreB !== undefined
                                ? m.scoreA > m.scoreB ? m.teamA : m.teamB
                                : null;

                              return (
                                <div
                                  key={m.id}
                                  className={`rounded-2xl border-2 p-3.5 space-y-2 shadow-xs transition-all ${
                                    m.stage === 'Chung kết'
                                      ? 'bg-gradient-to-br from-amber-50 to-yellow-50/50 border-amber-300'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-blue-900 uppercase font-black">{m.stage}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                      isFinished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {isFinished ? '✓ Đã xong' : 'Sắp đấu'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between font-bold text-xs">
                                    <span className={`truncate max-w-[90px] ${winner === m.teamA ? 'text-amber-800 font-black' : 'text-slate-800'}`}>
                                      {m.teamA}
                                    </span>
                                    <span className="font-mono text-blue-950 font-black px-2 py-0.5 bg-white rounded border border-slate-200">
                                      {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                                    </span>
                                    <span className={`truncate max-w-[90px] text-right ${winner === m.teamB ? 'text-amber-800 font-black' : 'text-slate-800'}`}>
                                      {m.teamB}
                                    </span>
                                  </div>

                                  {winner && (
                                    <div className="text-[10px] text-emerald-700 font-bold text-center pt-1 border-t border-slate-200/60">
                                      Thắng: {winner}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sportMatches.filter(m => m.stage === 'Chung kết' || m.stage === 'Trận Tranh Hạng 3').map((m) => (
                    <div key={m.id} className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-300 p-4 shadow-sm space-y-2">
                      <div className="text-xs font-black text-amber-800 uppercase text-center">{m.subCategory || m.stage}</div>
                      <div className="flex items-center justify-between font-bold text-sm">
                        <span>{m.teamA}</span>
                        <span className="font-mono text-amber-600 font-black">{m.scoreA ?? '-'} : {m.scoreB ?? '-'}</span>
                        <span>{m.teamB}</span>
                      </div>
                      <div className="text-[11px] text-center text-slate-600 font-semibold">
                        Trạng thái: {m.status === 'Finished' ? '🏆 Đã trao giải' : 'Chưa đấu'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Print Modal */}
      {isPrintModalOpen && (
        <PrintBracketModal
          matches={sportMatches}
          sports={[sport]}
          registrations={sportRegistrations}
          selectedSportId={sport.id}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
