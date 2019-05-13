export function timeTaken(fnName, fn) {
    const start = new Date().getTime();
    const result = fn();
    const end = new Date().getTime();
    const time = end - start;
    console.log(`${fnName} time taken: ${time}`);
    return result;
}
const start = (caller, label) => {
    caller.started = new Date().getTime();
    console.log(label+' Started', caller.started);
};
const stop = (caller, label) => {
    const stopped = new Date().getTime();
    console.log(label+' Stopped', stopped);
    console.log(label+ ' Total time taken', stopped - caller.started);
    delete caller.started;
};
export {start, stop};