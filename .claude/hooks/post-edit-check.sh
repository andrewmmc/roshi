#!/bin/bash
# Post-edit hook: run eslint + tsc on changed .ts/.tsx/.js/.jsx files
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
if echo "$f" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  LINT=$(npx eslint "$f" 2>&1)
  TSC=$(npx tsc --noEmit 2>&1)
  if [ -n "$LINT" ] || [ -n "$TSC" ]; then
    printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"LINT ERRORS:\n%s\nTYPE ERRORS:\n%s"}}' "$LINT" "$TSC"
  fi
fi
