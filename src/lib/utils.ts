import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type MessageRole = 'user' | 'assistant' | 'system';

export function getRoleLabel(role: MessageRole): string {
  switch (role) {
    case 'user':
      return 'you';
    case 'assistant':
      return 'ai';
    case 'system':
      return 'sys';
  }
}

export function getRoleAriaLabel(role: MessageRole): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'assistant':
      return 'Assistant';
    case 'system':
      return 'System';
  }
}
