import { browser } from '$app/environment';
import { inView } from 'motion';

type ScrollRevealOptions = {
	y?: number;
	amount?: number;
	stagger?: number;
	selector?: string;
	onEnter?: () => void | (() => void);
};

export function scrollReveal(
	node: HTMLElement,
	options: ScrollRevealOptions = {}
) {
	if (!browser) return;
	const { y = 20, amount = 0.2, stagger = 0, selector, onEnter } = options;

	if (stagger && selector) {
		node.querySelectorAll<HTMLElement>(selector).forEach((child) => {
			child.style.opacity = '0';
			child.style.transform = `translateY(${y}px)`;
		});
	} else {
		node.style.opacity = '0';
		node.style.transform = `translateY(${y}px)`;
	}

	const cleanup = inView(
		node,
		() => {
			if (stagger && selector) {
				node.querySelectorAll<HTMLElement>(selector).forEach((child, i) => {
					setTimeout(() => {
						child.style.opacity = '1';
						child.style.transform = 'translateY(0)';
					}, i * stagger);
				});
			} else {
				node.style.opacity = '1';
				node.style.transform = 'translateY(0)';
			}
			return onEnter?.();
		},
		{ amount }
	);

	return { destroy: cleanup };
}
