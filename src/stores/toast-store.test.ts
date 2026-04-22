import { useToastStore, toast } from './toast-store';

describe('toast-store', () => {
  const getState = () => useToastStore.getState();

  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  describe('addToast', () => {
    it('adds a toast with default duration', () => {
      getState().addToast('Copied!');
      const toasts = getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Copied!');
      expect(toasts[0].duration).toBe(2000);
      expect(toasts[0].id).toBeTruthy();
    });

    it('adds a toast with custom duration', () => {
      getState().addToast('Saved', 5000);
      expect(getState().toasts[0].duration).toBe(5000);
    });

    it('adds multiple toasts', () => {
      getState().addToast('First');
      getState().addToast('Second');
      expect(getState().toasts).toHaveLength(2);
      expect(getState().toasts[0].message).toBe('First');
      expect(getState().toasts[1].message).toBe('Second');
    });

    it('assigns unique ids', () => {
      getState().addToast('A');
      getState().addToast('B');
      const [a, b] = getState().toasts;
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('removeToast', () => {
    it('removes a toast by id', () => {
      getState().addToast('First');
      getState().addToast('Second');
      const id = getState().toasts[0].id;
      getState().removeToast(id);
      expect(getState().toasts).toHaveLength(1);
      expect(getState().toasts[0].message).toBe('Second');
    });

    it('does nothing for unknown id', () => {
      getState().addToast('First');
      getState().removeToast('unknown');
      expect(getState().toasts).toHaveLength(1);
    });
  });

  describe('toast helper', () => {
    it('adds a toast via the standalone function', () => {
      toast('Hello');
      expect(getState().toasts).toHaveLength(1);
      expect(getState().toasts[0].message).toBe('Hello');
    });

    it('accepts a custom duration', () => {
      toast('Hello', 3000);
      expect(getState().toasts[0].duration).toBe(3000);
    });
  });
});
