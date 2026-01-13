import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TournamentFormat } from '@/lib/tournament-store';
import { Trophy, Shuffle, Grid3X3, RotateCcw } from 'lucide-react';

interface FormatSelectorProps {
  format: TournamentFormat;
  onFormatChange: (format: TournamentFormat) => void;
}

const formats = [
  {
    value: 'seeded' as const,
    label: 'Турнир на выбывание (Посев)',
    description: 'Высший посев играет позже, баи только в первом раунде',
    icon: Trophy,
  },
  {
    value: 'random' as const,
    label: 'Турнир на выбывание (Случайный)',
    description: 'Случайное распределение участников',
    icon: Shuffle,
  },
  {
    value: 'swiss' as const,
    label: 'Швейцарская система',
    description: 'Участники с похожими результатами играют друг с другом',
    icon: Grid3X3,
  },
  {
    value: 'roundRobin' as const,
    label: 'Круговой турнир',
    description: 'Каждый играет с каждым',
    icon: RotateCcw,
  },
];

export function FormatSelector({ format, onFormatChange }: FormatSelectorProps) {
  const selectedFormat = formats.find(f => f.value === format);

  return (
    <Card className="p-4 bg-slate-900/80 border-slate-700/50 backdrop-blur">
      <Label className="text-white font-bold text-sm mb-3 block">Формат турнира</Label>
      
      <Select value={format} onValueChange={(v) => onFormatChange(v as TournamentFormat)}>
        <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-white">
          <SelectValue placeholder="Выберите формат" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700">
          {formats.map((f) => (
            <SelectItem
              key={f.value}
              value={f.value}
              className="text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <f.icon className="w-4 h-4 text-emerald-400" />
                <span>{f.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedFormat && (
        <p className="text-slate-400 text-xs mt-2">{selectedFormat.description}</p>
      )}
    </Card>
  );
}
