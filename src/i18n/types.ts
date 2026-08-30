import type { en } from '@/i18n/locales/en';

export type Namespace = keyof typeof en;
export type NamespaceKey<N extends Namespace> = keyof (typeof en)[N] & string;
export type MessageKey = {
  [N in Namespace]: `${N}.${NamespaceKey<N>}`;
}[Namespace];

export type LocaleCatalog = {
  [N in Namespace]: Record<NamespaceKey<N>, string>;
};
