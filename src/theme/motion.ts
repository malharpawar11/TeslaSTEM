import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const duration = {
  instant: 80,
  xs: 140,
  sm: 200,
  md: 320,
  lg: 480,
  xl: 720,
  xxl: 1100,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),
  emphasized: Easing.bezier(0.32, 0.72, 0, 1),
  exit: Easing.bezier(0.4, 0.0, 1, 1),
  enter: Easing.bezier(0.0, 0.0, 0.2, 1),
  smooth: Easing.inOut(Easing.cubic),
} as const;

export const timing = {
  snap: { duration: duration.xs, easing: easing.standard } satisfies WithTimingConfig,
  smooth: { duration: duration.md, easing: easing.emphasized } satisfies WithTimingConfig,
  ambient: { duration: duration.xl, easing: easing.smooth } satisfies WithTimingConfig,
} as const;

export const spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 } satisfies WithSpringConfig,
  pop: { damping: 14, stiffness: 220, mass: 0.7 } satisfies WithSpringConfig,
  gentle: { damping: 22, stiffness: 140, mass: 1 } satisfies WithSpringConfig,
} as const;
