import { rmSync } from "fs";

if (process.argv[2]) {
  rmSync(process.argv[2], { recursive: true, force: true });
}
