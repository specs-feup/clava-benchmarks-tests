laraImport("lara.benchmark.CHStoneBenchmarkSet");
laraImport("lara.Io");
laraImport("clava.Clava");

// Output file
const outputFile = Io.getPath(Clava.getData().getContextFolder(), "stats.json");

// Collect all bench instances
const allBenchInstances = [];

// Use default benchmarks
allBenchInstances.push(...new CHStoneBenchmarkSet().getInstances());

console.log("Loading " + allBenchInstances.length + " benchmark instances");

const allStats = {};

for (const benchInstance of allBenchInstances) {
  const name = benchInstance.getName();

  // Load benchmark
  console.log("Loading benchmark '" + name + "'");
  benchInstance.load();

  // Create stats
  stats = {};
  allStats[name] = stats;

  stats["totalFunctions"] = Query.search("function").get().length;

  const externalCalls = getFunctionsWithExternalCalls();
  stats["functionWithExternalCallsTotal"] = externalCalls.length;
  stats["functionWithExternalCalls"] = externalCalls.map((f) => f.name);

  const arrays = getFunctionsWithArrays();
  stats["functionWithArraysTotal"] = arrays.length;
  stats["functionWithArrays"] = arrays.map((f) => f.name);

  // Unload from AST
  benchInstance.close();

  // Save stats
  Io.writeFile(outputFile, JSON.stringify(allStats));
}

function getFunctionsWithExternalCalls() {
  const res = [];

  for (const func of Query.search("function")) {
    let hasExternalCall = false;
    for (const call of Query.searchFrom(func, "call")) {
      if (call.definition === undefined) {
        hasExternalCall = true;
        break;
      }
    }

    if (hasExternalCall) {
      res.push(func);
    }
  }

  return res;
}
