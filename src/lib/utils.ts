import { clsx, type ClassValue } from 'clsx';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { twMerge } from 'tailwind-merge';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

export function formatDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return timeAgo.format(dateObj, 'twitter');
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
