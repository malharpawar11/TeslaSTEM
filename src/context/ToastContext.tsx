import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * App-wide toasts for the result of an action ("Announcement posted",
 * "Couldn't upload file"). Errors that need a decision still render inline
 * next to the control — a toast is for confirmation, not for recovery.
 */

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  /** Convenience for `res.ok ? success : error`. */
  toastResult: (
    res: { ok: true } | { ok: false; error: string },
    successMessage: string,
  ) => boolean;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_META: Record<ToastTone, { icon: keyof typeof Ionicons.glyphMap; bg: string }> = {
  success: { icon: 'checkmark-circle', bg: 'bg-python-green' },
  error: { icon: 'alert-circle', bg: 'bg-danger' },
  info: { icon: 'information-circle', bg: 'bg-python-blue' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setCurrent(null), tone === 'error' ? 4200 : 2600);
  }, []);

  const toastResult = useCallback<ToastContextValue['toastResult']>(
    (res, successMessage) => {
      if (res.ok) {
        toast(successMessage, 'success');
        return true;
      }
      toast(res.error, 'error');
      return false;
    },
    [toast],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const meta = current ? TONE_META[current.tone] : null;

  return (
    <ToastContext.Provider value={{ toast, toastResult }}>
      {children}
      {current && meta ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 76 }}
        >
          <Animated.View
            key={current.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(180)}
            className={`flex-row items-center gap-2.5 rounded-lg px-4 py-3 shadow-floating ${meta.bg}`}
          >
            <Ionicons name={meta.icon} size={18} color="#FFFFFF" />
            <Text className="flex-1 text-sm font-semibold text-white" numberOfLines={3}>
              {current.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
