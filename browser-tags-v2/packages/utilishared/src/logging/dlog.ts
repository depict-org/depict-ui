import { is_debug } from "./is_debug";

const browser_prefix_styling = "color: #fff;";
let browser_prefix = "[Depict]";

/**
 * Sets the prefix of dlog, dwarn, and derror messages in the browser console. Defaults to `[Depict]`.
 */
export const set_browser_prefix = str => {
  browser_prefix = str;
};

function decorated_log(console_command: typeof console.log, ...args: any[]) {
  if (is_debug) {
    console_command(
      ...(process.env.BUILD_TARGET === "node"
        ? [new Date().toISOString()]
        : [`%c${browser_prefix}`, browser_prefix_styling]),
      ...args
    );
  }
}

export function dlog(...args: any[]) {
  /* eslint-disable no-console */
  decorated_log(console.log.bind(console), ...args);
}

export function dwarn(...args: any[]) {
  /* eslint-disable no-console */
  decorated_log(console.warn.bind(console), ...args);
}

export function derror(...args: any[]) {
  /* eslint-disable no-console */
  decorated_log(console.error.bind(console), ...args);
}
