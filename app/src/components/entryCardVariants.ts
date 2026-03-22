import type { Entry } from '@/src/types/entry';

type EntryCardViewVariant = 'default' | 'calendar';

export interface EntryCardVariantConfig {
  shellClassName: string;
  pressedClassName: string;
  accentClassName: string;
  shellBackgroundColor: string;
  pressedBackgroundColor: string;
  calendarBorderColor: string;
}

const DEFAULT_VARIANTS: Record<Entry['type'], EntryCardVariantConfig> = {
  text: {
    shellClassName: 'rounded-card overflow-hidden bg-entry-text',
    pressedClassName: 'bg-entry-text',
    accentClassName: 'text-entry-text',
    shellBackgroundColor: '#E0D9F5',
    pressedBackgroundColor: '#D4CBF2',
    calendarBorderColor: '#DDD0EF',
  },
  photo: {
    shellClassName: 'rounded-card overflow-hidden bg-entry-photo',
    pressedClassName: 'bg-entry-photo',
    accentClassName: 'text-entry-photo',
    shellBackgroundColor: '#CCE9EF',
    pressedBackgroundColor: '#BDDEE5',
    calendarBorderColor: '#D5E8E5',
  },
  voice: {
    shellClassName: 'rounded-card overflow-hidden bg-entry-voice',
    pressedClassName: 'bg-entry-voice',
    accentClassName: 'text-entry-voice',
    shellBackgroundColor: '#FCE8C0',
    pressedBackgroundColor: '#F8DFB0',
    calendarBorderColor: '#EFD8B5',
  },
};

const CALENDAR_SHELL_BACKGROUND_COLOR = '#FFFDF9';
const CALENDAR_PRESSED_BACKGROUND_COLOR = '#FBF6EF';

export function getEntryCardVariant(
  type: Entry['type'],
  variant: EntryCardViewVariant
): EntryCardVariantConfig {
  const baseVariant = DEFAULT_VARIANTS[type] ?? DEFAULT_VARIANTS.text;

  if (variant === 'calendar') {
    return {
      ...baseVariant,
      shellClassName: `${baseVariant.shellClassName} bg-home-surface`,
      pressedClassName: 'bg-home-surface',
      shellBackgroundColor: CALENDAR_SHELL_BACKGROUND_COLOR,
      pressedBackgroundColor: CALENDAR_PRESSED_BACKGROUND_COLOR,
    };
  }

  return baseVariant;
}
