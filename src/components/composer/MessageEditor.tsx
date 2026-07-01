import { useRef, useEffect } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { MessageEditorView } from '@/components/composer/message-editor-view';
import type { NormalizedMessage } from '@/types/normalized';

export function MessageEditor() {
  const messages = useComposerStore((s) => s.messages);
  const updateMessage = useComposerStore((s) => s.updateMessage);
  const removeMessage = useComposerStore((s) => s.removeMessage);
  const addMessage = useComposerStore((s) => s.addMessage);
  const addAttachment = useComposerStore((s) => s.addAttachment);
  const removeAttachment = useComposerStore((s) => s.removeAttachment);
  const scrollGeneration = useComposerStore((s) => s.scrollGeneration);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const addMessageBtnRef = useRef<HTMLButtonElement>(null);

  const handleUpdateMessage = (
    index: number,
    patch: Partial<NormalizedMessage>,
  ) => {
    updateMessage(index, { ...messages[index], ...patch });
  };

  const handleAddMessage = () => {
    const lastRole = messages[messages.length - 1]?.role;
    const nextRole: NormalizedMessage['role'] =
      lastRole === 'user' ? 'assistant' : 'user';
    addMessage({ role: nextRole, content: '' });
  };

  // Auto-focus and scroll to the last user message when an assistant message is appended
  useEffect(() => {
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];
    const prevMsg = messages[lastIndex - 1];
    if (
      lastMsg?.role === 'user' &&
      lastMsg.content === '' &&
      prevMsg?.role === 'assistant' &&
      prevMsg.content !== ''
    ) {
      const textarea = textareaRefs.current.get(lastIndex);
      if (textarea) {
        textarea.focus();
      }
      addMessageBtnRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [messages]);

  // Scroll to bottom of message list when history entry is loaded
  useEffect(() => {
    if (scrollGeneration === 0) return;
    addMessageBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [scrollGeneration]);

  return (
    <MessageEditorView
      messages={messages}
      onUpdateMessage={handleUpdateMessage}
      onRemoveMessage={removeMessage}
      onAddMessage={handleAddMessage}
      onAddAttachment={addAttachment}
      onRemoveAttachment={removeAttachment}
      registerTextarea={(index, el) => {
        if (el) textareaRefs.current.set(index, el);
        else textareaRefs.current.delete(index);
      }}
      addMessageButtonRef={addMessageBtnRef}
    />
  );
}
