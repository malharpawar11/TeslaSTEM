import { View, Text } from 'react-native';

interface Props {
  label?: string;
  className?: string;
  variant?: 'hairline' | 'soft' | 'strong';
  orientation?: 'horizontal' | 'vertical';
}

const COLOR: Record<NonNullable<Props['variant']>, string> = {
  hairline: 'bg-light-hairline dark:bg-dark-border',
  soft: 'bg-light-border dark:bg-dark-border',
  strong: 'bg-light-border-strong dark:bg-dark-border-strong',
};

export function Divider({ label, className, variant = 'hairline', orientation = 'horizontal' }: Props) {
  if (orientation === 'vertical') {
    return <View className={`w-px ${COLOR[variant]} ${className ?? ''}`} />;
  }

  if (label) {
    return (
      <View className={`flex-row items-center gap-3 ${className ?? ''}`}>
        <View className={`h-px flex-1 ${COLOR[variant]}`} />
        <Text className="text-2xs font-bold uppercase tracking-widest text-light-muted dark:text-dark-muted">
          {label}
        </Text>
        <View className={`h-px flex-1 ${COLOR[variant]}`} />
      </View>
    );
  }

  return <View className={`h-px ${COLOR[variant]} ${className ?? ''}`} />;
}
