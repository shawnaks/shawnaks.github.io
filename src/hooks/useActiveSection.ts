import { useSyncExternalStore } from 'react';
import { getActiveSection, subscribeActiveSection } from '../lib/scrollSpy';
import type { SectionId } from '../lib/sections';

/** The current section, shared by header, overlay, and home-grid tiles. */
export function useActiveSection(): SectionId {
  return useSyncExternalStore(
    subscribeActiveSection,
    getActiveSection,
    getActiveSection,
  );
}
