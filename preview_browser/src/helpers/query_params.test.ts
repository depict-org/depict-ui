import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ALLOWED_BASE_URL_HOST_SUFFIXES, is_allowed_base_url } from "./query_params.ts";

// Runs on the built-in node test runner with no dependencies at all, which is what lets it run in CI
// without a yarn install: query_params.ts imports nothing.

describe("is_allowed_base_url", () => {
  it("accepts the doors the preview links actually use", () => {
    assert.equal(is_allowed_base_url("https://api.depict.ai"), true);
    assert.equal(is_allowed_base_url("https://realtime-staging-ingestion.depict.ai"), true);
  });

  it("accepts any depict.ai subdomain, with or without a path or trailing slash", () => {
    assert.equal(is_allowed_base_url("https://anything.depict.ai/"), true);
    assert.equal(is_allowed_base_url("https://deeper.nested.depict.ai/v3"), true);
    assert.equal(is_allowed_base_url("https://depict.ai"), true);
  });

  it("accepts localhost on any port, which is how the shipped datalist suggestion is used", () => {
    assert.equal(is_allowed_base_url("http://localhost:9100"), true);
    assert.equal(is_allowed_base_url("http://localhost"), true);
    assert.equal(is_allowed_base_url("https://api.depict.ai:8443"), true);
  });

  it("rejects other hosts", () => {
    assert.equal(is_allowed_base_url("https://evil.com"), false);
    assert.equal(is_allowed_base_url("https://api.example.org/v3"), false);
  });

  it("rejects hosts that only look like ours", () => {
    // the suffix entry has a leading dot, so this is a different registrable domain, not a subdomain
    assert.equal(is_allowed_base_url("https://api.depict.ai.evil.com"), false);
    assert.equal(is_allowed_base_url("https://notdepict.ai"), false);
    // "localhost" has no leading dot, so it must match exactly
    assert.equal(is_allowed_base_url("http://notlocalhost"), false);
    assert.equal(is_allowed_base_url("http://localhost.evil.com"), false);
  });

  it("rejects a userinfo prefix, which is the host the browser would NOT contact", () => {
    assert.equal(is_allowed_base_url("https://api.depict.ai@evil.com"), false);
  });

  it("rejects an allowed host mentioned somewhere other than the host", () => {
    assert.equal(is_allowed_base_url("https://evil.com/?next=https://api.depict.ai"), false);
    assert.equal(is_allowed_base_url("https://evil.com/api.depict.ai"), false);
  });

  it("rejects scheme-less values, because we cannot tell which host they would reach", () => {
    assert.equal(is_allowed_base_url("api.depict.ai"), false);
    assert.equal(is_allowed_base_url("//api.depict.ai"), false);
    assert.equal(is_allowed_base_url("localhost:9100"), false);
  });

  it("rejects non-http schemes even on an allowed host", () => {
    assert.equal(is_allowed_base_url("javascript:alert(1)"), false);
    assert.equal(is_allowed_base_url("data:text/html,hi"), false);
    assert.equal(is_allowed_base_url("ftp://api.depict.ai"), false);
  });

  it("is case-insensitive about the host, because it compares the parsed hostname", () => {
    assert.equal(is_allowed_base_url("https://API.DEPICT.AI"), true);
    assert.equal(is_allowed_base_url("HTTPS://api.depict.ai"), true);
  });

  it("treats absent values as no override rather than a rejected one", () => {
    assert.equal(is_allowed_base_url(""), false);
    assert.equal(is_allowed_base_url(null), false);
    assert.equal(is_allowed_base_url(undefined), false);
  });

  it("keeps the two documented suffix shapes", () => {
    assert.deepEqual(ALLOWED_BASE_URL_HOST_SUFFIXES, [".depict.ai", "localhost"]);
  });
});
