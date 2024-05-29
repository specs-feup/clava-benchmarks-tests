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

  const totalFunctions = Query.search("function")
    .get()
    .map((f) => f.name);
  stats["totalFunctions"] = totalFunctions.length;

  const externalCalls = getFunctionsWithExternalCalls();
  stats["functionWithExternalCallsTotal"] = externalCalls.length;
  stats["functionWithExternalCalls"] = externalCalls.map((f) => f.name);

  const arrays = getFunctionsWithArrays();
  stats["functionWithArraysTotal"] = arrays.length;
  stats["functionWithArrays"] = arrays.map((f) => f.name);

  const uneligibleFunctions = new Set();
  stats["functionWithExternalCalls"].forEach((item) =>
    uneligibleFunctions.add(item)
  );
  stats["functionWithArrays"].forEach((item) => uneligibleFunctions.add(item));

  const eligibleFunctions = new Set();
  totalFunctions.forEach((item) => eligibleFunctions.add(item));
  for (const value of uneligibleFunctions) {
    eligibleFunctions.delete(value);
  }

  //const eligibleFunctions = allFunctions.difference(uneligibleFunctions);

  stats["eligibleFunctionsTotal"] = eligibleFunctions.size;
  stats["eligibleFunctions"] = Array.from(eligibleFunctions);

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

function getFunctionsWithArrays() {
  const res = [];

  for (const func of Query.search("function")) {
    let hasArray = false;

    // Check declarations
    for (const decl of Query.searchFrom(func, "decl")) {
      if (decl.type.isArray) {
        hasArray = true;
        break;
      }
    }

    // Check array accesses
    if (!hasArray) {
      // Any array access counts has having arrays
      for (const arrayAccess of Query.searchFrom(func, "arrayAccess")) {
        hasArray = true;
        break;
      }
    }

    if (hasArray) {
      res.push(func);
    }
  }

  return res;
}
