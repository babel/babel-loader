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

  t.is(relative("C:\\the\\root", "C:\\the\\root\\one.js"), "one.js");
  t.is(relative("C:\\the", "C:\\the\\root\\one.js"), "root\\one.js");
  t.is(relative("C:\\the\\root", "C:\\the\\one.js"), "..\\one.js");
  t.is(relative("C:\\", "C:\\the\\root\\one.js"), "the\\root\\one.js");
});
