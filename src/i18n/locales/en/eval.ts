export const evalStrings = {
  // Eval view chrome and tabs
  runners: 'Runners',
  judge: 'Judge',
  results: 'Results',
  compare: 'Compare',
  runEval: 'Run eval',
  stopAll: 'Stop all',
  judging: 'Judging…',
  addRunnerHint: 'Add a runner before starting',
  exportRunJson: 'Export run as JSON',
  exportMetricsCsv: 'Export metrics as CSV',
  emptyResultsTitle: 'Add at least one runner to start evaluating.',
  emptyResultsDescription:
    'Pick a provider + model in the Runners tab, then run the eval to compare results here.',

  // Runner picker
  noProvidersTitle: 'Add a provider API key to create runners.',
  addApiKey: 'Add API key',
  runnersHint:
    'Each runner is a provider + model pair that receives the same prompt.',
  addRunner: 'Add runner',
  noRunnersHint:
    'No runners yet. Add at least one provider + model to compare.',
  removeRunnerLabel: 'Remove {label}',

  // Judge config
  judgeDescription:
    'Judge uses a separate model to automatically score each response against your rubric and pick a winner.',
  enableJudge: 'Enable LLM-as-judge',
  judgeHint: 'Score every candidate after the run.',
  judgeProvider: 'Judge provider',
  judgeModel: 'Judge model',
  rubric: 'Rubric',

  // Result cards
  statusSuccess: 'Success',
  statusStreaming: 'Streaming',
  statusPending: 'Pending',
  statusCancelled: 'Cancelled',
  statusPartial: 'Partial',
  statusError: 'Error',
  judgeWinner: 'Judge winner',
  waitingForResponse: 'Waiting for response…',
  wordCount: '{count} words',
  scoreHelpful: 'Helpful',
  scoreAccurate: 'Accurate',
  scoreClear: 'Clear',
  scoreOverall: 'Overall',

  // Metrics chips
  metricDuration: 'Duration',
  metricTtft: 'TTFT',
  metricThroughput: 'Throughput',
  metricPrompt: 'Prompt',
  metricCompletion: 'Completion',
  metricCost: 'Cost',
  metricChars: 'Chars',
  metricFinish: 'Finish',
  titleDuration: 'Total wall-clock time for the request',
  titleTtft: 'Time to first streamed token',
  titleThroughput: 'Completion tokens per second',
  titlePromptTokens: 'Input tokens',
  titleCompletionTokens: 'Output tokens',
  titleCost: 'Estimated cost using models.dev pricing',
  titleChars: 'Length of the response in characters',
  titleFinish: 'Provider-reported finish reason',

  // Rating control
  starRating: 'Star rating',
  rateOutOfFive: 'Rate {value} out of 5',
  thumbsUp: 'Thumbs up',
  thumbsDown: 'Thumbs down',

  // Compare view
  selectTwoResults: 'Select two results to compare.',
  selectOneMoreResult: 'Select one more result to compare.',
  compareHint:
    'Check "Compare" on two result cards in the Results tab to see a side-by-side diff and metrics.',
  compareHintMore: 'Check "Compare" on another result card in the Results tab.',
  vs: 'vs',
  jaccardSimilarity: 'Jaccard similarity: {value}',
  clear: 'Clear',
  differences: 'Differences',
  sideBySideMetrics: 'Side-by-side metrics',
  metric: 'Metric',
  metricTokensPerSec: 'Tokens/s',
  metricPromptTokens: 'Prompt tok',
  metricCompletionTokens: 'Completion tok',
  metricCostUsd: 'Cost USD',

  // Eval composer
  sharedSystemPrompt: 'Shared system prompt (optional)',
  evalSystemPromptAria: 'Eval system prompt',
  customHeadersLabel: 'Custom',
  addHeader: 'Add header',

  // Eval runs list
  untitledRun: 'Untitled eval run',
  runActions: 'Eval run actions',
  folderActions: 'Folder actions',
  rename: 'Rename',
  moveTo: 'Move to',
  delete: 'Delete',
  runSummarySingular: '{runners} runner · {ok} ok',
  runSummary: '{runners} runners · {ok} ok',
  winnerLine: 'Winner: {label}',
  saveCurrentRun: 'Save current eval run',
  searchCollectionsAria: 'Search collections',
  noSavedRuns: 'No saved runs',
  noSavedRunsDescription:
    'Compare one prompt across multiple models, then save the run here.',
  noResultsDescription: 'Try a different search term.',
  stopActiveEvalToast: 'Stop the active eval before loading a saved run.',
  movedToToast: 'Moved to {name}',
  savedToast: 'Saved eval run',
  folderName: 'Folder name',
  runName: 'Run name',
  create: 'Create',
  renameFolderTitle: 'Rename folder',
  renameRunTitle: 'Rename eval run',
  folderCreatedToast: 'Folder created',
  folderRenamedToast: 'Folder renamed',
  runRenamedToast: 'Eval run renamed',
  folderDeletedToast: 'Folder deleted',
  runDeletedToast: 'Eval run deleted',
  deleteFolderTitle: 'Delete folder?',
  deleteRunTitle: 'Delete eval run?',
  deleteFolderDescription:
    '"{name}" and all of its saved runs will be permanently deleted.',
  deleteRunDescription: '"{name}" will be permanently deleted.',

  // Save eval run dialog
  saveDialogTitle: 'Save eval run',
  saveDialogDescription:
    'The current prompt, runners, and results will be persisted locally.',
  runNamePlaceholder: "Optional name (e.g. 'Pricing wording variants')",
  runNameAria: 'Eval run name',
  folderLabel: 'Folder',
  selectFolderAria: 'Select folder',
} as const;
