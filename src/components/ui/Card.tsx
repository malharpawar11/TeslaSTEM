import { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';
import { PressableScale } from './Pressable';

type Elevation = 'flat' | 'ambient' | 'elevated' | 'floating';

interface BaseProps {
  children: ReactNode;
  className?: string;
  elevation?: Elevation;
}

const ELEV: Record<Elevation, string> = {
  flat: '',
  ambient: 'shadow-ambient',
  elevated: 'shadow-elevated',
  floating: 'shadow-floating',
};

const BASE =
  'rounded-xl border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface';

export function Card({ children, className, elevation = 'flat', ...rest }: BaseProps & ViewProps) {
  return (
    <View {...rest} className={[BASE, ELEV[elevation], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </View>
  );
}

interface PressableCardProps extends BaseProps {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Avoids nested <button> on web when card contains inner pressables. */
  containsInteractive?: boolean;
}

export function PressableCard({
  children,
  className,
  elevation = 'ambient',
  onPress,
  accessibilityLabel,
  containsInteractive,
}: PressableCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      asSurface={containsInteractive}
      accessibilityRole={containsInteractive ? undefined : 'button'}
      accessibilityLabel={accessibilityLabel}
      scaleTo={0.995}
      pressedOpacity={0.94}
      className={[BASE, ELEV[elevation], className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </PressableScale>
  );
}
