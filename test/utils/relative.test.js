import test from "ava";
import os from "os";
import relative from "../../lib/utils/relative.js";

if (os.platform() === "win32") {
  test("should get correct relative path - depth 0 - windows", t => {
    t.is(relative("C:\\the\\root", "C:\\the\\root\\one.js"), "one.js");
  });

  test("should get correct relative path - depth 1 - windows", t => {
    t.is(relative("C:\\the\\root", "C:\\the\\rootone.js"), "..\\rootone.js");
  });

  test("should get correct relative path - depth 2 - windows", t => {
    t.is(relative("C:\\the\\root", "C:\\therootone.js"), "C:\\therootone.js");
  });

  test("should get correct relative path with main root - depth 0 - windows", t => {
    t.is(relative("C:\\", "C:\\the\\root\\one.js"), "the\\root\\one.js");
  });
} else {
  test("should get correct relative path - depth 0", t => {
    t.is(relative("/the/root", "/the/root/one.js"), "one.js");
  });

  test("should get correct relative path - depth 1", t => {
    t.is(relative("/the/root", "/the/rootone.js"), "../rootone.js");
  });

  test("should get correct relative path - depth 2", t => {
    t.is(relative("/the/root", "/therootone.js"), "/therootone.js");
  });

  test("should get correct relative path with main root - depth 0", t => {
    t.is(relative("/", "/the/root/one.js"), "the/root/one.js");
  });
}
