import { useEffect, useRef } from "react";

export function useRelationGraphScene({
  setup,
  novelId,
  characters,
  relationships,
  layout,
  color,
  accent,
  resetKey,
  readOnly,
}) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(
    () => setupRef.current(),
    [novelId, characters, relationships, layout, color, accent, resetKey, readOnly],
  );
}
