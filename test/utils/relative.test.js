import test from "ava";
import relative from "../../lib/utils/relative.js";

test("should get correct relative path", (t) => {
  t.is(relative("/the/root", "/the/root/one.js"), "one.js");
  t.is(relative("/the/root", "/the/rootone.js"), "../rootone.js");
  t.is(relative("/the/root", "/therootone.js"), "/therootone.js");

  t.is(relative("", "/the/root/one.js"), "/the/root/one.js");
  t.is(relative(".", "/the/root/one.js"), "/the/root/one.js");
  t.is(relative("", "the/root/one.js"), "the/root/one.js");
  t.is(relative(".", "the/root/one.js"), "the/root/one.js");

  t.is(relative("/", "/the/root/one.js"), "the/root/one.js");
  t.is(relative("/", "the/root/one.js"), "the/root/one.js");
});