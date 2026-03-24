# Syntax Highlighting in Code Tab

## What was changed

Added syntax highlighting to the **Code** tab (`CodeView.tsx`), which displays generated Python and Node.js API code snippets.

## Library

`react-syntax-highlighter` (Prism light build) — tree-shakable, registers only used languages.

- Theme: `oneLight` (white background, light syntax colors)
- Languages registered: `python`, `javascript`

## Implementation

**`src/components/response/CodeView.tsx`**

Replaced plain `<pre>` tags with `SyntaxHighlighter`:

```tsx
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
```

The `language` prop is sourced from `gen.language` on each `CodeGenerator`, so it's always correct. The `customStyle` forces `background: '#ffffff'` to ensure a white background regardless of the app theme.

## Why this approach

- The `CodeGenerator` interface already has a `language` field — no guessing needed.
- Prism light build avoids pulling in all languages.
- `oneLight` theme matches a clean, professional editor aesthetic with a white background.
