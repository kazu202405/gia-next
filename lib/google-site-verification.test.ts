import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Google Search Console（https://gia2018.com/）の所有確認ファイル。
// 消したり中身が変わったりすると所有の確認が外れ、検索の数字が見られなくなる。
const FILE_NAME = "googlebd10d4717e9c22ff.html";

describe("Google Search Console の確認ファイル", () => {
  it("public に置かれ、中身が Google の指定どおり", () => {
    const body = readFileSync(join(process.cwd(), "public", FILE_NAME), "utf8");
    expect(body.trim()).toBe(`google-site-verification: ${FILE_NAME}`);
  });
});
