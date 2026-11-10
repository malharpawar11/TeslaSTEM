import { ClubMapExplorer } from "@/components/campusmap/ClubMapExplorer";
import { Page } from "@/components/system";

/** Where every club meets, on the school's two floors. */
export default function MapScreen() {
  return (
    <Page>
      <ClubMapExplorer />
    </Page>
  );
}
