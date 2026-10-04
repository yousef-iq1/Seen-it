type Pattern = "tick" | "commit" | "undo";
const PATTERNS: Record<Pattern, number | number[]> = {
    tick: 8,
    commit: [11, 26, 16],
    undo: [6, 40, 6],
};
export function haptic(pattern: Pattern, enabled = true) {
    if (!enabled || typeof navigator === "undefined")
        return;
    const vibrate = navigator.vibrate?.bind(navigator);
    if (!vibrate)
        return;
    try {
        vibrate(PATTERNS[pattern]);
    }
    catch {
    }
}
