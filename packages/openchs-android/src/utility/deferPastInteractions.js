import {InteractionManager} from "react-native";

// Run `fn` once after interactions settle, or at `capMs` if a leaked interaction handle never lets
// them settle. Fallback armed before runAfterInteractions so a synchronous one still clears it.
export default function deferPastInteractions(fn, capMs = 2000) {
    let done = false;
    let handle;
    const runOnce = () => {
        if (done) return;
        done = true;
        clearTimeout(fallbackId);
        if (handle && handle.cancel) handle.cancel();
        fn();
    };
    const fallbackId = setTimeout(runOnce, capMs);
    handle = InteractionManager.runAfterInteractions(runOnce);
}
