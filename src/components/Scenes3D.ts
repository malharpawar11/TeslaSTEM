/**
 * Every WebGL scene loads through this one module. Giving each scene its own
 * dynamic import makes the bundler hoist three.js into the main bundle, which
 * every page then pays for.
 */
export { default as PythonCanvas } from "./python/PythonCanvas";
export { default as StemCanvas } from "./stem/StemCanvas";
export { default as CornerPythonCanvas } from "./python/CornerPythonCanvas";
