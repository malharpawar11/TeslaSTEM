import { useLocalSearchParams } from "expo-router";
import { DirectMessaging } from "@/components/DirectMessaging";
export default function ClubMessages() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DirectMessaging clubId={Array.isArray(id) ? id[0] : id} />;
}
