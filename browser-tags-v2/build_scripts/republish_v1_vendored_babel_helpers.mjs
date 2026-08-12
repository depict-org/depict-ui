#!/usr/bin/env node
// Repackages the frozen v1 line of @depict-ai/utilishared and @depict-ai/dpc from the exact
// published npm tarballs (the v1 source is no longer buildable from this repo), vendoring the
// @babel/runtime helpers they import into the artifact so CDN consumers (esm.run / jsdelivr
// `+esm`) never resolve @babel/runtime at request time.
//
// Usage: node build_scripts/republish_v1_vendored_babel_helpers.mjs [outdir]

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const BABEL_RUNTIME_VERSION = "7.29.7";
const HELPERS = ["defineProperty", "classPrivateFieldGet", "classPrivateFieldSet"];
const PACKAGES = [
  { name: "@depict-ai/utilishared", base: "1.0.51", next: "1.0.52", patchDeps: {} },
  { name: "@depict-ai/dpc", base: "1.0.45", next: "1.0.46", patchDeps: { "@depict-ai/utilishared": "^1.0.52" } },
];

const out_dir = path.resolve(process.argv[2] ?? "v1-republish-out");
const work_dir = fs.mkdtempSync(path.join(os.tmpdir(), "depict-v1-republish-"));

async function fetch_json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function download_and_extract(name, version) {
  const meta = await fetch_json(`https://registry.npmjs.org/${name}`);
  const version_meta = meta.versions[version];
  if (!version_meta) throw new Error(`${name}@${version} not found in registry`);
  const { tarball, integrity } = version_meta.dist;
  const res = await fetch(tarball);
  if (!res.ok) throw new Error(`GET ${tarball} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const [algo, expected] = integrity.split("-", 2);
  const actual = createHash(algo).update(buf).digest("base64");
  if (actual !== expected) throw new Error(`integrity mismatch for ${name}@${version}`);
  const tgz = path.join(work_dir, `${name.replace(/[@/]/g, "_")}-${version}.tgz`);
  const dir = tgz.replace(/\.tgz$/, "");
  fs.writeFileSync(tgz, buf);
  fs.mkdirSync(dir, { recursive: true });
  execFileSync("tar", ["xzf", tgz, "-C", dir]);
  console.log(`fetched ${name}@${version} (integrity ok)`);
  return path.join(dir, "package");
}

// The runtime's helper files reference each other with same-directory relative specifiers,
// so copying the transitive closure preserves them verbatim.
function helper_closure(runtime_dir, flavor) {
  const helpers_dir = path.join(runtime_dir, "helpers", flavor === "esm" ? "esm" : ".");
  const closure = new Map();
  const queue = HELPERS.map(h => `${h}.js`);
  while (queue.length) {
    const file = queue.shift();
    if (closure.has(file)) continue;
    const source = fs.readFileSync(path.join(helpers_dir, file), "utf8");
    closure.set(file, source);
    for (const match of source.matchAll(/(?:from\s*|require\()\s*"\.\/([^"]+)"/g)) {
      queue.push(match[1]);
    }
  }
  return closure;
}

function shipped_code_files(pkg_dir) {
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|cjs|mjs)$/.test(entry.name)) files.push(p);
    }
  };
  walk(pkg_dir);
  return files.filter(f => !f.includes(`${path.sep}babel-helpers${path.sep}`));
}

function rewrite_specifiers(pkg_dir) {
  let total = 0;
  for (const file of shipped_code_files(pkg_dir)) {
    const original = fs.readFileSync(file, "utf8");
    const flavor = file.endsWith(".cjs") ? "cjs" : "esm";
    const rewritten = original.replaceAll(/"@babel\/runtime\/helpers\/([a-zA-Z0-9_]+)"/g, (whole, helper) => {
      if (!HELPERS.includes(helper)) throw new Error(`unexpected helper ${helper} in ${file}`);
      total++;
      const target = path.join(pkg_dir, "babel-helpers", flavor, `${helper}.js`);
      let rel = path.relative(path.dirname(file), target);
      if (!rel.startsWith(".")) rel = `./${rel}`;
      return `"${rel}"`;
    });
    if (rewritten !== original) fs.writeFileSync(file, rewritten);
  }
  return total;
}

function patch_manifest(pkg_dir, spec) {
  const manifest_path = path.join(pkg_dir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifest_path, "utf8"));
  manifest.version = spec.next;
  delete manifest.dependencies["@babel/runtime"];
  delete manifest.dependencies["@babel/runtime-corejs3"];
  Object.assign(manifest.dependencies, spec.patchDeps);
  manifest.files.push("/babel-helpers");
  // the original "build"/"publish" scripts assume the (gone) v1 yarn workspace
  delete manifest.scripts;
  fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, 2) + "\n");
}

function verify(pkg_dir, name) {
  for (const file of shipped_code_files(pkg_dir).concat(
    fs.readdirSync(path.join(pkg_dir, "babel-helpers", "esm")).map(f => path.join(pkg_dir, "babel-helpers", "esm", f)),
    fs.readdirSync(path.join(pkg_dir, "babel-helpers", "cjs")).map(f => path.join(pkg_dir, "babel-helpers", "cjs", f)),
  )) {
    const source = fs.readFileSync(file, "utf8");
    if (/@babel\/runtime/.test(source)) throw new Error(`@babel/runtime specifier left behind in ${file}`);
    // pre-existing relative specifiers are shipped as-is; only the ones this script wrote
    // (babel-helpers paths, and the helpers' own intra-directory imports) must resolve
    for (const match of source.matchAll(/(?:from\s*|import\(|require\()\s*"(\.[^"]+)"/g)) {
      const in_helpers = file.includes(`${path.sep}babel-helpers${path.sep}`);
      if (!in_helpers && !match[1].includes("babel-helpers/")) continue;
      const resolved = path.resolve(path.dirname(file), match[1]);
      if (!fs.existsSync(resolved)) throw new Error(`unresolved relative import ${match[1]} in ${file}`);
    }
  }
  console.log(`verified ${name}: no @babel/runtime references, all relative imports resolve`);
}

const runtime_dir = await download_and_extract("@babel/runtime", BABEL_RUNTIME_VERSION);
const closures = { esm: helper_closure(runtime_dir, "esm"), cjs: helper_closure(runtime_dir, "cjs") };
console.log(`helper closure: ${[...closures.esm.keys()].join(", ")}`);

fs.mkdirSync(out_dir, { recursive: true });
for (const spec of PACKAGES) {
  const pkg_dir = await download_and_extract(spec.name, spec.base);
  for (const [flavor, closure] of Object.entries(closures)) {
    const dest = path.join(pkg_dir, "babel-helpers", flavor);
    fs.mkdirSync(dest, { recursive: true });
    for (const [file, source] of closure) fs.writeFileSync(path.join(dest, file), source);
  }
  const rewrites = rewrite_specifiers(pkg_dir);
  if (rewrites === 0) throw new Error(`no @babel/runtime/helpers specifiers found in ${spec.name} - wrong base version?`);
  patch_manifest(pkg_dir, spec);
  verify(pkg_dir, spec.name);
  execFileSync("npm", ["pack", pkg_dir, "--pack-destination", out_dir], { stdio: "inherit" });
  console.log(`${spec.name}@${spec.next}: ${rewrites} specifiers rewritten\n`);
}

console.log(`tarballs in ${out_dir}. To release (publish utilishared first):`);
for (const spec of PACKAGES) {
  console.log(`  npm publish ${path.join(out_dir, `${spec.name.replace(/^@/, "").replace("/", "-")}-${spec.next}.tgz`)}`);
}
console.log(`then purge the range URLs so jsdelivr re-resolves @1.0 immediately:`);
console.log(`  curl https://purge.jsdelivr.net/npm/@depict-ai/dpc@1.0/ES10/+esm`);
console.log(`  curl https://purge.jsdelivr.net/npm/@depict-ai/utilishared@1.0.51/ES10/+esm`);
