const fs = require("fs").promises;
const babel = require("@babel/core");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const path = require("path");
const { parentPort, workerData } = require("worker_threads");

// Mostly kudos to chatGPT
// See https://gitlab.com/depict-ai/depict.ai/-/merge_requests/7775#build-system-changes for some documentation

transformFile(workerData)
  .then(() => {
    parentPort.postMessage({ status: "done" });
  })
  .catch(error => {
    parentPort.postMessage({ status: "error", error: error.message });
  });

async function transformFile(data) {
  const { oldFilePath, newFilePath, esVersion, dts = false } = data;
  const code = await fs.readFile(oldFilePath, "utf-8");

  const filename = path.basename(oldFilePath);

  const split_path = oldFilePath.split("/");
  let package_name = split_path[split_path.indexOf("packages") + 1];
  if (split_path[split_path.indexOf("packages") + 2] === "locales") {
    package_name += "/locales";
  }

  const ast = await babel.parseAsync(code, {
    sourceType: "module",
    plugins: [["@babel/plugin-transform-typescript", { dts }]],
    filename,
    babelrc: false, // Ignore .babelrc and .babelrc.js
    configFile: false, // Ignore babel.config.js
  });

  traverse(ast, {
    ImportDeclaration({ node: { source } }) {
      // transform import statements to import form the correct esVersion
      if (source && source.value.startsWith("@depict-ai") && !source.value.startsWith("@depict-ai/types")) {
        // don't rewrite @depict-ai/types imports
        source.value = transformImport(source.value, esVersion);
      }
    },
    CallExpression({ node }) {
      // transform require statements to import form the correct esVersion
      const { arguments } = node;
      if (
        t.isIdentifier(node.callee, { name: "require" }) &&
        arguments &&
        arguments.length > 0 &&
        t.isStringLiteral(arguments[0]) &&
        arguments[0].value.startsWith("@depict-ai") &&
        !arguments[0].value.startsWith("@depict-ai/types")
      ) {
        arguments[0].value = transformImport(arguments[0].value, esVersion);
      }

      // Work around https://github.com/parcel-bundler/parcel/issues/8676
      const callee = node.callee;
      if (!newFilePath.endsWith(".cjs")) {
        //  Sometimes parcel doesn't have an export with the export expression, so I've commented below optimisation out for now
        // Ideally we'd just replace them with export statements
        // Edit again: seems like 5d19d88c696693605d6ed35dc734dbcd0e9a1ce2 was the actual issue, so I've re-enabled this
        if (t.isIdentifier(callee, { name: "$parcel$export" })) {
          const pureComment = {
            type: "CommentBlock",
            value: "@__PURE__",
          };

          (node.leadingComments ||= []).push(pureComment);
        }
      }

      // Check if the call expression matches the structure (0, FUNCTION)(...)
      if (
        t.isSequenceExpression(callee) &&
        callee.expressions.length === 2 &&
        t.isNumericLiteral(callee.expressions[0], { value: 0 })
      ) {
        // Replace the call expression with the second part of the sequence
        // Basically we undo parcel's wrapping of function calls into (0, FUNCTION)(...) because none of our functions gets the wrong this value by that, but it introduces a lot of bugs with tree-shaking
        node.callee = callee.expressions[1];
      }
    },
    ClassDeclaration(path) {
      // Some tool adds an erroneous #private property to the DPC type declarations which makes typescript hickup since it's literally impossible to ignore the output .d.ts file, this removes that
      /*
        export class DPC {
          #private;
          merchant: string;
          auto_observe: boolean;
          market?: string;
          latest_product_id?: string;
        }
       */
      if (path.node.id?.name === "DPC") {
        path.traverse({
          ClassPrivateProperty(innerPath) {
            if (innerPath.node.key.id.name === "private" && !innerPath.node.value) {
              innerPath.remove();
            }
          },
        });
      }
    },
    // Add import deduplicator so people don't accidentally import multiple es-versions of the same package
    ...(dts
      ? {}
      : {
          Program: {
            enter(path) {
              let lastImportOrRequireIndex = -1;

              // Determine if this is a CommonJS module by looking for require calls
              let isCommonJS = false;
              path.traverse({
                CallExpression(callPath) {
                  if (t.isIdentifier(callPath.node.callee, { name: "require" })) {
                    isCommonJS = true;
                    callPath.stop();
                  }
                },
              });

              if (newFilePath.endsWith(".cjs")) isCommonJS = true; // locales don't have any imports so can't tell otherwise

              // Find the index of the last import/require declaration
              path.node.body.some((node, index) => {
                if (
                  t.isImportDeclaration(node) ||
                  (t.isVariableDeclaration(node) &&
                    node.declarations.some(
                      decl => t.isCallExpression(decl.init) && t.isIdentifier(decl.init.callee, { name: "require" })
                    ))
                ) {
                  lastImportOrRequireIndex = index;
                  return false;
                }
                return true;
              });

              if (isCommonJS) {
                // Create the function call for CommonJS without using "const"
                const registerCall = t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.callExpression(t.identifier("require"), [
                        t.stringLiteral(
                          getRelativePathFromPackagesForImportDeduplicator(newFilePath) +
                            "multi_import_deduplicator.cjs"
                        ),
                      ]),
                      t.identifier("register_es_version")
                    ),
                    [t.stringLiteral(package_name), t.stringLiteral(esVersion)]
                  )
                );

                // Insert the function call after the last import/require
                path.node.body.splice(lastImportOrRequireIndex + 1, 0, registerCall);
              } else {
                // Create the import for ES6
                const deduplicatorImport = t.importDeclaration(
                  [t.importSpecifier(t.identifier("register_es_version"), t.identifier("register_es_version"))],
                  t.stringLiteral(
                    getRelativePathFromPackagesForImportDeduplicator(newFilePath) + "multi_import_deduplicator.mjs"
                  )
                );

                // Insert the import after the last import/require
                path.node.body.splice(lastImportOrRequireIndex + 1, 0, deduplicatorImport);

                // Create the function call for ES6
                const registerCall = t.expressionStatement(
                  t.callExpression(t.identifier("register_es_version"), [
                    t.stringLiteral(package_name),
                    t.stringLiteral(esVersion),
                  ])
                );

                // Insert the function call after the import
                path.node.body.splice(lastImportOrRequireIndex + 2, 0, registerCall);
              }
            },
          },
        }),
  });

  const { code: output } = await babel.transformFromAstAsync(ast, code, {
    filename,
    babelrc: false, // Ignore .babelrc and .babelrc.js
    configFile: false, // Ignore babel.config.js
    compact: false,
  });
  await fs.writeFile(newFilePath, output);
  if (!dts) {
    // don't delete original index.d.ts file since we re-use that
    await fs.unlink(oldFilePath);
  }
}

function transformImport(source, esVersion) {
  const splitImport = source.split("/");
  const endOfSource = splitImport.pop();
  if (endOfSource === "latest" || endOfSource === "ES10") {
    // If someone accidentally imports for example @depict-ai/utilishared from the @depict-ai/ui source code, we want to make sure that it's still imported from the correct esVersion
    splitImport.push(esVersion);
  } else {
    splitImport.push(endOfSource, esVersion);
  }
  return splitImport.join("/");
}

function getRelativePathFromPackagesForImportDeduplicator(inputPath) {
  // Kudos to gpt
  const absolutePath = path.resolve(inputPath);
  // Split the input path
  const parts = absolutePath.split("/");
  // Remove "/dist" from the path since some files get moved after this transform step (i.e. react-ui)
  const distIndex = parts.indexOf("dist");
  if (distIndex !== -1) {
    parts.splice(distIndex, 1);
  }

  // Find the index of 'packages'
  const packageIndex = parts.indexOf("packages");

  // If "packages" is not found, return an error or handle accordingly
  if (packageIndex === -1) {
    throw new Error('The provided path does not contain "packages". ' + absolutePath);
  }

  // Calculate the number of directories to move back from
  const stepsBack = parts.length - packageIndex - 3; // Subtracting 2 to account for the "packages" directory and the file itself

  return "../".repeat(stepsBack);
}
