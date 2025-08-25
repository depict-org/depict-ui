import { constants, promises as fs } from "fs";
import path from "path";

/**
 * if you run this, the frontend integrations will now run against the uncompiled SDK source code so there's hot reloading for SDK changes (don't have to build after making changes the whole time)
 * revert with `yarn dangerous-revert-bypass-package-compilation` (might delete other changes too, check what the command does and be careful)
 */

try {
  const packagesDir = path.join(process.cwd(), "packages");
  const dirs = await fs.readdir(packagesDir);

  await Promise.all([
    ...dirs.map(async dir => {
      const stats = await fs.stat(path.join(packagesDir, dir));
      if (!stats.isDirectory()) return;
      const packagePath = path.join(packagesDir, dir, "package.json");

      try {
        // if there's a dir/latest/index.d.ts file replace the contents with `export * from "./src/index";`
        const latestIndexDTSPath = path.join(packagesDir, dir, "latest", "index.d.ts");
        if (await fileExists(latestIndexDTSPath)) {
          await fs.writeFile(latestIndexDTSPath, `export * from "../src/index";`);
        }

        const ES10IndexDTSPath = path.join(packagesDir, dir, "ES10", "index.d.ts");
        if (await fileExists(ES10IndexDTSPath)) {
          await fs.writeFile(ES10IndexDTSPath, `export * from "../src/index";`);
        }

        const latestLocalesIndexDTSPath = path.join(packagesDir, dir, "locales", "latest", "index.d.ts");
        if (await fileExists(latestLocalesIndexDTSPath)) {
          await fs.writeFile(latestLocalesIndexDTSPath, `export * from "../../src/locales/index";`);
        }

        const stats = await fs.stat(packagePath);
        if (!stats.isFile()) return;

        const packageData = JSON.parse(await fs.readFile(packagePath, "utf8"));

        if (packageData.exports) {
          for (const key in packageData.exports) {
            let targetFileName = "./src/index.ts";
            const isUI = dir === "ui";
            const oldValue = packageData.exports[key];
            const transformObject = value =>
              Object.assign(
                Object.fromEntries(
                  Object.entries(value)
                    .filter(([key]) => key !== "require")
                    .map(([key, item]) => [key, typeof item === "object" && item ? transformObject(item) : item])
                ),
                {
                  import: targetFileName,
                }
              );

            if (typeof oldValue === "string") continue; // Skip styles and stuff with a string value
            if (key.includes("locales")) {
              if (!isUI) continue; // Skip locale files that just re-export already
              targetFileName = "./src/locales/index.ts"; // Update locales exports to the locales source file in ui
            }
            packageData.exports[key] = transformObject(oldValue);
          }
          await fs.writeFile(packagePath, JSON.stringify(packageData, null, 2));
        }
      } catch (error) {
        // If package.json does not exist or other errors occur, skip this folder
        console.error(`Error processing ${packagePath}:`, error.message);
      }
    }),
    (async () => {
      const oldBabelFile = await fs.readFile(path.join(process.cwd(), "babel.config.js"), "utf8");
      const lines = oldBabelFile.split("\n");
      const newLines = lines.map(line =>
        line.includes("const should_use_solids_jsx_runtime") ? "const should_use_solids_jsx_runtime = true;" : line
      );
      await fs.writeFile(path.join(process.cwd(), "babel.config.js"), newLines.join("\n"));
    })(),
  ]);
} catch (error) {
  console.error("Failed to update package exports:", error.message);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
