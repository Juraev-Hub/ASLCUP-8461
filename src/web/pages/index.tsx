import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TeamManager } from '@/components/team-manager';
import { FormatSelector } from '@/components/format-selector';
import { BracketView } from '@/components/bracket-view';
import {
  Team,
  Match,
  TournamentFormat,
  TournamentState,
  loadState,
  saveState,
  generateBracket,
} from '@/lib/tournament-store';
import { Zap, RotateCcw, Trophy } from 'lucide-react';

function Index() {
  const [state, setState] = useState<TournamentState>(() => loadState());

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleAddTeam = useCallback((team: Team) => {
    setState(prev => ({
      ...prev,
      teams: [...prev.teams, team],
    }));
  }, []);

  const handleUpdateTeam = useCallback((updatedTeam: Team) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t),
    }));
  }, []);

  const handleDeleteTeam = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.filter(t => t.id !== id),
    }));
  }, []);

  const handleToggleSelection = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === id ? { ...t, selected: !t.selected } : t),
    }));
  }, []);

  const handleFormatChange = useCallback((format: TournamentFormat) => {
    setState(prev => ({ ...prev, format }));
  }, []);

  const handleGenerateBracket = useCallback(() => {
    const matches = generateBracket(state.teams, state.format);
    setState(prev => ({
      ...prev,
      matches,
      isGenerated: true,
    }));
  }, [state.teams, state.format]);

  const handleResetBracket = useCallback(() => {
    setState(prev => ({
      ...prev,
      matches: [],
      isGenerated: false,
    }));
  }, []);

  const handleUpdateMatch = useCallback((matchId: string, team: 'team1' | 'team2', score: number) => {
    setState(prev => {
      const updatedMatches = prev.matches.map(match => {
        if (match.id !== matchId) return match;

        const updatedMatch = { ...match };
        
        if (team === 'team1' && updatedMatch.team1) {
          updatedMatch.team1 = { ...updatedMatch.team1, score };
        } else if (team === 'team2' && updatedMatch.team2) {
          updatedMatch.team2 = { ...updatedMatch.team2, score };
        }

        // Determine winner
        const score1 = updatedMatch.team1?.score;
        const score2 = updatedMatch.team2?.score;
        
        if (score1 !== null && score2 !== null && score1 !== undefined && score2 !== undefined) {
          if (score1 > score2 && updatedMatch.team1) {
            updatedMatch.winnerId = updatedMatch.team1.id;
          } else if (score2 > score1 && updatedMatch.team2) {
            updatedMatch.winnerId = updatedMatch.team2.id;
          } else {
            updatedMatch.winnerId = null;
          }
        }

        return updatedMatch;
      });

      // Propagate winners to next round for elimination brackets
      if (prev.format === 'seeded' || prev.format === 'random') {
        const matchWithWinner = updatedMatches.find(m => m.id === matchId);
        if (matchWithWinner?.winnerId) {
          const winner = matchWithWinner.winnerId === matchWithWinner.team1?.id 
            ? matchWithWinner.team1 
            : matchWithWinner.team2;

          if (winner) {
            const nextRound = matchWithWinner.roundIndex + 1;
            const nextMatchIndex = Math.floor(matchWithWinner.matchIndex / 2);
            const isTopTeam = matchWithWinner.matchIndex % 2 === 0;

            // Find next match
            const nextMatch = updatedMatches.find(m => 
              m.side === matchWithWinner.side &&
              m.roundIndex === nextRound &&
              m.matchIndex === nextMatchIndex
            );

            if (nextMatch) {
              const idx = updatedMatches.indexOf(nextMatch);
              const winnerData = {
                id: winner.id,
                name: winner.name,
                logo: winner.logo,
                score: null,
              };
              
              if (isTopTeam) {
                updatedMatches[idx] = { ...nextMatch, team1: winnerData };
              } else {
                updatedMatches[idx] = { ...nextMatch, team2: winnerData };
              }
            }

            // For semifinal winners, update final
            const maxRound = Math.max(...updatedMatches.filter(m => m.side !== 'final').map(m => m.roundIndex));
            if (matchWithWinner.roundIndex === maxRound) {
              const finalMatch = updatedMatches.find(m => m.side === 'final');
              if (finalMatch) {
                const idx = updatedMatches.indexOf(finalMatch);
                const winnerData = {
                  id: winner.id,
                  name: winner.name,
                  logo: winner.logo,
                  score: null,
                };
                
                if (matchWithWinner.side === 'left') {
                  updatedMatches[idx] = { ...finalMatch, team1: winnerData };
                } else {
                  updatedMatches[idx] = { ...finalMatch, team2: winnerData };
                }
              }
            }
          }
        }
      }

      return { ...prev, matches: updatedMatches };
    });
  }, []);

  const selectedCount = state.teams.filter(t => t.selected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur">
        <div className="max-w-[1800px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Турнирная Сетка
              </h1>
              <p className="text-xs text-slate-500">Генератор турнирных сеток</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {state.isGenerated && (
              <Button
                onClick={handleResetBracket}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
            )}
            <Button
              onClick={handleGenerateBracket}
              disabled={selectedCount < 2}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Сгенерировать сетку
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex h-[calc(100vh-73px)]">
        {/* Left sidebar - Team management */}
        <aside className="w-80 border-r border-slate-800/50 p-4 flex flex-col gap-4 bg-slate-900/30 backdrop-blur">
          <TeamManager
            teams={state.teams}
            onAddTeam={handleAddTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            onToggleSelection={handleToggleSelection}
          />
          
          <FormatSelector
            format={state.format}
            onFormatChange={handleFormatChange}
          />
          
          {selectedCount < 2 && (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
              <p className="text-amber-400 text-xs">
                ⚠️ Выберите минимум 2 команды для генерации сетки
              </p>
            </div>
          )}
        </aside>

        {/* Bracket area */}
        <main className="flex-1 flex overflow-hidden">
          <BracketView
            matches={state.matches}
            format={state.format}
            onUpdateMatch={handleUpdateMatch}
          />
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>
    </div>
  );
}

export default Index;
