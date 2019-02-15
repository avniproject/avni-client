export function timeTaken(fnName, fn) {
    const start = new Date().getTime();
    const result = fn();
    const end = new Date().getTime();
    const time = end - start;
    console.log(`${fnName} time taken: ${time}`);
    return result;
}