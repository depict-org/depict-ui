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
  const ts_files = files.filter(file => (file.endsWith(".ts") || file.endsWith(".tsx")) && file !== "./index.ts");
  await Promise.all(
    ts_files.map(async ts_file => {
      if (ts_file.includes(".yarn") || ts_file.includes("dist/")) {
        return;
      }
      const contents = await readFile(ts_file, "utf-8");
      const lines = new Map(contents.split("\n").map((value, index) => [index, value]));
      for (let i = 0; i < lines.size; i++) {
        const line = lines.get(i);
        if (line.includes("import") && line.includes("@depict-ai")) {
          lines.delete(i);
        }
      }
      await writeFile(ts_file, [...lines.values()].join("\n"), { encoding: "utf-8" });
    })
  );
})();
