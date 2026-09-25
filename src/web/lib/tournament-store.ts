// Tournament state and bracket generation.
//
// The application currently keeps tournament data in localStorage.
// The data model is independent from the UI so it can later be connected
// to a persistent backend or a broadcast overlay API.

export interface Team {
  id: string;
  name: string;
  logo: string; // data URL / base64
  selected: boolean;
}

export interface MatchTeam {
  id: string;
  name: string;
  logo: string;
  score: number | null;
}

export interface Match {
  id: string;
  roundIndex: number;
  matchIndex: number;
  team1: MatchTeam | null;
  team2: MatchTeam | null;
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

const PRESET_TEAMS: string[] = [
  'Сомониён', 'Ифтихор', 'Қ-ҳарбӣ', 'Ҷигда-2', 'Равот', 'Косагул', 'Пунғаз',
  'Сочи', 'Соҳибҷон', 'Гулистон', 'Турсунзода', 'Ҷигда', 'Долона', 'Ориён-2',
  'Қалъа', '22-Солагӣ', 'Ошоба', 'Сарвак', 'Бурак', 'Қалам', 'Кули-Хоҷа',
  'Соҳили Сир', 'Боштол', 'Ҷарбулоқ', 'Аппон', 'Пахтакор', 'Меҳробод',
  'Шаҳринав', 'Булоқ', 'МТС', 'Шодоба', 'Дӯстӣ', 'Маҳамат', 'Саро',
  'Лаби дарё', 'Аппон-2', 'Ашт', 'ЯнгиҚишлоқ', 'Қаҳрамон-2', 'Урмонтол',
  'Аппони П', 'Бобохайр', 'Шайдон',
];

const createPresetTeams = (): Team[] =>
  PRESET_TEAMS.map((name) => ({
    id: generateId(),
    name,
    logo: '',
    selected: false,
  }));

const defaultState: TournamentState = {
  teams: [],
  matches: [],
  format: 'seeded',
  isGenerated: false,
};

const toMatchTeam = (team: Team | undefined): MatchTeam | null =>
  team
    ? { id: team.id, name: team.name, logo: team.logo, score: null }
    : null;

export const loadState = (): TournamentState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as TournamentState;

      if (Array.isArray(parsed.teams) && Array.isArray(parsed.matches)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Не удалось загрузить данные турнира:', error);
  }

  return {
    ...defaultState,
    teams: createPresetTeams(),
  };
};

export const saveState = (state: TournamentState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Не удалось сохранить данные турнира:', error);
  }
};

export const generateId = (): string =>
  Math.random().toString(36).slice(2, 9);

export const calculateRounds = (numTeams: number): number =>
  numTeams <= 1 ? 0 : Math.ceil(Math.log2(numTeams));

export const nextPowerOf2 = (numTeams: number): number => {
  if (numTeams <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(numTeams));
};

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

/**
 * Generate a balanced single-elimination bracket.
 *
 * The requested participant count is placed into the first-round slots.
 * Empty slots are byes. Bye winners are advanced automatically, so the
 * next playable round never requires a fake 0:0 match.
 *
 * The resulting match indexes are stable:
 * round 0 contains bracketSize / 2 matches, then half as many per round.
 * The last left/right matches feed the central final.
 */
export const generateEliminationBracket = (
  teams: Team[],
  format: 'seeded' | 'random',
): Match[] => {
  const selectedTeams = teams.filter((team) => team.selected);
  const numTeams = selectedTeams.length;

  if (numTeams < 2) return [];

  const orderedTeams = format === 'random'
    ? shuffle(selectedTeams)
    : [...selectedTeams];

  const bracketSize = nextPowerOf2(numTeams);
  const rounds = calculateRounds(bracketSize);
  const firstRoundMatches = bracketSize / 2;

  // Distribute teams into a power-of-two slot array.
  // Byes are spread as evenly as possible across first-round matches.
  const slots: Array<Team | null> = Array.from(
    { length: bracketSize },
    () => null,
  );

  const byeCount = bracketSize - numTeams;
  const byeMatchIndexes = new Set<number>();

  for (let i = 0; i < byeCount; i += 1) {
    const matchIndex = Math.floor(
      ((i + 0.5) * firstRoundMatches) / Math.max(byeCount, 1),
    );
    byeMatchIndexes.add(Math.min(firstRoundMatches - 1, matchIndex));
  }

  // If several calculated bye indexes collide, add extra byes from the end.
  for (
    let matchIndex = firstRoundMatches - 1;
    byeMatchIndexes.size < byeCount && matchIndex >= 0;
    matchIndex -= 1
  ) {
    byeMatchIndexes.add(matchIndex);
  }

  let cursor = 0;

  for (let matchIndex = 0; matchIndex < firstRoundMatches; matchIndex += 1) {
    const capacity = byeMatchIndexes.has(matchIndex) ? 1 : 2;

    for (let slotIndex = 0; slotIndex < capacity; slotIndex += 1) {
      slots[matchIndex * 2 + slotIndex] = orderedTeams[cursor] ?? null;
      cursor += 1;
    }
  }

  // Safety net: ensure every selected team is represented exactly once.
  for (; cursor < orderedTeams.length; cursor += 1) {
    const emptySlot = slots.findIndex((slot) => slot === null);

    if (emptySlot === -1) break;
    slots[emptySlot] = orderedTeams[cursor] ?? null;
  }

  const matches: Match[] = [];

  // Create all non-final rounds first.
  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const matchesInRound = bracketSize / 2 ** (roundIndex + 1);

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex += 1) {
      const firstRoundSideBoundary = firstRoundMatches / 2;

      matches.push({
        id: generateId(),
        roundIndex,
        matchIndex,
        team1: null,
        team2: null,
        winnerId: null,
        side:
          matchIndex < firstRoundSideBoundary
            ? 'left'
            : 'right',
      });
    }
  }

  // Populate first round and mark one-team matches as bye winners.
  for (let matchIndex = 0; matchIndex < firstRoundMatches; matchIndex += 1) {
    const match = matches.find(
      (item) => item.roundIndex === 0 && item.matchIndex === matchIndex,
    );

    if (!match) continue;

    match.team1 = toMatchTeam(slots[matchIndex * 2]);
    match.team2 = toMatchTeam(slots[matchIndex * 2 + 1]);

    if (match.team1 && !match.team2) {
      match.winnerId = match.team1.id;
    }

    if (match.team2 && !match.team1) {
      match.winnerId = match.team2.id;
    }
  }

  // Push bye winners through the tree. A playable match remains unassigned
  // until its feeder matches have actual winners.
  for (let roundIndex = 1; roundIndex < rounds; roundIndex += 1) {
    const previousRound = matches.filter(
      (match) => match.roundIndex === roundIndex - 1,
    );
    const currentRound = matches.filter(
      (match) => match.roundIndex === roundIndex,
    );

    previousRound.forEach((previousMatch) => {
      if (!previousMatch.winnerId) return;

      const winner =
        previousMatch.winnerId === previousMatch.team1?.id
          ? previousMatch.team1
          : previousMatch.team2;

      if (!winner) return;

      const nextMatch = currentRound.find(
        (match) =>
          match.matchIndex === Math.floor(previousMatch.matchIndex / 2),
      );

      if (!nextMatch) return;

      const winnerData = { ...winner, score: null };

      if (previousMatch.matchIndex % 2 === 0) {
        nextMatch.team1 = winnerData;
      } else {
        nextMatch.team2 = winnerData;
      }

      if (nextMatch.team1 && !nextMatch.team2) {
        nextMatch.winnerId = nextMatch.team1.id;
      } else if (nextMatch.team2 && !nextMatch.team1) {
        nextMatch.winnerId = nextMatch.team2.id;
      }
    });
  }

  const finalMatch: Match = {
    id: generateId(),
    roundIndex: rounds,
    matchIndex: 0,
    team1: null,
    team2: null,
    winnerId: null,
    side: 'final',
  };

  const semifinalMatches = matches.filter(
    (match) => match.roundIndex === rounds - 1,
  );

  semifinalMatches.forEach((match) => {
    if (!match.winnerId) return;

    const winner =
      match.winnerId === match.team1?.id ? match.team1 : match.team2;

    if (!winner) return;

    if (match.side === 'left') {
      finalMatch.team1 = { ...winner, score: null };
    } else if (match.side === 'right') {
      finalMatch.team2 = { ...winner, score: null };
    }
  });

  matches.push(finalMatch);

  return matches;
};

/**
 * Creates the first Swiss round. A full Swiss tournament needs a standings
 * calculation and pair-history rules; those are deliberately not faked here.
 * For an odd number of teams, the last team receives a bye represented by a
 * one-team match.
 */
export const generateSwissPairings = (teams: Team[]): Match[] => {
  const selectedTeams = teams.filter((team) => team.selected);
  const matches: Match[] = [];

  for (let i = 0; i < selectedTeams.length; i += 2) {
    const team1 = toMatchTeam(selectedTeams[i]);
    const team2 = toMatchTeam(selectedTeams[i + 1]);

    matches.push({
      id: generateId(),
      roundIndex: 0,
      matchIndex: Math.floor(i / 2),
      team1,
      team2,
      winnerId:
        team1 && !team2
          ? team1.id
          : null,
      side: 'left',
    });
  }

  return matches;
};

export const generateRoundRobin = (teams: Team[]): Match[] => {
  const selectedTeams = teams.filter((team) => team.selected);
  const matches: Match[] = [];

  for (let i = 0; i < selectedTeams.length; i += 1) {
    for (let j = i + 1; j < selectedTeams.length; j += 1) {
      matches.push({
        id: generateId(),
        roundIndex: 0,
        matchIndex: matches.length,
        team1: toMatchTeam(selectedTeams[i]),
        team2: toMatchTeam(selectedTeams[j]),
        winnerId: null,
        side: 'left',
      });
    }
  }

  return matches;
};

export const generateBracket = (
  teams: Team[],
  format: TournamentFormat,
): Match[] => {
  switch (format) {
    case 'swiss':
      return generateSwissPairings(teams);
    case 'roundRobin':
      return generateRoundRobin(teams);
    case 'seeded':
    case 'random':
      return generateEliminationBracket(teams, format);
  }
};
