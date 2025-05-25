// 默认项目任务配置
export const DEFAULT_SETTINGS = {
  textSplitMinLength: 1500,
  textSplitMaxLength: 2000,
  questionGenerationLength: 240,
  questionMaskRemovingProbability: 60,
  huggingfaceToken: '',
  concurrencyLimit: 5,
  visionConcurrencyLimit: 5,
  // MGA GA pair选择策略: 'hash-based', 'round-robin', 'random'
  gaPairSelectionStrategy: 'hash-based'
};
