import type { ComponentType } from 'react';

export let PreloadedEvalView: ComponentType | undefined;
let evalViewPromise: Promise<{ default: ComponentType }> | undefined;

export function loadEvalView() {
  evalViewPromise ??= import('@/components/eval/EvalView').then((module) => {
    PreloadedEvalView = module.EvalView;
    return { default: module.EvalView };
  });

  return evalViewPromise;
}
