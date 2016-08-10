'use strict';
const fs = require('fs');
const addStream = require('add-stream');
const cl = require('conventional-changelog');

const inStream = fs.createReadStream('CHANGELOG.md');
const isForce = process.argv.indexOf('--force') !== -1;

/**
 * Creates and prepends the changelog from the latest tag to head.
 * Passing the arg `--force` will rewrite the entire changelog.
 */

inStream.on('error', function(err) {
  console.error(`Error: failed to read the previous changelog file.
    If this is the initial run, use the --force flag. ${err}`);
  process.exit(1);
});

const config = {
  preset: 'angular',
  releaseCount: isForce ? 0 : 1
};

const getOutputStream = () => {
  return fs.createWriteStream('CHANGELOG.md');
};

const stream = cl(config).on('error', function(err) {
    console.error(`An error occurred while generating the changelog:  ${err}`);
  }).pipe(!isForce && addStream(inStream) || getOutputStream());

if (!isForce) {
  inStream.on('end', function() {
    stream.pipe(getOutputStream());
  });
}

/*eslint no-console: ["error", { allow: ["warn", "error"] }] */
