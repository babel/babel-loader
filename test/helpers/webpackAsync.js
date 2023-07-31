import webpack from "webpack";
import { promisify } from "node:util";
export const webpackAsync = promisify(webpack);
