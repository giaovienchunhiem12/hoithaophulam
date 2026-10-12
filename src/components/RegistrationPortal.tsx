import React from 'react';
import { TournamentManager } from './TournamentManager';
import { SportCategory, Registration, SportId, Match } from '../types/sports';

interface RegistrationPortalProps {
  sports: SportCategory[];
  registrations: Registration[];
  onNewRegistration: (newReg: Registration) => void;
  onBulkRegistration: (newRegs: Registration[]) => void;
  onDeleteRegistration?: (id: string) => void;
  onReset20Registrations?: () => void;
  onCreateTournament?: (generatedMatches: Match[]) => void;
  preselectedSportId?: SportId;
  onNavigateToSchedule?: () => void;
}

export const RegistrationPortal: React.FC<RegistrationPortalProps> = (props) => {
  return <TournamentManager {...props} />;
};

export { TournamentManager };
