export type EntryType = 'text' | 'photo' | 'voice';
export type ActionSheetMode = 'menu' | 'confirm';

export const SHEET_ENTER_DURATION = 240;
export const ENTRY_ACTION_SHEET_EXIT_DURATION = 220;
export const SHEET_RETURN_DURATION = 180;

export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  text: '#A491D3',
  photo: '#77C9D4',
  voice: '#F5A623',
};
