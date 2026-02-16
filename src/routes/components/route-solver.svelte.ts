import { browser } from '$app/environment';

type Point = { x: number; y: number };

const NUM_STOPS = 20;
const NUM_DRIVERS = 3;

function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class RouteSolver {
	readonly depot: Point = { x: 220, y: 150 };
	readonly driverColors = ['#0f4f44', '#d4a853', '#8a8578'];
	readonly gridDots: Point[];

	stops = $state<Point[]>([]);
	routes = $state<number[][]>([[], [], []]);
	routeVersions = $state<number[]>([0, 0, 0]);
	phase = $state<'idle' | 'constructing' | 'optimizing' | 'done'>('idle');
	displayDistance = $state(0);
	initialDistance = $state(0);
	iterations = $state(0);
	improvements = $state(0);

	private tweenGen = 0;
	private runId = 0;
	private _isVisible = false;

	improvement = $derived(
		this.initialDistance > 0
			? Math.round(
					((this.initialDistance - this.displayDistance) / this.initialDistance) * 100
				)
			: 0
	);

	stopDriverMap = $derived.by(() => {
		const map = new Array<number>(NUM_STOPS).fill(-1);
		for (let d = 0; d < this.routes.length; d++) {
			for (const idx of this.routes[d]) {
				map[idx] = d;
			}
		}
		return map;
	});

	constructor() {
		this.stops = this.generateStops(mulberry32(42));
		const dots: Point[] = [];
		for (let x = 20; x <= 420; x += 20) {
			for (let y = 20; y <= 280; y += 20) {
				dots.push({ x, y });
			}
		}
		this.gridDots = dots;
	}

	setVisible(visible: boolean) {
		this._isVisible = visible;
		if (visible) {
			this.runSolver();
		}
	}

	buildPath(route: number[]): string {
		if (route.length === 0) return '';
		const points = [this.depot, ...route.map((i) => this.stops[i]), this.depot];
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
	}

	// --- Private helpers ---

	private generateStops(rand: () => number): Point[] {
		const pts: Point[] = [];
		for (let i = 0; i < NUM_STOPS; i++) {
			let x: number, y: number;
			do {
				x = 30 + rand() * 380;
				y = 20 + rand() * 260;
			} while (Math.abs(x - this.depot.x) < 30 && Math.abs(y - this.depot.y) < 30);
			pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
		}
		return pts;
	}

	private dist(a: Point, b: Point): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private routeDistance(route: number[]): number {
		if (route.length === 0) return 0;
		let d = this.dist(this.depot, this.stops[route[0]]);
		for (let i = 1; i < route.length; i++) {
			d += this.dist(this.stops[route[i - 1]], this.stops[route[i]]);
		}
		d += this.dist(this.stops[route[route.length - 1]], this.depot);
		return d;
	}

	private totalDistance(rts: number[][]): number {
		return rts.reduce((sum, r) => sum + this.routeDistance(r), 0);
	}

	private buildInitialSolution(rand: () => number): number[][] {
		const indices = Array.from({ length: NUM_STOPS }, (_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		const groups: number[][] = Array.from({ length: NUM_DRIVERS }, () => []);
		for (let i = 0; i < indices.length; i++) {
			groups[i % NUM_DRIVERS].push(indices[i]);
		}
		return groups;
	}

	private tweenNumber(
		from: number,
		to: number,
		duration: number,
		cb: (v: number) => void
	) {
		if (!browser) return;
		const gen = ++this.tweenGen;
		const start = performance.now();
		const tick = (now: number) => {
			if (gen !== this.tweenGen) return;
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - t, 3);
			cb(Math.round((from + (to - from) * eased) * 10) / 10);
			if (t < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	private delay(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	private segmentCost(route: number[], i: number, j: number): number {
		const prevPoint = i === 0 ? this.depot : this.stops[route[i - 1]];
		const nextPoint =
			j === route.length - 1 ? this.depot : this.stops[route[j + 1]];
		let cost =
			this.dist(prevPoint, this.stops[route[i]]) +
			this.dist(this.stops[route[j]], nextPoint);
		for (let k = i; k < j; k++) {
			cost += this.dist(this.stops[route[k]], this.stops[route[k + 1]]);
		}
		return cost;
	}

	private async twoOptPass(
		driverIdx: number,
		currentRun: number
	): Promise<boolean> {
		let route = this.routes[driverIdx];
		if (route.length < 3) return false;
		let foundAny = false;

		for (let i = 0; i < route.length - 1; i++) {
			for (let j = i + 2; j < route.length; j++) {
				if (!this._isVisible || this.runId !== currentRun) return false;
				this.iterations++;

				const before = this.segmentCost(route, i, j);
				const reversed = [...route];
				let left = i + 1;
				let right = j;
				while (left < right) {
					[reversed[left], reversed[right]] = [reversed[right], reversed[left]];
					left++;
					right--;
				}
				const after = this.segmentCost(reversed, i, j);

				if (after < before - 0.01) {
					route = reversed;
					this.routes[driverIdx] = reversed;
					this.improvements++;
					foundAny = true;
					this.routeVersions[driverIdx]++;

					const newTotal = this.totalDistance(this.routes);
					this.tweenNumber(this.displayDistance, newTotal, 400, (v) => {
						this.displayDistance = v;
					});
					await this.delay(350);
					if (!this._isVisible || this.runId !== currentRun) return false;
				}
			}
			await this.delay(20);
			if (!this._isVisible || this.runId !== currentRun) return false;
		}
		return foundAny;
	}

	private removalSaving(route: number[], idx: number): number {
		const prev = idx === 0 ? this.depot : this.stops[route[idx - 1]];
		const curr = this.stops[route[idx]];
		const next =
			idx === route.length - 1 ? this.depot : this.stops[route[idx + 1]];
		return (
			this.dist(prev, curr) + this.dist(curr, next) - this.dist(prev, next)
		);
	}

	private insertionCost(
		route: number[],
		pos: number,
		stopIdx: number
	): number {
		const prev = pos === 0 ? this.depot : this.stops[route[pos - 1]];
		const next = pos === route.length ? this.depot : this.stops[route[pos]];
		const point = this.stops[stopIdx];
		return (
			this.dist(prev, point) + this.dist(point, next) - this.dist(prev, next)
		);
	}

	private async relocatePass(currentRun: number): Promise<boolean> {
		let foundAny = false;

		for (let srcDriver = 0; srcDriver < NUM_DRIVERS; srcDriver++) {
			for (let si = 0; si < this.routes[srcDriver].length; si++) {
				if (!this._isVisible || this.runId !== currentRun) return false;

				const stopIdx = this.routes[srcDriver][si];
				const removeCost = this.removalSaving(this.routes[srcDriver], si);

				let bestDriver = -1;
				let bestPos = -1;
				let bestInsertCost = Infinity;

				for (let dstDriver = 0; dstDriver < NUM_DRIVERS; dstDriver++) {
					if (dstDriver === srcDriver) continue;
					for (let di = 0; di <= this.routes[dstDriver].length; di++) {
						this.iterations++;
						const cost = this.insertionCost(
							this.routes[dstDriver],
							di,
							stopIdx
						);
						if (cost < bestInsertCost) {
							bestInsertCost = cost;
							bestDriver = dstDriver;
							bestPos = di;
						}
					}
				}

				if (bestDriver >= 0 && bestInsertCost - removeCost < -1) {
					const newSrc = [...this.routes[srcDriver]];
					newSrc.splice(si, 1);
					const newDst = [...this.routes[bestDriver]];
					newDst.splice(bestPos, 0, stopIdx);

					this.routes[srcDriver] = newSrc;
					this.routes[bestDriver] = newDst;
					this.improvements++;
					foundAny = true;
					this.routeVersions[srcDriver]++;
					this.routeVersions[bestDriver]++;
					si--;

					const newTotal = this.totalDistance(this.routes);
					this.tweenNumber(this.displayDistance, newTotal, 400, (v) => {
						this.displayDistance = v;
					});
					await this.delay(400);
					if (!this._isVisible || this.runId !== currentRun) return false;
				}
			}
			await this.delay(20);
			if (!this._isVisible || this.runId !== currentRun) return false;
		}
		return foundAny;
	}

	private async runSolver() {
		if (!this._isVisible) return;

		const currentRun = ++this.runId;
		this.iterations = 0;
		this.improvements = 0;
		this.tweenGen++;
		this.phase = 'constructing';

		const solverRng = mulberry32(42 + currentRun);
		this.stops = this.generateStops(solverRng);
		const initial = this.buildInitialSolution(solverRng);
		this.routes = initial.map((r) => [...r]);
		this.routeVersions = [0, 0, 0];

		const startDist = this.totalDistance(this.routes);
		this.initialDistance = startDist;
		this.displayDistance = startDist;

		await this.delay(800);
		if (!this._isVisible || this.runId !== currentRun) return;

		this.phase = 'optimizing';
		const deadline = performance.now() + 12_000;
		const expired = () => performance.now() > deadline;

		let improved = true;
		while (
			improved &&
			this._isVisible &&
			this.runId === currentRun &&
			!expired()
		) {
			improved = false;
			for (let d = 0; d < NUM_DRIVERS; d++) {
				if (!this._isVisible || this.runId !== currentRun || expired()) break;
				const got = await this.twoOptPass(d, currentRun);
				if (got) improved = true;
			}
		}

		if (!this._isVisible || this.runId !== currentRun) return;

		if (!expired()) {
			let relocateImproved = true;
			while (
				relocateImproved &&
				this._isVisible &&
				this.runId === currentRun &&
				!expired()
			) {
				relocateImproved = await this.relocatePass(currentRun);
				if (
					relocateImproved &&
					this._isVisible &&
					this.runId === currentRun &&
					!expired()
				) {
					for (let d = 0; d < NUM_DRIVERS; d++) {
						if (!this._isVisible || this.runId !== currentRun || expired())
							break;
						await this.twoOptPass(d, currentRun);
					}
				}
			}
		}

		if (!this._isVisible || this.runId !== currentRun) return;

		const finalDist = this.totalDistance(this.routes);
		this.tweenNumber(this.displayDistance, finalDist, 300, (v) => {
			this.displayDistance = v;
		});

		this.phase = 'done';
		await this.delay(4000);
		if (!this._isVisible || this.runId !== currentRun) return;

		this.runSolver();
	}
}
