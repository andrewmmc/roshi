export const settings = {
  title: 'Settings',
  general: 'General',
  proxy: 'Proxy',
  providers: 'Providers',
  models: 'Models',
  environments: 'Environments',
  sections: 'Settings sections',
  configurePreferences: 'Configure app-wide preferences.',
  appearance: 'Appearance',
  darkMode: 'Dark mode',
  darkModeDescription: 'Use a darker color theme throughout Roshi.',
  language: 'Language',
  languageDescription: 'Choose the language used throughout Roshi.',
  resetApplication: 'Reset application',
  resetApplicationDescription:
    'Clear all data and return to the initial state.',
  moreResetOptions: 'More reset options',
  resetEntireApplication: 'Reset entire application',
  resetProvidersOnly: 'Reset providers only',
  resetEntireApplicationQuestion: 'Reset entire application?',
  resetProvidersQuestion: 'Reset providers?',
  resetEntireApplicationWarning:
    'This will permanently delete all providers, history, saved requests, environments, and settings. The app will reload in its initial state.',
  resetProvidersWarning:
    'This will reset all providers to their defaults and remove any custom providers. History and other data will be kept.',
  proxyDescription:
    'Route provider, eval, and model catalog requests through a proxy.',
  httpProxyDescription:
    'Used for HTTP destinations. Credentials may be included in the URL.',
  httpsProxyDescription:
    'Used for HTTPS destinations, including LLM APIs and models.dev.',
  noProxyDescription:
    'Comma-separated hosts, domains, or host:port entries that connect directly.',
  invalidProxyUrl: '{name} must be a valid http:// or https:// URL.',
  proxySaveFailed: 'Could not save proxy settings.',
  saveProxySettings: 'Save proxy settings',
  proxySaved: 'Saved. New requests use these settings immediately.',
} as const;
