import React from 'react';
import { Trophy, Users, Calendar, Award, Flame, ChevronRight, Activity } from 'lucide-react';
import heroSportsImg from '../assets/images/hero_school_sports_1791335991005.jpg';
import trophyBannerImg from '../assets/images/sports_trophy_banner_1791336009997.jpg';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';
import { Match, Registration, SportCategory } from '../types/sports';

interface HeroBannerProps {
  onRegisterClick: () => void;
  onScheduleClick: () => void;
  liveMatch?: Match;
  registrations: Registration[];
  matches: Match[];
  sports: SportCategory[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onRegisterClick,
  onScheduleClick,
  liveMatch,
  registrations,
  matches,
  sports
}) => {
  const registeredClassesCount = new Set(registrations.map((r) => r.className)).size;
  const totalMatchesCount = matches.length;
  const totalSportsCount = sports.length;
  const totalMedalSetsCount = registrations.length > 0 ? registrations.length * 3 : 0;
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b-4 border-amber-400/90 text-white">
      {/* Background with measured scrim gradient */}
      <div className="absolute inset-0 z-0 opacity-25">
        <img 
          src={heroSportsImg} 
          alt="Hội thao THPT Phú Lâm" 
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-900/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        
        {/* Live Ticker if match is active */}
        {liveMatch && (
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-6 animate-pulse">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="uppercase tracking-wider font-mono">TRỰC TIẾP</span>
            <span className="text-slate-300">·</span>
            <span className="text-white">{liveMatch.sportId.toUpperCase()}: {liveMatch.teamA} vs {liveMatch.teamB} ({liveMatch.scoreA} - {liveMatch.scoreB})</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Hero Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Đại Hội Thể Thao Học Đường Năm Học 2026 - 2027</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-4 ring-amber-400 bg-white p-1 shadow-2xl shrink-0 flex items-center justify-center">
                <img 
                  src={SCHOOL_LOGO_DATA_URI} 
                  alt="Logo Trường THPT Phú Lâm" 
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('school_logo.jpg')) {
                      target.src = '/school_logo.jpg';
                    }
                  }}
                />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans font-bold text-balance">
                Hội Thao Trường <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">THPT Phú Lâm</span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Nơi hội tụ tinh thần đồng đội, khát vọng chiến thắng và sức trẻ Phú Lâm. 
              Tranh tài ở <span className="text-amber-400 font-semibold">9 môn thi đấu chính thức</span>: Bóng đá, Bóng chuyền, Bóng rổ, Pickleball, Cầu lông, Kéo co, Cờ Vua, Cờ Tướng và Cờ Caro.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onRegisterClick}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Quản Lý & Tạo Giải Đấu</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onScheduleClick}
                className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-medium text-sm border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Xem Lịch & Sơ Đồ Thi Đấu</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-blue-800/80">
              <div className="bg-blue-950/70 p-3 rounded-xl border border-blue-800">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold">
                  <Users className="w-3.5 h-3.5 text-blue-300" />
                  <span>Sức chứa tập thể</span>
                </div>
                <div className="text-xl font-bold text-white font-mono mt-1">{registeredClassesCount} Lớp</div>
                <div className="text-[10px] text-blue-300">Đã đăng ký thi đấu</div>
              </div>

              <div className="bg-blue-950/70 p-3 rounded-xl border border-blue-800">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bộ môn tranh tài</span>
                </div>
                <div className="text-xl font-bold text-white font-mono mt-1">0{totalSportsCount} Môn</div>
                <div className="text-[10px] text-blue-300">Đơn, Đôi & Đồng Đội</div>
              </div>

              <div className="bg-blue-950/70 p-3 rounded-xl border border-blue-800">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-purple-300" />
                  <span>Tổng số trận</span>
                </div>
                <div className="text-xl font-bold text-white font-mono mt-1">{totalMatchesCount} Trận</div>
                <div className="text-[10px] text-blue-300">Trực tiếp cập nhật</div>
              </div>

              <div className="bg-blue-950/70 p-3 rounded-xl border border-blue-800">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bộ Huy Chương</span>
                </div>
                <div className="text-xl font-bold text-amber-300 font-mono mt-1">{totalMedalSetsCount} HCV</div>
                <div className="text-[10px] text-blue-300">Vàng, Bạc & Đồng</div>
              </div>
            </div>

          </div>

          {/* Right Banner Card Visual */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/90 bg-blue-950 shadow-2xl group">
              <img 
                src={trophyBannerImg} 
                alt="Giải thưởng Hội thao THPT Phú Lâm" 
                className="w-full h-64 sm:h-72 object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Cúp Toàn Đoàn Phú Lâm 2026</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Đoàn Kết - Trung Thực - Mạng Lại Vinh Quang Cho Lớp
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Điểm số Bảng Tổng Sắp Huy Chương được tự động cập nhật ngay khi trọng tài xác nhận kết quả biên bản trận đấu.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
