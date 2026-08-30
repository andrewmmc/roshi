import type { LocaleCatalog } from '@/i18n/types';
import { about } from './about';
import { collections } from './collections';
import { common } from './common';
import { environments } from './environments';
import { evalStrings } from './eval';
import { history } from './history';
import { models } from './models';
import { navigation } from './navigation';
import { onboarding } from './onboarding';
import { providers } from './providers';
import { request } from './request';
import { response } from './response';
import { settings } from './settings';

export const zhTW = {
  common,
  settings,
  navigation,
  request,
  response,
  history,
  collections,
  providers,
  models,
  environments,
  onboarding,
  about,
  eval: evalStrings,
} satisfies LocaleCatalog;
