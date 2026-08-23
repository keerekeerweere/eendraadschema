import { useSyncExternalStore } from "react";
import type {
  SituationPlanSnapshot,
  SituationPlanStore,
} from "../application/SituationPlanStore";

export function useSituationPlanSnapshot(store: SituationPlanStore): SituationPlanSnapshot {
  return useSyncExternalStore(
    store.subscribe.bind(store),
    store.getSnapshot.bind(store),
    store.getSnapshot.bind(store),
  );
}
