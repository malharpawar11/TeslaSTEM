import { ScrollView, Text } from 'react-native';
import { PressableScale } from './PressableScale';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5 py-1"
    >
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <PressableScale
            key={opt}
            onPress={() => onSelect(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter by ${opt}`}
            className={`h-10 justify-center rounded-full border px-4 ${
              active
                ? 'border-python-green bg-python-green'
                : 'border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-white' : 'text-light-muted dark:text-dark-muted'
              }`}
            >
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
