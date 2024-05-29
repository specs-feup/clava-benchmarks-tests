laraImport("lara.benchmark.CHStoneBenchmarkSet");

// Collect all bench instances
const allBenchInstances = [];

// Use default benchmarks
allBenchInstances.push(...new CHStoneBenchmarkSet().getInstances());

console.log("Loading " + allBenchInstances.length + " benchmark instances");

for (const benchInstance of allBenchInstances) {
  console.log("Bench " + benchInstance.getName());
}
