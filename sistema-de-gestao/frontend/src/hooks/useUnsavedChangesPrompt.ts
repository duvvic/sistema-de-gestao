import { useState, useCallback } from 'react';

export type UnsavedPromptState = {
  isDirty: boolean;
  showPrompt: boolean;
};

export function useUnsavedChangesPrompt() {
  const [state, setState] = useState<UnsavedPromptState>({ isDirty: false, showPrompt: false });

  const markDirty = useCallback(() => {
    setState((s) => (s.isDirty ? s : { ...s, isDirty: true }));
  }, []);

  const requestBack = useCallback(() => {
    if (state.isDirty) {
      setState((s) => ({ ...s, showPrompt: true }));
      return false; // block navigation
    }
    return true; // allow navigation
  }, [state.isDirty]);

  const discardChanges = useCallback(() => {
    setState({ isDirty: false, showPrompt: false });
  }, []);

  const continueEditing = useCallback(() => {
    setState((s) => ({ ...s, showPrompt: false }));
  }, []);

  return {
    isDirty: state.isDirty,
    showPrompt: state.showPrompt,
    markDirty,
    requestBack,
    discardChanges,
    continueEditing,
  };
}
