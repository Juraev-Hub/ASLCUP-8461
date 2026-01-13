import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Team, generateId } from '@/lib/tournament-store';
import { Plus, Pencil, Trash2, Upload, Users } from 'lucide-react';

interface TeamManagerProps {
  teams: Team[];
  onAddTeam: (team: Team) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

export function TeamManager({
  teams,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
  onToggleSelection,
}: TeamManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!teamName.trim()) return;

    if (editingTeam) {
      onUpdateTeam({
        ...editingTeam,
        name: teamName,
        logo: teamLogo,
      });
      setEditingTeam(null);
    } else {
      onAddTeam({
        id: generateId(),
        name: teamName,
        logo: teamLogo,
        selected: true,
      });
    }

    setTeamName('');
    setTeamLogo('');
    setIsAddOpen(false);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamLogo(team.logo);
  };

  const closeDialog = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamLogo('');
    setIsAddOpen(false);
  };

  const selectedCount = teams.filter(t => t.selected).length;

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-700/50 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white text-lg">Команды</h2>
          <span className="text-xs text-slate-400 ml-2">
            {selectedCount} выбрано
          </span>
        </div>
        
        <Dialog open={isAddOpen || !!editingTeam} onOpenChange={(open) => {
          if (!open) closeDialog();
          else setIsAddOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Редактировать команду' : 'Добавить команду'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="teamName" className="text-slate-300">Название команды</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Введите название"
                  className="mt-1 bg-slate-800 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Логотип команды</Label>
                <div className="mt-2 flex items-center gap-4">
                  {teamLogo && (
                    <img 
                      src={teamLogo} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Загрузить логотип
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={closeDialog} className="text-slate-400">
                  Отмена
                </Button>
                <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-500">
                  {editingTeam ? 'Сохранить' : 'Добавить'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {teams.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            Нет команд. Добавьте первую команду.
          </p>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
            >
              <Checkbox
                checked={team.selected}
                onCheckedChange={() => onToggleSelection(team.id)}
                className="border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              
              {team.logo ? (
                <img 
                  src={team.logo} 
                  alt={team.name} 
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                  <span className="text-xs text-slate-400">
                    {team.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <span className="flex-1 text-white text-sm truncate">{team.name}</span>
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(team)}
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteTeam(team.id)}
                  className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
