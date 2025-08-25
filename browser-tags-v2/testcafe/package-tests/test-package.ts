import { ChildProcess, spawn } from "child_process";
import tree_kill from "tree-kill";
import { desktopSizes, mobileSizes, storefronts } from "./config";

const { IN_DOCKER, YRN_PATH } = process.env;

if (!YRN_PATH) {
  console.log("YRN_PATH is required in env. (run 'which yarn')");
  process.exit(1);
}

const chrome = IN_DOCKER == "true" ? "chromium:headless" : "chrome";
const firefox = IN_DOCKER == "true" ? "firefox:headless" : "firefox";
// This works, the :emulation:width=x;height=y approach from the documentation doesn't (???)
const desktop_chrome = `'${chrome} --window-size=${desktopSizes.width},${desktopSizes.height}'`;
const phone_chrome = `'${chrome} --window-size=${mobileSizes.width},${mobileSizes.height}'`;

// eslint-disable-next-line no-control-regex
const stripColors = (str: string) => str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
const isNotWhiteSpace = (str: string) => /\S/.test(str);

const running_children: ChildProcess[] = [];
const passed: string[] = [];
const failed: string[] = [];

async function runStoreFrontTest(storeName: string) {
  const store = storefronts[storeName];
  if (!store) {
    console.error(`Store '${storeName}' not found in storefronts.`);
    process.exit(1);
  }

  const cwd = `../../../storefronts/${storeName}/${store.launch_cwd || ""}`;

  console.log(`Starting storefront server with "${store.launch_command.join(" ")}" at ${cwd}`);
  const server = spawn(store.launch_command[0], store.launch_command.slice(1), {
    cwd,
    env: {
      ...process.env,
      INIT_CWD: "",
      PROJECT_CWD: "",
      npm_execpath: "",
      npm_package_json: "",
      npm_config_user_agent: "",
      NODE_OPTIONS: "",
    },
  });
  running_children.push(server);

  const server_ready = new Promise<void>(r => {
    const interceptOutput = (outStream: NodeJS.WriteStream, name: string) => chunk => {
      outStream.write(`Server ${name}: `);
      outStream.write(chunk);

      if (chunk && typeof chunk === "string" && isNotWhiteSpace(chunk)) {
        const message = stripColors(chunk);
        if (
          /Ready in \d+ms/.test(message) ||
          message.startsWith("ready -") ||
          message.startsWith("Server running") ||
          message.includes("Hit CTRL-C to stop the server") ||
          message.includes("ready started server on")
        ) {
          r();
        }
      }
    };

    server.stdout?.setEncoding("utf8");
    server.stdout?.on("data", interceptOutput(process.stdout, "stdout"));

    server.stderr?.setEncoding("utf8");
    server.stderr?.on("data", interceptOutput(process.stderr, "stderr"));
  });

  const server_closed = new Promise<void>((resolve, reject) => {
    server.on("close", code => {
      console.log(`${storeName} server closing with code: ${code}`);
      if (code === 0 || code === null) return resolve();
      reject(code);
    });
  });

  await server_ready;
  console.log("Storefront server ready!");

  const browsers = [desktop_chrome, phone_chrome];

  let result: boolean;

  for (const browser of browsers) {
    let retries_left = storeName === "next-commerce" ? 3 : 0;
    do {
      const code = await new Promise<number | null>(r => {
        const args = ["testcafe", browser, "plp-ui.ts"];
        if (true) {
          args.push("--native-automation");
        }

        const testProcess = spawn("yarn", args, {
          env: { ...process.env, store_path: storeName },
          stdio: "inherit",
        });
        running_children.push(testProcess);

        testProcess.on("close", code => r(code));
      });
      result = !code;
      if (code === 1 && storeName === "next-commerce") {
        console.log(
          "test process closed with code",
          code,
          "and it's next-commerce so this might be the ECONNREFUSED error, trying again ",
          retries_left,
          "times"
        );
      } else {
        console.log("test process closed with code", code);
        break;
      }
    } while (retries_left--);

    (result ? passed : failed).push(`${storeName} in ${browser}`);

    if (!result) {
      console.log("Test failed skipping other browsers...");
      break;
    }
  }

  tree_kill(server.pid!);
  await server_closed;
  console.log("Storefront server killed.");
}

async function main() {
  if (process.argv.length < 3) {
    console.error(
      "Please provide the name of the store as a command-line argument. If you want to run all tests, use 'test_all'."
    );
    process.exit(1);
  }

  const storeName = process.argv[2];
  if (storeName === "test_all") {
    for (const store of Object.keys(storefronts)) {
      await runStoreFrontTest(store);
    }
    return;
  }

  await runStoreFrontTest(storeName);
}

main()
  .then(() => {
    console.log("\n------- TESTS COMPLETE -------\n");
    if (passed.length) {
      console.log("Passed:");
      passed.forEach(p => console.log(p));
      console.log("\n");
    }

    if (failed.length) {
      process.exitCode = 1;

      console.log("Failed:");
      failed.forEach(f => console.log(f));
    }
  })
  .catch(err => {
    console.error("Unknown error in test_all:");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const c of running_children) {
      if (!c.pid) {
        continue;
      }
      tree_kill(c.pid);
    }
  });
