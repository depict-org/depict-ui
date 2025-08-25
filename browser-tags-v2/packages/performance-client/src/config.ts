import { derror, dlog } from "@depict-ai/utilishared";

const src = new URL((document.currentScript as HTMLScriptElement)?.src);
interface Config {
  merchant: string;
  market: string;
  auto_observe: boolean;
  auto_init: boolean;
  consent_provider: "cookiebot" | "optanon" | undefined;
}
const config = {} as Config; // options will not be undefined after configValues is called.

const configValues = [
  {
    name: "merchant",
    localStorageKey: "depict_merchant",
    missingText: "Missing merchant query in script url.",
    type: String,
  },
  {
    name: "market",
    localStorageKey: "depict_market",
    missingText: "Missing market in script url",
    type: String,
  },
  {
    name: "auto_observe",
    localStorageKey: "depict_auto_observe",
    default: true,
    type: Boolean,
  },
  {
    name: "auto_init",
    localStorageKey: "depict_auto_init",
    default: true,
    type: Boolean,
  },
  {
    name: "consent_provider",
    localStorageKey: "depict_consent_provider",
    default: true,
    type: String,
  },
];

const stringToBoolean = (str: string) => {
  if (str === "false" || str === "0") return false;
  else return Boolean(str);
};

configValues.forEach(({ name, localStorageKey, missingText, default: defaultValue, type }) => {
  // Todo: Advanced validation with error message?
  if (localStorage[localStorageKey]) {
    config[name] = type === String ? localStorage[localStorageKey] : stringToBoolean(localStorage[localStorageKey]);
    dlog(`Using ${name} from '${localStorageKey}' in localStorage`, config[name]);
  } else {
    config[name] = src.searchParams.get(name);
  }
  if (!config[name]) {
    if (!defaultValue) {
      derror(missingText);
    } else {
      config[name] = defaultValue;
    }
  }
});

export default config;
