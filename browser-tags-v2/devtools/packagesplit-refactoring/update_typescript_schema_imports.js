const { readdir, readFile, writeFile } = require("fs").promises;
const { relative } = require("path");

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
      const lines = contents.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("api_schema")) {
          const [, circa_path] = line.split("from");
          const path = circa_path?.length ? circa_path.split('"')[1] : line; // whole file imports
          if (!path) {
            console.log(line);
          }
          const stuff = ts_file.split("/");
          stuff.splice(-1);
          const path_used = stuff.join("/");
          console.log(path_used);
          lines[i] = line.replace(
            path,
            relative(
              path_used,
              "/Users/daniel/Documents/depict.ai/browser-tags-v2/packages/ui/src/typescript_schema/" +
                path.split("/").pop()
            )
          );
          // // console.log(lines[i]);
        }
      }
      await writeFile(ts_file, lines.join("\n"), { encoding: "utf-8" });
    })
  );
})();
