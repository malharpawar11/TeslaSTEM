import { Modal, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get the danger treatment on the confirm button. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for anything that cannot be undone from the UI: deleting an
 * announcement, removing a member, cancelling an event. React Native's
 * `Alert` is unavailable on web, so this is a plain modal that behaves the
 * same on every platform.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-[420px] rounded-xl border border-light-border bg-light-surface p-5 shadow-floating dark:border-dark-border dark:bg-dark-surface">
          <View className="flex-row items-center gap-2.5">
            <View
              className={`h-9 w-9 items-center justify-center rounded-lg ${
                destructive
                  ? 'bg-danger/10 dark:bg-danger/20'
                  : 'bg-python-blue/10 dark:bg-python-blue/20'
              }`}
            >
              <Ionicons
                name={destructive ? 'warning-outline' : 'help-circle-outline'}
                size={18}
                color={destructive ? '#B42318' : '#0E5AA8'}
              />
            </View>
            <Text className="flex-1 text-base font-semibold text-light-text dark:text-dark-text">
              {title}
            </Text>
          </View>
          <Text className="mt-3 text-sm leading-5 text-light-muted dark:text-dark-muted">
            {message}
          </Text>
          <View className="mt-5 flex-row gap-2.5">
            <View className="flex-1">
              <Button
                label={cancelLabel}
                variant="secondary"
                size="md"
                fullWidth
                onPress={onCancel}
                disabled={busy}
              />
            </View>
            <View className="flex-1">
              <Button
                label={confirmLabel}
                variant={destructive ? 'destructive' : 'primary'}
                size="md"
                fullWidth
                loading={busy}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
