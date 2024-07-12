import path from "node:path";
import fs from "node:fs/promises";

export default async function createTestDirectory(baseDirectory, testTitle) {
  const directory = path.join(baseDirectory, escapeDirectory(testTitle));

  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function escapeDirectory(directory) {
  return directory.replace(/[/?<>\\:*|"\s]/g, "_");
}
