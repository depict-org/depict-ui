const { readdir, readFile, writeFile } = require("fs").promises;

// Source: https://www.webmound.com/nodejs-get-files-in-directories-recursively/
const getFileList = async dirName => {
  let files = [];
  const items = await readdir(dirName, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
    } else {
      files.push(`${dirName}/${item.name}`);
    }
  }

  return files;
};

(async () => {
  const files = await getFileList(".");
  const ts_files = files.filter(
    file => (file.endsWith(".ts") || file.endsWith(".tsx")) && file !== "./index.ts" && file.includes("icons/")
  );
  // await Promise.all(
  //   ts_files.map(async ts_file => {
  //     if (ts_file.includes(".yarn") || ts_file.includes("dist/")) {
  //       return;
  //     }
  //     const contents = await readFile(ts_file, "utf-8");
  //     const lines = contents.split("\n");
  //     for (let i = 0; i < lines.length; i++) {
  //       const line = lines[i];
  //       if (line.includes("import") && line.includes("@depict-ai")) {
  //         const [, circa_path] = line.split("from");
  //         const path = circa_path?.length ? circa_path.split('"')[1] : line; // whole file imports
  //         const [first, second] = path.split("/");
  //         const new_path = [first, second].join("/");
  //         lines[i] = line.replace(path, new_path);
  //       }
  //     }
  //     await writeFile(ts_file, lines.join("\n"), { encoding: "utf-8" });
  //   })
  // );

  for (const ts_file of ts_files) {
    const split = ts_file.split(".");
    split.splice(-1);
    const name_without_extension = split.join(".");
    process.stdout.write(`export * from "${name_without_extension}";\n`);
  }
})();
