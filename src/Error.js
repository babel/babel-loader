class LoaderError extends Error {
  constructor(err, hideStack) {
    super();

    this.name = "BabelLoaderError";

    this.message = `${err.name ? `${err.name}: ` : ""}${err.message}\n\n${
      err.codeFrame
    }\n`;

    this.hideStack = hideStack;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = LoaderError;
