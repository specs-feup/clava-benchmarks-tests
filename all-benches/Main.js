laraImport("lara.benchmark.CHStoneBenchmarkSet");
//laraImport("lara.benchmark.HiFlipVXBenchmarkSet");
//laraImport("lara.benchmark.LsuBenchmarkInstance");
laraImport("lara.Io");
laraImport("clava.Clava");
laraImport("weaver.Query");

// Output file
//const outputFile = Io.getPath(Clava.getData().getContextFolder(), "stats.json");
const outputFile = Io.getPath("stats.json");

// Collect all bench instances
const allBenchInstances = [];

// Use default benchmarks
allBenchInstances.push(...new CHStoneBenchmarkSet().getInstances());
//allBenchInstances.push(...new HiFlipVXBenchmarkSet().getInstances());
/*
allBenchInstances.push(
  ...[
    //new LsuBenchmarkInstance("bzip2", "SMALL"),
    new LsuBenchmarkInstance("gzip", "SMALL"),
    //new LsuBenchmarkInstance("oggenc", "SMALL"),
    //new LsuBenchmarkInstance("gcc", "SMALL"),
  ]
);
*/
const allStats = {};

// Collect stats from the code specified in the configuration
console.log("Collecting stats from code in current AST");

// Consider each file as a different benchmark
for (const $file of Query.search("file")) {
  collectStats("currentAst-" + $file.name, $file);
}

// Save stats
Io.writeFile(outputFile, JSON.stringify(allStats));

console.log("Loading " + allBenchInstances.length + " benchmark instances");

for (const benchInstance of allBenchInstances) {
  const name = benchInstance.getName();

  // Load benchmark
  console.log("Loading benchmark '" + name + "'");
  benchInstance.load();

  collectStats(name);

  // Unload from AST
  benchInstance.close();

  // Save stats
  Io.writeFile(outputFile, JSON.stringify(allStats));
}

function collectStats(name, $startNode) {
  $startNode = $startNode ?? Query.root();

  // Create stats
  stats = {};
  allStats[name] = stats;

  const totalFunctions = Query.searchFrom($startNode, "function")
    .get()
    .map((f) => f.name);
  stats["totalFunctions"] = totalFunctions.length;

  const withPointers = getFunctions(hasPointers, $startNode);
  stats["functionWithPointersTotal"] = withPointers.length;
  stats["functionWithPointers"] = withPointers.map((f) => f.name);

  const externalCalls = getFunctions(hasExternalCalls, $startNode);
  stats["functionWithExternalCallsTotal"] = externalCalls.length;
  stats["functionWithExternalCalls"] = externalCalls.map((f) => f.name);

  const arrays = getFunctions(hasArrays, $startNode);
  stats["functionWithArraysTotal"] = arrays.length;
  stats["functionWithArrays"] = arrays.map((f) => f.name);

  const pointerArith = getFunctions(hasPointerArith, $startNode);
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
  stats["functionWithPointers"].forEach((item) => eligibleFunctions.add(item));
  for (const value of uneligibleFunctions) {
    eligibleFunctions.delete(value);
  }

  //const eligibleFunctions = allFunctions.difference(uneligibleFunctions);

  stats["eligibleFunctionsTotal"] = eligibleFunctions.size;
  stats["eligibleFunctions"] = Array.from(eligibleFunctions);
}

function getFunctions(functionPredicate, $startNode) {
  const res = [];

  for (const func of Query.searchFrom($startNode, "function")) {
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
  // a+b, a-b, a+=b, a-=b, a++, ++a, a--, --a
  const pointerArithOps = new Set([
    "add",
    "sub",
    "add_assign",
    "sub_assign",
    "post_inc",
    "pre_inc",
    "post_dec",
    "pre_dec",
  ]);

  for (const op of Query.searchFrom($function, "op")) {
    if (!pointerArithOps.has(op.kind)) {
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
  for (const expr of Query.searchFrom($function, "expression")) {
    if (expr.type.desugarAll.isPointer) {
      return true;
    }
  }

  return false;
}
