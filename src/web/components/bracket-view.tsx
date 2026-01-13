import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Match, TournamentFormat, calculateRounds, nextPowerOf2 } from '@/lib/tournament-store';
import { Trophy, Crown } from 'lucide-react';

interface BracketViewProps {
  matches: Match[];
  format: TournamentFormat;
  onUpdateMatch: (matchId: string, team: 'team1' | 'team2', score: number) => void;
}

interface MatchCardProps {
  match: Match;
  onScoreChange: (team: 'team1' | 'team2', score: number) => void;
  isLarge?: boolean;
}

function MatchCard({ match, onScoreChange, isLarge }: MatchCardProps) {
  const team1Won = match.winnerId === match.team1?.id;
  const team2Won = match.winnerId === match.team2?.id;

  return (
    <div className={`bg-slate-800/90 rounded-lg border border-slate-700/50 overflow-hidden backdrop-blur ${isLarge ? 'min-w-[200px]' : 'min-w-[160px]'}`}>
      {/* Team 1 */}
      <div className={`flex items-center gap-2 p-2 ${team1Won ? 'bg-emerald-900/40' : ''} ${!match.team1 ? 'opacity-50' : ''}`}>
        {match.team1?.logo ? (
          <img src={match.team1.logo} alt="" className="w-6 h-6 rounded object-cover" />
        ) : (
          <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
            <span className="text-[10px] text-slate-500">
              {match.team1?.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <span className={`flex-1 text-xs truncate ${team1Won ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
          {match.team1?.name || 'TBD'}
        </span>
        {match.team1 && match.team2 && (
          <Input
            type="number"
            min={0}
            value={match.team1.score ?? ''}
            onChange={(e) => onScoreChange('team1', parseInt(e.target.value) || 0)}
            className="w-10 h-6 text-center text-xs p-0 bg-slate-900 border-slate-600 text-white"
          />
        )}
        {team1Won && <Trophy className="w-3 h-3 text-amber-400" />}
      </div>
      
      <div className="h-px bg-slate-700/50" />
      
      {/* Team 2 */}
      <div className={`flex items-center gap-2 p-2 ${team2Won ? 'bg-emerald-900/40' : ''} ${!match.team2 ? 'opacity-50' : ''}`}>
        {match.team2?.logo ? (
          <img src={match.team2.logo} alt="" className="w-6 h-6 rounded object-cover" />
        ) : (
          <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
            <span className="text-[10px] text-slate-500">
              {match.team2?.name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <span className={`flex-1 text-xs truncate ${team2Won ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
          {match.team2?.name || 'TBD'}
        </span>
        {match.team1 && match.team2 && (
          <Input
            type="number"
            min={0}
            value={match.team2.score ?? ''}
            onChange={(e) => onScoreChange('team2', parseInt(e.target.value) || 0)}
            className="w-10 h-6 text-center text-xs p-0 bg-slate-900 border-slate-600 text-white"
          />
        )}
        {team2Won && <Trophy className="w-3 h-3 text-amber-400" />}
      </div>
    </div>
  );
}

export function BracketView({ matches, format, onUpdateMatch }: BracketViewProps) {
  if (matches.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Сетка не сгенерирована</p>
          <p className="text-sm">Выберите команды и нажмите "Сгенерировать сетку"</p>
        </div>
      </div>
    );
  }

  // For round robin, show simple list
  if (format === 'roundRobin' || format === 'swiss') {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          {format === 'roundRobin' ? 'Круговой турнир' : 'Швейцарская система'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onScoreChange={(team, score) => onUpdateMatch(match.id, team, score)}
              isLarge
            />
          ))}
        </div>
      </div>
    );
  }

  // Elimination bracket - mirror layout
  const leftMatches = matches.filter(m => m.side === 'left');
  const rightMatches = matches.filter(m => m.side === 'right');
  const finalMatch = matches.find(m => m.side === 'final');

  const numRounds = Math.max(
    ...leftMatches.map(m => m.roundIndex),
    ...rightMatches.map(m => m.roundIndex),
    0
  ) + 1;

  const getRoundMatches = (side: 'left' | 'right', roundIndex: number) => {
    const sideMatches = side === 'left' ? leftMatches : rightMatches;
    return sideMatches
      .filter(m => m.roundIndex === roundIndex)
      .sort((a, b) => a.matchIndex - b.matchIndex);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-stretch justify-center gap-2 min-w-max">
        {/* Left side - rounds go from 0 to n */}
        <div className="flex gap-2">
          {Array.from({ length: numRounds }).map((_, roundIdx) => (
            <div key={`left-${roundIdx}`} className="flex flex-col justify-around gap-2">
              <div className="text-center text-xs text-slate-500 mb-2">
                {roundIdx === 0 ? 'Раунд 1' : roundIdx === numRounds - 1 ? 'Полуфинал' : `Раунд ${roundIdx + 1}`}
              </div>
              {getRoundMatches('left', roundIdx).map((match) => (
                <div key={match.id} className="flex items-center">
                  <MatchCard
                    match={match}
                    onScoreChange={(team, score) => onUpdateMatch(match.id, team, score)}
                  />
                  {roundIdx < numRounds - 1 && (
                    <div className="w-4 h-px bg-slate-600" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Final */}
        {finalMatch && (
          <div className="flex flex-col justify-center px-4">
            <div className="text-center mb-2">
              <Crown className="w-6 h-6 text-amber-400 mx-auto" />
              <span className="text-xs text-amber-400 font-bold">ФИНАЛ</span>
            </div>
            <MatchCard
              match={finalMatch}
              onScoreChange={(team, score) => onUpdateMatch(finalMatch.id, team, score)}
              isLarge
            />
            {finalMatch.winnerId && (
              <div className="text-center mt-3 p-3 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-lg border border-amber-500/30">
                <span className="text-amber-400 font-bold text-sm">🏆 ЧЕМПИОН 🏆</span>
                <p className="text-white font-bold mt-1">
                  {finalMatch.winnerId === finalMatch.team1?.id 
                    ? finalMatch.team1.name 
                    : finalMatch.team2?.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Right side - rounds go from n to 0 (mirrored) */}
        <div className="flex gap-2">
          {Array.from({ length: numRounds }).reverse().map((_, i) => {
            const roundIdx = numRounds - 1 - i;
            return (
              <div key={`right-${roundIdx}`} className="flex flex-col justify-around gap-2">
                <div className="text-center text-xs text-slate-500 mb-2">
                  {roundIdx === 0 ? 'Раунд 1' : roundIdx === numRounds - 1 ? 'Полуфинал' : `Раунд ${roundIdx + 1}`}
                </div>
                {getRoundMatches('right', roundIdx).map((match) => (
                  <div key={match.id} className="flex items-center">
                    {roundIdx < numRounds - 1 && (
                      <div className="w-4 h-px bg-slate-600" />
                    )}
                    <MatchCard
                      match={match}
                      onScoreChange={(team, score) => onUpdateMatch(match.id, team, score)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
