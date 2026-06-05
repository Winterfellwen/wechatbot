import { renderHook, act } from '@testing-library/react';
import { useDialogueStore } from './dialogueStore';

describe('Dialogue Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useDialogueStore());
    act(() => {
      result.current.clearMessages();
    });
  });

  it('should have default state', () => {
    const { result } = renderHook(() => useDialogueStore());

    expect(result.current.mode).toBe('ask');
    expect(result.current.messages).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('should change mode', () => {
    const { result } = renderHook(() => useDialogueStore());

    act(() => {
      result.current.setMode('auto');
    });

    expect(result.current.mode).toBe('auto');
  });

  it('should add message', () => {
    const { result } = renderHook(() => useDialogueStore());

    act(() => {
      result.current.addMessage({
        role: 'user',
        content: 'Hello',
      });
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe('Hello');
  });
});
