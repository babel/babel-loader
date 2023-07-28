import webpack from "webpack";
import { promisify } from "util";
export const webpackAsync = promisify(webpack);
