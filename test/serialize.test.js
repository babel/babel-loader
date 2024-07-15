import test from "node:test";
import assert from "node:assert/strict";
import serialize from "../lib/serialize.js";

test("serialize should work on simple object", () => {
  const output = serialize({
    assumptions: {
      arrayLikeIsIterable: true,
      constantReexports: false,
    },
    presets: ["@babel/preset-env", "@babel/preset-react"],
  });
  assert.strictEqual(
    output,
    `{,"assumptions":{,"arrayLikeIsIterable":!0,"constantReexports":!1},"presets":[@babel/preset-env,@babel/preset-react]}`,
  );
});

test("serialize should sort object keys", () => {
  const output1 = serialize({ a: "a", b: "b", c: "c" });
  const output2 = serialize({ c: "c", b: "b", a: "a" });
  assert.strictEqual(output1, `{,"a":a,"b":b,"c":c}`);
  assert.strictEqual(output2, `{,"a":a,"b":b,"c":c}`);
});

test("serialize should respect toJSON method", () => {
  const output = serialize({
    plugins: [
      {
        toJSON() {
          return "custom plugins";
        },
      },
    ],
  });
  assert.strictEqual(output, `{,"plugins":[custom plugins]}`);
});

test("serialize should support numbers and NaN", () => {
  const output = serialize({
    plugins: [["custom plugin", { number: 2, NaN: NaN }]],
  });
  assert.strictEqual(
    output,
    `{,"plugins":[[custom plugin,{,"NaN":null,"number":2}]]}`,
  );
});

test("serialize should support nullish values", () => {
  const output = serialize({
    plugins: [
      [
        "custom plugin",
        {
          null: null,
          undefined: undefined,
          arrayNull: [null],
          arrayUndefined: [undefined],
        },
      ],
    ],
  });
  assert.strictEqual(
    output,
    `{,"plugins":[[custom plugin,{,"arrayNull":[null],"arrayUndefined":[null],"null":null}]]}`,
  );
});

test("serialize should support set", () => {
  const output = serialize({
    plugins: ["custom plugin", [{ visitNodeTypes: new Set(["Identifier"]) }]],
  });
  assert.strictEqual(
    output,
    `{,"plugins":[custom plugin,[{,"visitNodeTypes":{}}]]}`,
  );
});
