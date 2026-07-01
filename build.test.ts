import { expect, test } from "bun:test";
import { existsSync } from "node:fs";

test("formats client bundle exists and exports activate", async () => {
  expect(existsSync("dist/modules/formats/client.js")).toBe(true);
  const mod = await import("./dist/modules/formats/client.js");
  expect(typeof (mod.default ?? mod.activate)).toBe("function");
});
