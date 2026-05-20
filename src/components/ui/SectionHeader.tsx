import { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'display';
  className?: string;
}

const SIZE: Record<NonNullable<Props['size']>, { title: string; eyebrow: string; description: string }> = {
  sm: { title: 'text-lg font-bold tracking-tight', eyebrow: 'text-2xs uppercase tracking-widest', description: 'text-sm' },
  md: { title: 'text-2xl font-extrabold tracking-tight', eyebrow: 'text-2xs uppercase tracking-widest', description: 'text-sm' },
  lg: { title: 'text-3xl font-extrabold tracking-tight', eyebrow: 'text-xs uppercase tracking-widest', description: 'text-base' },
  display: { title: 'text-4xl font-extrabold tracking-tighter', eyebrow: 'text-xs uppercase tracking-widest', description: 'text-base' },
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  trailing,
  size = 'md',
  className,
}: Props) {
  const s = SIZE[size];
  return (
    <View className={`flex-row items-end justify-between gap-3 ${className ?? ''}`}>
      <View className="flex-1">
        {eyebrow ? (
          <Text className={`mb-1.5 font-bold text-python-green-dark dark:text-python-green-light ${s.eyebrow}`}>
            {eyebrow}
          </Text>
        ) : null}
        <Text className={`text-light-text dark:text-dark-text ${s.title}`}>{title}</Text>
        {description ? (
          <Text className={`mt-1.5 text-light-muted dark:text-dark-muted ${s.description}`}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? <View className="mb-1">{trailing}</View> : null}
    </View>
  );
}
