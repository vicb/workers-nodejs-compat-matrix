import React, { useState } from "react";
import "./App.css";

import node18 from "./data/node-18.json";
import node20 from "./data/node-20.json";
import node22 from "./data/node-22.json";
import nodeBaseline from "./data/baseline.json";
import bun from "./data/bun.json";
import deno from "./data/deno.json";
import workerd from "./data/workerd.json";
import wranglerJspm from "./data/wrangler-jspm-polyfills.json";
import wranglerUnenv from "./data/wrangler-unenv-polyfills.json";
import wranglerV3 from "./data/wrangler-v3-polyfills.json";
import versionMap from "./data/versionMap.json";
import { mismatch, stub, supported, unsupported } from "./constants";
import { Legend } from "./Legend";
import { TableCell, TableHeaderCell, TableRow } from "./Table";

type CompatObject = Record<string, string>;
type CompatMap = Record<string, string | CompatObject>;

const irrelevantAPIs = [
  "child_process",
  "cluster",
  "constants",
  "domain",
  "inspector",
  "inspector/promises",
  "module",
  "os",
  "path/win32",
  "process",
  "repl",
  "sys",
  "trace_events",
  "tty",
  "vm",
  "worker_threads",
];

// const relevantAPIs = Object.keys(baseline)
//   .filter((name) => !irrelevantAPIs.includes(name))
//   .sort()
//   .reduce((acc, key) => {
//     return {
//       ...acc,
//       [key]: baseline[key as keyof typeof baseline],
//     };
//   }, {});

// const isObject = (nodeValue: any) =>
// typeof nodeValue === "object" && Object.keys(nodeValue).length > 0;

const isObject = (nodeValue: any) =>
  nodeValue &&
  typeof nodeValue === "object" &&
  Object.keys(nodeValue).length > 0;

const targetTitles = {
  node18: "node",
  node20: "node",
  node22: "node",
  bun: "bun",
  deno: "deno",
  workerd: "workerd",
  wranglerJspm: "wrangler",
  wranglerUnenv: "wrangler",
  wranglerV3: "wrangler",
};

const App = () => {
  const [expanded, setExpanded] = useState<string[]>([]);

  const getTargetValue: any = (map: CompatMap, path: string[]) => {
    if (path.length === 0) {
      return map;
    }
    const [head, ...tail] = path;
    const value = map[head];
    if (value == null || value === undefined) return null;
    return getTargetValue(value as CompatMap, tail);
  };

  const renderTargetValue = (nodeValue: any, value: string) => {
    if (value === "stub") {
      return stub;
    }
    if (value && nodeValue !== value) {
      return mismatch;
    }
    if (value) {
      return supported;
    }
    return unsupported;
  };

  const renderEntries: any = (
    baseline: any,
    targets: Record<string, CompatMap>,
    path: string[]
  ) => {
    const rows = [];
    let baselineTotal = 0;
    let targetTotals: Record<string, number> = Object.keys(targets).reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {}
    );

    for (const [key, nodeValue] of Object.entries(baseline)) {
      const keyPath = [...path, key];

      if (path.length === 0) {
        baselineTotal = 0;
        targetTotals = Object.keys(targets).reduce(
          (acc, key) => ({ ...acc, [key]: 0 }),
          {}
        );
      }

      let childRows;

      if (isObject(nodeValue)) {
        const result = renderEntries(nodeValue, targets, keyPath);
        childRows = result.rows;
        baselineTotal = result.baselineTotal;
        for (const targetKey of Object.keys(targets)) {
          targetTotals[targetKey] = result.targetTotals[targetKey];
        }
      } else {
        baselineTotal += 1;
        for (const targetKey of Object.keys(targets)) {
          const targetSupported = getTargetValue(targets[targetKey], keyPath);
          targetTotals[targetKey] += targetSupported ? 1 : 0;
        }
      }

      let columns = [];
      for (const targetKey of Object.keys(targets)) {
        const targetValue = getTargetValue(targets[targetKey], keyPath);

        columns.push(
          <td className="p-1 border border-slate-200">
            {isObject(nodeValue) ? (
              <span title={`${targetTotals[targetKey]} / ${baselineTotal}`}>
                {((targetTotals[targetKey] / baselineTotal) * 100).toFixed(0)}%
              </span>
            ) : (
              renderTargetValue(nodeValue, targetValue)
            )}
          </td>
        );
      }

      const expand = (key: string) => {
        if (expanded.includes(key)) {
          setExpanded(expanded.filter((k) => k !== key));
        } else {
          setExpanded([...expanded, key]);
        }
      };

      rows.push(
        <>
          <TableRow onClick={() => expand(key)}>
            <TableCell>
              <div className="flex justify-start items-center">
                <span className="opacity-0">
                  {"_".repeat(keyPath.length * 2)}
                </span>
                {key}
                {isObject(nodeValue) && !expanded.includes(key) && (
                  <span className="text-sm pl-2">▶</span>
                )}
                {isObject(nodeValue) && expanded.includes(key) && (
                  <span className="text-sm pl-2">▼</span>
                )}
              </div>
            </TableCell>
            <TableCell>{supported}</TableCell>
            {columns}
          </TableRow>
          {expanded.includes(key) && childRows}
        </>
      );
    }

    return {
      rows,
      baselineTotal,
      targetTotals,
    };
  };

  const targets = {
    node22,
    node20,
    node18,
    bun,
    deno,
    workerd,
    wranglerV3,
    wranglerJspm,
    wranglerUnenv,
  };

  return (
    <div className="App">
      <div className="container mx-auto py-10">
        <div className="my-5 flex justify-between">
          <div className="flex gap-2">
            <button
              className="hover:bg-slate-100 border border-blue-400 text-blue-700 text-sm font-semibold px-3 py-2 rounded-md"
              onClick={() => setExpanded([...Object.keys(nodeBaseline)])}
            >
              Expand All
            </button>
            <button
              className="hover:bg-slate-100 border border-blue-400 text-blue-700 text-sm font-semibold px-3 py-2 rounded-md"
              onClick={() => setExpanded([])}
            >
              Collapse All
            </button>
          </div>
          <Legend />
        </div>
        <table className="table-fixed border border-slate-200 p-5 border-collapse">
          <thead>
            <tr>
              <TableHeaderCell width="min-w-[50ch]">API</TableHeaderCell>
              <TableHeaderCell width="w-[18ch]">baseline</TableHeaderCell>
              {Object.keys(targets).map((target) => (
                <TableHeaderCell width="w-[18ch]">
                  <div>{targetTitles[target as keyof typeof targetTitles]}</div>
                  <div className="text-xs font-light">
                    {versionMap[target as keyof typeof versionMap]}
                  </div>
                </TableHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>{renderEntries(nodeBaseline, targets, []).rows}</tbody>
        </table>
      </div>
    </div>
  );
};

export default App;