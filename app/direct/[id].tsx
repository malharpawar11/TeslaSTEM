import { useLocalSearchParams } from "expo-router";
import { DirectMessaging } from "@/components/DirectMessaging";
export default function DirectConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <DirectMessaging key={String(id)} peer={Array.isArray(id) ? id[0] : id} />
  );
}
