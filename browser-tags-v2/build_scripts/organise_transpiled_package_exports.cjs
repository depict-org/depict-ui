const fs = require("fs").promises;
const path = require("path");
const { Worker } = require("worker_threads");

(async () => {
  const pkg = process.argv[2];
  const transform_locales = process.argv[3] === "true";
  console.log("Moving and transforming imports for package", pkg);
  const package_directory = path.join(__dirname, "..", "packages", pkg);
  const client_path = path.join(package_directory, "dist", "client");
  const has_client_folder = await dir_exists(client_path);
  const dist_folders = [[".", has_client_folder ? client_path : path.join(package_directory, "dist")]]; //  [output_folder: string, input_folder: string, types_folder?: string][] types_folder defaults to dist
  const server_input = path.join(package_directory, "dist", "server");
  const locales_input = path.join(package_directory, "locales");
  if (await dir_exists(server_input)) {
    dist_folders.push(["server", server_input]);
  }
  if ((await dir_exists(locales_input)) && transform_locales) {
    dist_folders.push(["locales", locales_input, "locales"]);
  }
  const folders_to_rm = new Set();
  const files_to_rm = new Set();
  const typedefs_files_created = new Set();

  await Promise.all(
    dist_folders.map(async ([output_name, input_path, types_folder = "dist"]) => {
      const destination_path = path.join(package_directory, output_name);
      await ensure_directory(destination_path);
      const files = await fs.readdir(input_path);
      const are_folders = await Promise.all(
        files.map(async file => (await fs.stat(path.join(input_path, file))).isDirectory())
      );
      const folders = files.filter((_, i) => are_folders[i]);

      await Promise.all(
        folders.map(async folder => {
          const [type, es_part] = folder.split("_");
          const src_dir = path.join(input_path, folder);
          const file = path.join(src_dir, "index.js");
          if (!es_part) {
            // Probably a file that shouldn't be there, ignore it
            return;
          }
          const es_version = es_part === "latest" ? es_part : es_part.toUpperCase();
          const es_folder = path.join(destination_path, es_version);
          const types_input_file = path.join(package_directory, types_folder, "index.d.ts");
          const types_output_file = path.join(es_folder, "index.d.ts");
          let types_rewrite;

          await ensure_directory(es_folder);

          if (!typedefs_files_created.has(types_output_file)) {
            typedefs_files_created.add(types_output_file);
            types_rewrite = transformFile({
              oldFilePath: types_input_file,
              newFilePath: types_output_file,
              esVersion: es_version,
              dts: true,
            });
          }

          files_to_rm.add(types_input_file);
          folders_to_rm.add(src_dir);

          await transformFile({
            oldFilePath: file,
            newFilePath: path.join(es_folder, `index.${type.endsWith("module") ? "js" : "cjs"}`),
            esVersion: es_version,
          });
          await types_rewrite;
        })
      );

      folders_to_rm.add(input_path);
    })
  );

  folders_to_rm.add(path.join(package_directory, "dist"));

  for (const [ending, esmodule] of [
    ["cjs", false],
    ["mjs", true],
  ]) {
    const target = path.join(package_directory, `multi_import_deduplicator.${ending}`);
    await fs.writeFile(target, get_import_deduplicator(esmodule), {
      encoding: "utf-8",
    });
  }

  for (const file of files_to_rm) {
    await fs.unlink(file);
  }
  for (const folder of folders_to_rm) {
    await rmdir(folder);
  }
})();

async function ensure_directory(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function isEmptyDirectory(dir) {
  const files = await fs.readdir(dir);
  return files.length === 0 || (files.length === 1 && files[0] === ".DS_Store");
}

async function transformFile(workerData /*: {oldFilePath, newFilePath, esVersion, dts}*/) {
  await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "rewrite_imports_worker.cjs"), {
      workerData,
    });

    worker.on("message", msg => {
      if (msg.status === "done") resolve();
      if (msg.status === "error") reject(new Error(msg.error));
    });

    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
  console.log("Finished transforming", workerData.newFilePath);
}

async function rmdir(dir) {
  if (await isEmptyDirectory(dir)) {
    await removeDSStoreIfPresent(dir);
    await fs.rmdir(dir);
  }
}

async function removeDSStoreIfPresent(dir) {
  const dsStorePath = path.join(dir, ".DS_Store");
  await fs.unlink(dsStorePath).catch(err => {
    if (err.code !== "ENOENT") {
      throw err;
    }
  });
}

async function dir_exists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

function get_import_deduplicator(esmodule) {
  return `/**
 * To prevent that people accidentally import multiple flavours of the same type (i.e. @depict-ai/utilishared/latest and @depict-ai/utilishared/ES7) we have this module which needs to not be transformed by babel or bundled by parcel and therefore has to support ES5
 */
var versions_imported = [];

function register_es_version(package_name, es_version) {
  package_name = "@depict-ai/" + package_name;
  var already_imported = [];
  for (var i = 0; i < versions_imported.length; i++) {
    already_imported.push(package_name + "/" + versions_imported[i]);
  }
  var has_this_version = versions_imported.indexOf(es_version) !== -1;
  if (!has_this_version) {
    versions_imported.push(es_version);
  }
  if (versions_imported.length > 1) {
    throw new Error(
      "You're trying to import multiple transpiled versions of " +
        package_name +
        "! Already imported: " +
        already_imported.join(", ") +
        " and you're trying to import " +
        package_name +
        "/" +
        es_version +
        " or a dependant thereof"
    );
  }
}

${esmodule ? "export { register_es_version };" : "module.exports = { register_es_version };"}
`;
}
