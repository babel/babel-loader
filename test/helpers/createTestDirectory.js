import path from "path";
import fs from "fs";
import { rimraf } from "rimraf";

export default function createTestDirectory(baseDirectory, testTitle, cb) {
  const directory = path.join(baseDirectory, escapeDirectory(testTitle));

  rimraf(directory)
    .then(() => {
      fs.mkdir(directory, { recursive: true }, mkdirErr =>
        cb(mkdirErr, directory),
      );
    })
    .catch(err => {
      cb(err);
    });
}

function escapeDirectory(directory) {
  return directory.replace(/[/?<>\\:*|"\s]/g, "_");
}
