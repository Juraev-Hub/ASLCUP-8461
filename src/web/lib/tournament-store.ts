// Tournament Store - State management with localStorage persistence

export interface Team {
  id: string;
  name: string;
  logo: string; // base64
  selected: boolean;
}

export interface Match {
  id: string;
  roundIndex: number;
  matchIndex: number;
  team1: { id: string; name: string; logo: string; score: number | null } | null;
  team2: { id: string; name: string; logo: string; score: number | null } | null;
  winnerId: string | null;
  side: 'left' | 'right' | 'final';
}

export type TournamentFormat = 'seeded' | 'random' | 'swiss' | 'roundRobin';

export interface TournamentState {
  teams: Team[];
  matches: Match[];
  format: TournamentFormat;
  isGenerated: boolean;
}

const STORAGE_KEY = 'tournament-bracket-data';

const defaultState: TournamentState = {
  teams: [],
  matches: [],
  format: 'seeded',
  isGenerated: false,
};

export const loadState = (): TournamentState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return defaultState;
};

export const saveState = (state: TournamentState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Calculate rounds needed for n teams (elimination bracket)
export const calculateRounds = (numTeams: number): number => {
  if (numTeams <= 1) return 0;
  return Math.ceil(Math.log2(numTeams));
};

// Get next power of 2 >= n
export const nextPowerOf2 = (n: number): number => {
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

// Generate single elimination bracket
export const generateEliminationBracket = (
  teams: Team[],
  format: TournamentFormat
): Match[] => {
  const selectedTeams = teams.filter(t => t.selected);
  const numTeams = selectedTeams.length;
  
  if (numTeams < 2) return [];
  
  // Shuffle or seed teams
  const orderedTeams = format === 'random' 
    ? [...selectedTeams].sort(() => Math.random() - 0.5)
    : [...selectedTeams]; // Keep original order for seeded
  
  const bracketSize = nextPowerOf2(numTeams);
  const numRounds = calculateRounds(bracketSize);
  const numByes = bracketSize - numTeams;
  
  const matches: Match[] = [];
  
  // Generate left side (half of bracket)
  const leftMatches = generateHalfBracket(orderedTeams.slice(0, Math.ceil(numTeams / 2)), numRounds, 'left', numByes);
  
  // Generate right side (other half)
  const rightMatches = generateHalfBracket(orderedTeams.slice(Math.ceil(numTeams / 2)), numRounds, 'right', numByes);
  
  // Final match
  const finalMatch: Match = {
    id: generateId(),
    roundIndex: numRounds,
    matchIndex: 0,
    team1: null,
    team2: null,
    winnerId: null,
    side: 'final',
  };
  
  matches.push(...leftMatches, ...rightMatches, finalMatch);
  
  return matches;
};

const generateHalfBracket = (
  teams: Team[],
  totalRounds: number,
  side: 'left' | 'right',
  totalByes: number
): Match[] => {
  const matches: Match[] = [];
  const halfByes = Math.ceil(totalByes / 2);
  const firstRoundMatches = Math.pow(2, totalRounds - 1) / 2;
  
  // First round
  for (let i = 0; i < firstRoundMatches; i++) {
    const teamIndex1 = i * 2;
    const teamIndex2 = i * 2 + 1;
    
    const team1 = teams[teamIndex1] ? {
      id: teams[teamIndex1].id,
      name: teams[teamIndex1].name,
      logo: teams[teamIndex1].logo,
      score: null,
    } : null;
    
    const team2 = teams[teamIndex2] ? {
      id: teams[teamIndex2].id,
      name: teams[teamIndex2].name,
      logo: teams[teamIndex2].logo,
      score: null,
    } : null;
    
    matches.push({
      id: generateId(),
      roundIndex: 0,
      matchIndex: i,
      team1,
      team2,
      winnerId: team1 && !team2 ? team1.id : (team2 && !team1 ? team2.id : null),
      side,
    });
  }
  
  // Subsequent rounds
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - 1 - round);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateId(),
        roundIndex: round,
        matchIndex: i,
        team1: null,
        team2: null,
        winnerId: null,
        side,
      });
    }
  }
  
  return matches;
};

// Generate Swiss system pairings
export const generateSwissPairings = (teams: Team[]): Match[] => {
  const selectedTeams = teams.filter(t => t.selected);
  const matches: Match[] = [];
  
  // Simple first round - pair adjacent teams
  for (let i = 0; i < selectedTeams.length - 1; i += 2) {
    matches.push({
      id: generateId(),
      roundIndex: 0,
      matchIndex: Math.floor(i / 2),
      team1: {
        id: selectedTeams[i].id,
        name: selectedTeams[i].name,
        logo: selectedTeams[i].logo,
        score: null,
      },
      team2: selectedTeams[i + 1] ? {
        id: selectedTeams[i + 1].id,
        name: selectedTeams[i + 1].name,
        logo: selectedTeams[i + 1].logo,
        score: null,
      } : null,
      winnerId: null,
      side: 'left',
    });
  }
  
  return matches;
};

// Generate Round Robin matches
export const generateRoundRobin = (teams: Team[]): Match[] => {
  const selectedTeams = teams.filter(t => t.selected);
  const matches: Match[] = [];
  let matchIndex = 0;
  
  for (let i = 0; i < selectedTeams.length; i++) {
    for (let j = i + 1; j < selectedTeams.length; j++) {
      matches.push({
        id: generateId(),
        roundIndex: 0,
        matchIndex: matchIndex++,
        team1: {
          id: selectedTeams[i].id,
          name: selectedTeams[i].name,
          logo: selectedTeams[i].logo,
          score: null,
        },
        team2: {
          id: selectedTeams[j].id,
          name: selectedTeams[j].name,
          logo: selectedTeams[j].logo,
          score: null,
        },
        winnerId: null,
        side: 'left',
      });
    }
  }
  
  return matches;
};

export const generateBracket = (teams: Team[], format: TournamentFormat): Match[] => {
  switch (format) {
    case 'swiss':
      return generateSwissPairings(teams);
    case 'roundRobin':
      return generateRoundRobin(teams);
    case 'seeded':
    case 'random':
    default:
      return generateEliminationBracket(teams, format);
  }
};
