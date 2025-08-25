import {
  BrowserClient as SentryBrowserClient,
  defaultIntegrations as SentryDefaultIntegrations,
  Hub as HubClass,
} from "@sentry/browser";

import { BrowserOptions } from "@sentry/browser/types/client";
import { is_available_in } from "../utilities/variable_waiter";

let overrideEnvironment: string | undefined;

export const setOverrideSentryEnvironment = (env: string) => (overrideEnvironment = env);

/**
 * This is a very complicated thing. It basically sets up a lazy sentry instance and returns it. This instance is like a normal sentry instance (`Hub`) except that everything on it will return a promise - calling a function? Returns promise. Getting the value of a variable? Returns promise. Trying to serialize it? Returns promise and infinity loops you. (DON'T LOG THIS OBJECT TO THE CONSOLE OR OTHER SENTRY INSTANCES MIGHT INFINITY LOOP)
 * Apart from that it's very nice.
 * It will first fetch, execute and setup sentry when something on the lazy object is called. (This was also the inspiration for some lazy feature in the backend BTW and I got the original idea from Isak Bakken).
 * The sentry that it fetches per default is from https://cdn.depict.ai/lazy_sentry/depict-ai.js
 * It proxies the object so that everything should work just as on the normal sentry Hub (with changed return type), HOWEVER, in IE11 and other browsers not natively supporting `Proxy` only keys in the `known_keys` list below will work.
 * @param  TENANT                     Which customer to tell sentry that the events originated from
 * @param  more_options               Constructor options to provide to sentry's `BrowserClient` constructor
 * @param  dlog                       A function to log to the console in case that something strange happens
 * @return              A lazy sentry instance
 */
export default function (
  TENANT: string,
  more_options?: object,
  dlog?: (...args) => void,
  extra_sentry_url?: string,
  script_integrity?: string
) {
  const sentry_object = {};

  if (process.env.BUILD_TARGET !== "modern" && Proxy.toString().indexOf("[native code]") === -1) {
    // Proxy polyfill needs defined things to work. If any other sentry function is desired to be used, please add it to the array below for ie11 compatibility
    const known_keys = [
      "isOlderThan",
      "bindClient",
      "pushScope",
      "popScope",
      "withScope",
      "getClient",
      "getScope",
      "getStack",
      "getStackTop",
      "captureException",
      "captureMessage",
      "captureEvent",
      "lastEventId",
      "addBreadcrumb",
      "setUser",
      "setTags",
      "setExtras",
      "setTag",
      "setExtra",
      "setContext",
      "configureScope",
      "run",
      "getIntegration",
      "startSpan",
      "startTransaction",
      "traceHeaders",
      "captureSession",
      "endSession",
      "startSession",
      "_sendSessionUpdate",
      "_invokeClient",
      "_callExtensionMethod",
      "_version",
      "_stack",
      "_lastEventId",
    ];
    known_keys.forEach(fn => (sentry_object[fn] = () => {}));
  }

  // the sentry "hub" we usually use only has functions - except for "_version", "_stack" and "_lastEventId"
  // for all these functions we will push the arguments to a stack which we go through once sentry has loaded
  // we will return a promise that resolves to the eventual result of the function result
  // meaning a fictional Sentry.returnsauce will return a promise that resolves to "sauce", given that sentry.returnsauce usually returns "sauce"
  // for the things that are not a function we will return a promise resolving to its value once sentry has loaded - sorry lazy loaded sentry users, you'll have to adapt your code to deal with it
  // i don't expect anyone ever having to do that tho because when's the last time you accessed Sentry._stack ???

  const not_functions = ["_version", "_stack", "_lastEventId"];

  const function_backlog = {
    // // example contents, do not uncomment:
    // "captureException": [
    //   {
    //     args: [new Error("example")],
    //     resolve: (retur_value: any) => undefined
    //   }],
  };

  const getter_backlog: [string | symbol, ((value: any) => void) | undefined][] = [];

  let actual_sentry;

  const sentry = new Proxy(sentry_object, {
    get(target, property) {
      if (property === "then") {
        // browsers do thenable checks by calling .then on any returned object of an awaited function, ignore it (probably not needed because proxy implementation should be robust enough maybe I'll remove it later)
        return;
      }

      let resolve_with_value: ((value: any) => void) | undefined;
      const value_promise = new Promise(r => (resolve_with_value = r));

      const property_as_string = property.toString();
      if (property_as_string.includes("Symbol")) {
        // if someone runs String(Sentry) they fail miserably without this check
        return target[property];
      } else if (not_functions.includes(property_as_string)) {
        getter_backlog.push([property, resolve_with_value]);
        process_calls();
        return value_promise;
      } else {
        return function (...args: any[]) {
          if (!Array.isArray(function_backlog[property])) {
            // this check needs to be like this so that functions of an object - i.e. toString get replaced
            function_backlog[property] = [];
          }
          const stack_for_fn = function_backlog[property];

          stack_for_fn.push({
            args,
            resolve: resolve_with_value,
          });
          process_calls();
          return value_promise;
        };
      }
    },
  });

  return sentry as HubClass;

  async function process_calls() {
    let sentry;

    /* eslint-disable no-console */
    const err = console.log.bind(console); // we can't feed errors from here into sentry - it might create an infinite loop
    dlog ||= process.env.DEBUG == "true" ? err : () => {};

    let attempt = 0;
    while (!(sentry = await actual_sentry)) {
      // retry if fails for some reason

      if (++attempt > 3) {
        // hopefully this code will never be reached but if loading fails thrice we do nothing and leave everthing how it was
        actual_sentry = false;
        return;
      }

      // we define it as promise so that not multiple functions load it when started at the same time
      actual_sentry = load_sentry(TENANT, more_options, extra_sentry_url, script_integrity).catch(err);
    }

    // we now for sure have sentry and can start processing the events
    // call functions and resolve results
    for (const fn in function_backlog) {
      const backlog_for_fn = function_backlog[fn];
      backlog_for_fn.forEach((backlog_obj, index) => {
        const { args, resolve } = backlog_obj;
        try {
          sentry.run((current_hub: HubClass) => {
            if (typeof current_hub[fn] == "function") {
              // quick hack to be able to get actual hub to make withScope work
              const bound_args = args.map(arg => {
                if (typeof arg == "function") {
                  return arg.bind(current_hub);
                } else {
                  return arg;
                }
              });

              resolve(current_hub[fn](...bound_args));
            } else {
              resolve(undefined);
            }
          });
        } catch (e) {
          err(e);
        }
        backlog_for_fn.splice(index, 1);
      });
    }

    getter_backlog.forEach((getter, index) => {
      const [property, resolve_with_value] = getter;
      resolve_with_value && resolve_with_value(sentry[property]);
      getter_backlog.splice(index, 1);
    });
  }
}

async function load_sentry(
  TENANT: string,
  more_options: Partial<BrowserOptions> = {},
  extra_sentry_url?: string,
  script_integrity?: string
) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  if (script_integrity) {
    script.integrity = script_integrity;
    script.setAttribute("crossorigin", "anonymous");
  }
  script.src = extra_sentry_url || "https://cdn.depict.ai/lazy_sentry/depict-ai.js";
  document.head.appendChild(script);

  const global_var_name = "_depict_ai_sentry";
  const { BrowserClient, Hub, defaultIntegrations } = (await is_available_in(window, global_var_name)) as {
    BrowserClient: typeof SentryBrowserClient;
    Hub: typeof HubClass;
    defaultIntegrations: typeof SentryDefaultIntegrations;
  };
  delete window[global_var_name];

  if (process.env.SENTRY_SAMPLE_RATE) {
    const sample_rate = parseFloat(process.env.SENTRY_SAMPLE_RATE);
    more_options.sampleRate ??= sample_rate;
  }

  const client = new BrowserClient({
    dsn: "https://1dd6c18a286b40a69dab1cdfe80bad9b@o464891.ingest.sentry.io/5476183",
    release: process.env.sentry_version,
    environment: overrideEnvironment || TENANT,
    // @ts-ignore - can't seem to get the typing to work
    integrations: defaultIntegrations,
    ...more_options,
  });

  const hub = new Hub(client);

  hub.bindClient(client); // WHAT ARE YOU DOING SENTRY, WHY IS THIS CALL + the hub.run EQUIRED FOR INTEGRATIONS TO WORK? It's way too hard to figure out

  // related issues:
  // https://github.com/getsentry/sentry-javascript/issues/2622
  // https://github.com/getsentry/sentry-javascript/issues/2541
  // https://github.com/getsentry/sentry-javascript/issues/2541

  return hub;
}
