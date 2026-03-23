import type { Entry } from '@/src/types/entry';
import { formatDateLabel } from '@/src/utils/timeUtils';
import type { TimeSection } from './timelineTypes';

export function generateTimeSections(entries: Entry[]): TimeSection[] {
  const sections: TimeSection[] = [];
  let currentDateLabel = '';
  let currentSection: TimeSection | null = null;

  entries.forEach((entry) => {
    const dateLabel = formatDateLabel(entry.timestamp);

    if (dateLabel !== currentDateLabel) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: dateLabel,
        timestamp: entry.timestamp,
        data: [],
      };
      currentDateLabel = dateLabel;
    }

    currentSection?.data.push(entry);
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
