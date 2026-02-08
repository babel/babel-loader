import webpack from "webpack";
import { rspack } from "@rspack/core";
import { promisify } from "node:util";

export const bundlers = [
  {
    name: "webpack",
    compileAsync: promisify(webpack),
  },
  {
    name: "rspack",
    compileAsync: promisify(rspack),
  },
];
