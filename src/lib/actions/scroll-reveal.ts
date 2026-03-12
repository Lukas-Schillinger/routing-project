import { browser } from '$app/environment';
import { inView } from 'motion';

type ScrollRevealOptions = {
	y?: number;
	amount?: number;
	stagger?: number;
	delay?: number;
	duration?: number;
	selector?: string;
	onEnter?: () => void | (() => void);
};

export function scrollReveal(
	node: HTMLElement,
	options: ScrollRevealOptions = {}
) {
	if (!browser) return;
	const {
		y = 20,
		amount = 0.2,
		stagger = 0,
		delay = 0,
		duration = 700,
		selector,
		onEnter
	} = options;
	const transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;

	if (stagger && selector) {
		node.querySelectorAll<HTMLElement>(selector).forEach((child) => {
			child.style.opacity = '0';
			child.style.transform = `translateY(${y}px)`;
			child.style.transition = transition;
		});
	} else {
		node.style.opacity = '0';
		node.style.transform = `translateY(${y}px)`;
		node.style.transition = transition;
	}

	const timers: ReturnType<typeof setTimeout>[] = [];

	const cleanup = inView(
		node,
		() => {
			if (stagger && selector) {
				node.querySelectorAll<HTMLElement>(selector).forEach((child, i) => {
					timers.push(
						setTimeout(
							() => {
								child.style.opacity = '1';
								child.style.transform = 'translateY(0)';
							},
							delay + i * stagger
						)
					);
				});
			} else if (delay > 0) {
				timers.push(
					setTimeout(() => {
						node.style.opacity = '1';
						node.style.transform = 'translateY(0)';
					}, delay)
				);
			} else {
				node.style.opacity = '1';
				node.style.transform = 'translateY(0)';
			}
			return onEnter?.();
		},
		{ amount }
	);

	return {
		destroy: () => {
			timers.forEach(clearTimeout);
			cleanup();
		}
	};
}
