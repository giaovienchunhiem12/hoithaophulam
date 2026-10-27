import React, { useState } from 'react';
import { SportCategory, SportId, Match, Registration, TournamentData } from '../types/sports';
import { ArrowRight, MapPin, Trash2, Plus, Eye, Trophy } from 'lucide-react';
import { getSportIcon } from '../utils/sportIcons';
import { SportDetailCardModal } from './SportDetailCardModal';

interface SportsGridProps {
  sports: SportCategory[];
  matches: Match[];
  registrations: Registration[];
  tournamentData: TournamentData;
  isAdmin: boolean;
  onSelectSportForRegister: (sportId: SportId) => void;
  onSelectSportForSchedule: (sportId: SportId) => void;
  onDeleteSport: (sportId: SportId) => void;
  onUpdateRegistration: (updatedReg: Registration) => void;
  onDeleteRegistration: (id: string) => void;
  onAddNewMatch: (match: Match) => void;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
}

const renderSportIllustrationIcon = (id: SportId) => {
  switch (id) {
    case 'football': return getSportIcon(id, "w-7 h-7 text-emerald-500");
    case 'volleyball': return getSportIcon(id, "w-7 h-7 text-amber-500");
    case 'basketball': return getSportIcon(id, "w-7 h-7 text-orange-500");
    case 'pickleball': return getSportIcon(id, "w-7 h-7 text-lime-500");
    case 'badminton': return getSportIcon(id, "w-7 h-7 text-cyan-500");
    case 'tugofwar': return getSportIcon(id, "w-7 h-7 text-rose-500");
    case 'chess': return getSportIcon(id, "w-7 h-7 text-purple-500");
    case 'xiangqi': return getSportIcon(id, "w-7 h-7 text-yellow-600");
    case 'caro': return getSportIcon(id, "w-7 h-7 text-pink-500");
    default: return getSportIcon(id, "w-7 h-7 text-amber-500");
  }
};

export const SportsGrid: React.FC<SportsGridProps> = ({
  sports,
  matches,
  registrations,
  tournamentData,
  isAdmin,
  onSelectSportForRegister,
  onSelectSportForSchedule,
  onDeleteSport,
  onUpdateRegistration,
  onDeleteRegistration,
  onAddNewMatch,
  onUpdateMatch,
  onDeleteMatch,
}) => {
  const [activeDetailSport, setActiveDetailSport] = useState<SportCategory | null>(null);

  return (
    <section className="py-12 bg-white text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto space-y-8">
        
        {/* Royal Blue Floating Section Title Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-300 mb-1">
              Danh Mục Môn Thi Đấu & Thẻ Thông Tin Giải Đấu
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sans font-bold tracking-tight">
              09 Môn Thể Thao Học Đường THPT Phú Lâm
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1">
              Mỗi bộ môn có thẻ riêng hiển thị đầy đủ: Danh sách đăng ký, Lịch thi đấu, Cây sơ đồ và Kết quả.
            </p>
          </div>
        </div>

        {/* 9 Sports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sports.map((sport) => {
            const hasTournament = matches.some((m) => m.sportId === sport.id);
            const sportRegCount = registrations.filter((r) => r.sportId === sport.id).length;
            const sportMatchCount = matches.filter((m) => m.sportId === sport.id).length;

            return (
              <div
                key={sport.id}
                className={`bg-white rounded-2xl border-2 p-5 flex flex-col justify-between group shadow-md hover:shadow-xl transition-all ${
                  hasTournament 
                    ? 'border-blue-300 hover:border-blue-700' 
                    : 'border-slate-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Header Icon + Name */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl border transition-colors shadow-sm ${hasTournament ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        {renderSportIllustrationIcon(sport.id)}
                      </div>
                      <div>
                        <h3 className={`text-lg font-black transition-colors font-sans font-bold ${hasTournament ? 'text-blue-950 group-hover:text-blue-700' : 'text-slate-700'}`}>
                          {sport.name}
                        </h3>
                        <div className="text-[11px] font-mono text-slate-500 font-semibold">
                          {sport.englishName}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 whitespace-nowrap">
                      {sport.subCategories.length} Hạng Mục
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {sport.description}
                  </p>

                  {/* Badge Stats for each sport card */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs font-bold">
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">Đăng ký:</span>
                      <span className="text-blue-900 font-black">{sportRegCount} đội</span>
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">Trận đấu:</span>
                      <span className="text-amber-700 font-black">{sportMatchCount} trận</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setActiveDetailSport(sport)}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-950 to-indigo-900 hover:from-blue-900 hover:to-indigo-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Xem Thẻ Chi Tiết Môn</span>
                  </button>

                  {hasTournament ? (
                    <>
                      <button
                        onClick={() => onSelectSportForSchedule(sport.id)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl transition-colors shadow-sm"
                        title="Quản lý lịch / Sơ đồ"
                      >
                        <Trophy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteSport(sport.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-colors shadow-sm"
                        title="Xóa giải đấu môn này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onSelectSportForRegister(sport.id)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                      title="Khởi tạo giải đấu"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sport Detail Card Modal */}
      {activeDetailSport && (
        <SportDetailCardModal
          sport={activeDetailSport}
          tournamentData={tournamentData}
          isAdmin={isAdmin}
          onClose={() => setActiveDetailSport(null)}
          onUpdateRegistration={onUpdateRegistration}
          onDeleteRegistration={onDeleteRegistration}
          onAddNewMatch={onAddNewMatch}
          onUpdateMatch={onUpdateMatch}
          onDeleteMatch={onDeleteMatch}
        />
      )}
    </section>
  );
};
