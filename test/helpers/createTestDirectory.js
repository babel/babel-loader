import path from "path";
import fs from "fs";
import rimraf from "rimraf";

export default function createTestDirectory(baseDirectory, testTitle, cb) {
  const directory = path.join(baseDirectory, escapeDirectory(testTitle));

  rimraf(directory, err => {
    if (err) return cb(err);
    fs.mkdir(directory, { recursive: true }, mkdirErr =>
      cb(mkdirErr, directory),
    );
  });
}

function escapeDirectory(directory) {
  return directory.replace(/[/?<>\\:*|"\s]/g, "_");
}
