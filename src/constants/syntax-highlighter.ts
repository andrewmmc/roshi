import type React from 'react';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export const highlighterStyle: React.CSSProperties = {
  margin: 0,
  padding: '1rem',
  fontSize: '0.75rem',
  lineHeight: '1.625',
  background: 'transparent',
  borderRadius: 0,
};

// Clone oneLight with transparent backgrounds so the parent container controls it
export const highlighterTheme: typeof oneLight = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: 'transparent',
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: 'transparent',
  },
};
