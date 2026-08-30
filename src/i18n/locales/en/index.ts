import { about } from './about';
import { collections } from './collections';
import { common } from './common';
import { environments } from './environments';
import { history } from './history';
import { models } from './models';
import { navigation } from './navigation';
import { providers } from './providers';
import { request } from './request';
import { response } from './response';
import { settings } from './settings';

export const en = {
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
  about,
} as const;
