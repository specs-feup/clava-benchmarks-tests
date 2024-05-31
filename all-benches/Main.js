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

  const withPointers = getFunctions(hasPointers);
  stats["functionWithPointersTotal"] = withPointers.length;
  stats["functionWithPointers"] = withPointers.map((f) => f.name);

  const externalCalls = getFunctions(hasExternalCalls);
  stats["functionWithExternalCallsTotal"] = externalCalls.length;
  stats["functionWithExternalCalls"] = externalCalls.map((f) => f.name);

  const arrays = getFunctions(hasArrays);
  stats["functionWithArraysTotal"] = arrays.length;
  stats["functionWithArrays"] = arrays.map((f) => f.name);

  const pointerArith = getFunctions(hasPointerArith);
  stats["functionWithPointerArithTotal"] = pointerArith.length;
  stats["functionWithPointerArith"] = pointerArith.map((f) => f.name);

  const uneligibleFunctions = new Set();
  stats["functionWithExternalCalls"].forEach((item) =>
    uneligibleFunctions.add(item)
  );
  stats["functionWithArrays"].forEach((item) => uneligibleFunctions.add(item));
  stats["functionWithPointerArith"].forEach((item) =>
    uneligibleFunctions.add(item)
  );

  const eligibleFunctions = new Set();
  withPointers.forEach((item) => eligibleFunctions.add(item));
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

function getFunctions(functionPredicate) {
  const res = [];

  for (const func of Query.search("function")) {
    if (functionPredicate(func)) {
      res.push(func);
    }
  }

  return res;
}

function hasArrays($function) {
  // Check declarations
  for (const decl of Query.searchFrom($function, "decl")) {
    if (decl.type.isArray) {
      return true;
    }
  }

  // Check array accesses
  // Any array access counts has having arrays
  for (const arrayAccess of Query.searchFrom($function, "arrayAccess")) {
    return true;
  }

  return false;
}

function hasExternalCalls($function) {
  for (const call of Query.searchFrom($function, "call")) {
    if (call.definition === undefined) {
      return true;
    }
  }

  return false;
}

function hasPointerArith($function) {
  for (const op of Query.searchFrom($function, "op")) {
    if (op.kind === "assign") {
      continue;
    }

    for (const child of op.children) {
      if (child.type.isPointer) {
        return true;
      }
    }
  }

  return false;
}

function hasPointers($function) {
  for (const expr of Query.searchFrom($function, "expr")) {
    if (expr.type.isPointer) {
      return true;
    }
  }

  return false;
}
