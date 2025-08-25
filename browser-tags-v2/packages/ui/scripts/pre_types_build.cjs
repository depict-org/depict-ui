const { readFile, writeFile } = require("fs").promises;

(async () => {
  const package_file_name = __dirname + "/../package.json";
  const orig_file_contents = await readFile(package_file_name, "utf-8");
  const package_file = JSON.parse(orig_file_contents);
  const is_locales_build = process.argv[2] === "locales";
  process.stdout.write(orig_file_contents);

  delete package_file["targets"];
  delete package_file["main"];
  delete package_file["module"];
  package_file["types"] = is_locales_build ? "locales/index.d.ts" : "dist/index.d.ts";
  package_file["source"] = [is_locales_build ? "src/locales/index.ts" : "src/index.ts"];
  await writeFile(package_file_name, JSON.stringify(package_file, null, 2), {
    encoding: "utf-8",
  });
})();
