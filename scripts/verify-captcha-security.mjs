import assert from "node:assert/strict";

const previousSecret = process.env.CAPTCHA_SECRET;
process.env.CAPTCHA_SECRET = "test-only-captcha-secret";

const { default: captcha } = await import("../api/captcha.js");

const response = {
  headers: new Map(),
  statusCode: null,
  body: null,
  setHeader(name, value) {
    this.headers.set(name, value);
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
};

captcha({}, response);

const encodedSvg = response.body.image.split(",", 2)[1];
const svg = Buffer.from(encodedSvg, "base64").toString("utf8");

assert.equal(response.statusCode, 200, "captcha endpoint should return a challenge");
assert.equal(response.headers.get("Cache-Control"), "no-store", "captcha responses must never be cached");
assert.doesNotMatch(svg, /<text\b/i, "captcha answers must not be exposed as directly readable SVG text");
assert.match(svg, /<path\b/i, "captcha digits should render as vector paths");

if (previousSecret === undefined) delete process.env.CAPTCHA_SECRET;
else process.env.CAPTCHA_SECRET = previousSecret;

console.log("captcha security checks passed");
