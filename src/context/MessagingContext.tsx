import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import * as Crypto from "expo-crypto";
import { useAuth } from "./AuthContext";
import {
  createVault,
  unlockVault,
  type MessageVault,
} from "@/lib/messageCrypto";
import {
  fetchMessageVault,
  registerMessageVault,
} from "@/data/messageKeysRepo";

export const secureRandom = (size: number) =>
  Crypto.getRandomValues(new Uint8Array(size));
interface MessagingState {
  secretKey: Uint8Array | null;
  vault: MessageVault | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
}
const Context = createContext<MessagingState | null>(null);
export function MessagingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null,
    owner = useRef(uid);
  owner.current = uid;
  const keyRef = useRef<Uint8Array | null>(null);
  const unlockVersion = useRef(0);
  const [keyState, setKeyState] = useState<{
    uid: string;
    secret: Uint8Array;
  } | null>(null);
  const [vaultState, setVaultState] = useState<{
    uid: string;
    vault: MessageVault | null;
  } | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const lock = () => {
    ++unlockVersion.current;
    keyRef.current?.fill(0);
    keyRef.current = null;
    setKeyState(null);
  };
  const reload = async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMessageVault();
      if (owner.current !== uid) return;
      if (!result.ok) throw new Error(result.error);
      setVaultState({ uid, vault: result.value[0] ?? null });
    } catch (e) {
      if (owner.current === uid)
        setError(
          e instanceof Error
            ? e.message
            : "Could not load encrypted messaging.",
        );
    } finally {
      if (owner.current === uid) setLoading(false);
    }
  };
  useEffect(() => {
    lock();
    setVaultState(null);
    if (uid) void reload();
    else setLoading(false);
    return () => {
      keyRef.current?.fill(0);
      keyRef.current = null;
    };
  }, [uid]);
  const vault = vaultState?.uid === uid ? vaultState.vault : null;
  const unlock = async (passphrase: string) => {
    if (!uid || loading || error || vaultState?.uid !== uid)
      throw new Error("Reload messaging before unlocking.");
    const version = ++unlockVersion.current;
    let secret: Uint8Array;
    if (vault) secret = await unlockVault(passphrase, vault);
    else {
      const created = await createVault(passphrase, secureRandom);
      if (owner.current !== uid || version !== unlockVersion.current) {
        created.secretKey.fill(0);
        return;
      }
      const result = await registerMessageVault(created.vault, uid);
      if (!result.ok) {
        created.secretKey.fill(0);
        await reload();
        throw new Error(result.error);
      }
      secret = created.secretKey;
      if (owner.current === uid) setVaultState({ uid, vault: created.vault });
    }
    if (owner.current !== uid || version !== unlockVersion.current) {
      secret.fill(0);
      return;
    }
    keyRef.current?.fill(0);
    keyRef.current = secret;
    setKeyState({ uid, secret });
  };
  return (
    <Context.Provider
      value={{
        secretKey: keyState?.uid === uid ? keyState.secret : null,
        vault,
        loading,
        error,
        reload,
        unlock,
        lock,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMessaging() {
  const value = useContext(Context);
  if (!value) throw new Error("MessagingProvider missing");
  return value;
}
