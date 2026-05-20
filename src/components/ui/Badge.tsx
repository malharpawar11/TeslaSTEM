import { View, Text } from 'react-native';

interface Props {
  count: number;
  tone?: 'brand' | 'info' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-python-green',
  info: 'bg-python-blue',
  danger: 'bg-danger',
  neutral: 'bg-light-secondary dark:bg-dark-secondary',
};

export function Badge({ count, tone = 'brand', size = 'sm' }: Props) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  const sizeCls = size === 'sm' ? 'h-5 min-w-5 px-1.5' : 'h-6 min-w-6 px-2';
  const textCls = size === 'sm' ? 'text-2xs' : 'text-xs';

  return (
    <View className={`${sizeCls} items-center justify-center rounded-full ${TONE[tone]}`}>
      <Text className={`${textCls} font-extrabold text-white`}>{display}</Text>
    </View>
  );
}
