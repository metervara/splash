export function map(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	if (inMin === inMax) {
		throw new Error('Input range cannot have the same min and max values.');
	}

	const proportion = (value - inMin) / (inMax - inMin);
	return outMin + proportion * (outMax - outMin);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function lerpRGB(a: number[], b: number[], t: number): string {
	const r = a[0] + (b[0] - a[0]) * t;
	const g = a[1] + (b[1] - a[1]) * t;
	const b2 = a[2] + (b[2] - a[2]) * t;
	return `rgb(${r | 0}, ${g | 0}, ${b2 | 0})`;
}





