import { ScrollView } from 'react-native';
import { Chip } from './ui/Chip';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  counts?: Record<string, number>;
}

export function FilterChips({ options, selected, onSelect, counts }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5 py-1.5"
    >
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={opt === selected}
          onPress={() => onSelect(opt)}
          count={counts?.[opt]}
        />
      ))}
    </ScrollView>
  );
}
