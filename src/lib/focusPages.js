export function patchFocusPageMap(current, key, pages) {
  const next = { ...(current ?? {}) };
  if (Array.isArray(pages) && pages.length) {
    next[key] = pages;
  } else {
    delete next[key];
  }
  return Object.keys(next).length ? next : undefined;
}
