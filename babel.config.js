module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        loose: true,
        targets: {
          node: "6.9",
        },
      },
    ],
  ],
  env: {
    test: {
      plugins: ["istanbul"],
    },
  },
};
