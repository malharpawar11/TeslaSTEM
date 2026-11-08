import { isWebsite } from "@/theme/layout";
import { ScrollView, View } from 'react-native';
import { Chip } from './ui/Chip';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  counts?: Record<string, number>;
}

export function FilterChips({ options, selected, onSelect, counts }: Props) {
  if (isWebsite) {
    return (
      <View className="flex-row flex-wrap gap-2 px-5 py-1.5">
        {options.map((opt) => <Chip key={opt} label={opt} active={opt === selected} onPress={() => onSelect(opt)} count={counts?.[opt]} />)}
      </View>
    );
  }
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
