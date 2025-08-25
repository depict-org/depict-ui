let script: string | undefined;
let is_modern = false;
let containerOfSetItem: Storage;

const cache_key_prefix = "DEPICT";
const setItemStr = "setItem";
const cache_key_random_part = "CACHE_KEY_REPLACEME"; // this is replaced with actual cache key by shopify
const script_cache_key = cache_key_prefix + `J_` + cache_key_random_part;
const session_storage = sessionStorage;
const local_storage = localStorage;
const xhr_request = new XMLHttpRequest();
const execute_script = () => {
  // provide cache key to script so it can clean up all others
  // also provide style directly in execute_script as opposed to reading it in the script in case localStorage was blocked
  new Function("cache_key", "context_obj", script!)(cache_key_random_part, {
    PUT: "context",
    HERE: "please",
  });
};

try {
  is_modern = !!String.prototype.at?.toString().includes("[native code]"); // if the is modern check fails (which it never should) localStorage cache won't be used, but this way we get some safety without an extra try/catch
  // localStorage can be blocked
  script = local_storage[script_cache_key];
} catch (e) {}

xhr_request.addEventListener("load", () => {
  const fresh_script = xhr_request.responseText;
  // Cache script in localStorage since it apparently takes AGES for firefox to load it from the cache and execute when doing the XHR thing and we want fastest script loading in every browser (faster than defer and async)
  if (!script) {
    // Didn't execute already because we lacked script, so do it now
    script = fresh_script;
    execute_script();
  }
  try {
    local_storage[script_cache_key] = fresh_script;
  } catch (e) {}
});
xhr_request.open("GET", "SHOPIFY_URL&modern=" + is_modern);
xhr_request.send(); // still make request even if we already have a cached script because otherwise there will be a warning in devtools if the preload is unused

if (script) {
  execute_script();
}

// intentionally load script first since if dpq initialisation fails or sessionStorage replacing fails we maybe can fix these cases from our script that still should load
window.dpq ||= create_global_event_queue();

if (session_storage.hasOwnProperty(setItemStr)) {
  // We're running something other than firefox (see below) and someone has already overridden sessionStorage.setItem
  containerOfSetItem = session_storage;
} else {
  // Firefox disallows changing sessionStorage.setItem
  // For firefox, or chrome where no-one has overridden sessionStorage.setItem yet, override it in the prototype
  containerOfSetItem = Storage.prototype;
}
containerOfSetItem[setItemStr] = new Proxy(containerOfSetItem[setItemStr], {
  apply(target, thisArg, argList) {
    const key = argList?.[0];
    if (key != "depict") {
      return Reflect.apply(target, thisArg, argList);
    }
    const value = argList[1];
    dpq(value.name, value.data);
  },
});

function create_global_event_queue() {
  const fn = function () {
    const args = arguments;
    if (fn.send_event) {
      fn.send_event.apply(this, args);
    } else {
      fn.queue.push(args);
    }
  };
  fn.queue = [];
  return fn;
}
