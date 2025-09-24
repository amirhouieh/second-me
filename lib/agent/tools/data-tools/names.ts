export const DataToolName = {
  GetProjects: 'getProjects',
  GetBio: 'getBio',
  GetGithubActivity: 'getGithubActivity',
  GetResume: 'getResume',
  GetResumeMeta: 'getResumeMeta',
  ParseQuery: 'parseQuery',
  UiComposer: 'uicomposer',
  GetFollowUps: 'getFollowUps',
  Think: 'think',
} as const;

export type DataToolName = typeof DataToolName[keyof typeof DataToolName];


