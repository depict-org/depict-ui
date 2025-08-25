// Using `import "bundle-text:./foo/bar.whatever" with parcel causes the file
// to be imported as plain text. This declaration adds typechecking for this.
declare module "bundle-text:*" {
  const text: string;
  export = text;
}

// Parcel has a feature where it takes environment variables and puts them in `process.env.<envname>`
// (details: https://parceljs.org/features/node-emulation/)
// here are typings for the variables that you can expect find while building.
declare namespace NodeJS {
  type ConsentFramework = "cookiebot" | "optanon";
  type ConsentLevel = "marketing" | "necessary" | "preferences" | "statistics";

  interface ProcessEnv {
    /** base URL of the API, defaults to `https://api.depict.ai`. Use if testing against a different api */
    readonly BASE_URL: string;

    readonly DEBUG: "true" | "false";

    readonly BUILD_TARGET: "ie11" | "modern" | "node" | "dev";

    /** whether to disable gtag view tracking at build time - functions will be removed from bundle */
    readonly GTAG_VIEW: "true" | "false";

    /** whether to disable all GTAG tracking at build time - functions will be removed from bundle */
    readonly GTAG: "true" | "false";

    /** whether to disable all GA and GTAG tracking at build time - functions will be removed from bundle */
    readonly GA: "true" | "false";

    /** whether to disable all depict tracking at build time - functions will be removed from bundle */
    readonly DEPICT: "true" | "false";

    /** sentry sample rate - a float as string, value between 0 and 1 */
    readonly SENTRY_SAMPLE_RATE: string;

    /** the folder the script's main.ts was when it was built */
    readonly TENANT: string;

    /** Which framework to read consent data from */
    readonly CONSENT_FRAMEWORK: ConsentFramework;

    /** For OneTrust Optanon integrations. Comma separated list of keys for consent levels: Necessary, Statistics, Preferences, Marketing */
    readonly OPTANON_KEYS: string;

    /** what level of consent is needed to load the gtag.js script */
    readonly GTAG_LOADING_CONSENT_LEVEL: ConsentLevel;

    /** what level of consent is required to send events to gtag */
    readonly GTAG_EVENT_CONSENT_LEVEL: ConsentLevel;

    /** what level of consent is required to send depict tracking with dsid/user_id */
    readonly DEPICT_TRACKING_CONSENT_LEVEL: ConsentLevel;
  }
}

// NOTE: Use `bundle-text` [details](https://parceljs.org/features/bundle-inlining/#inlining-a-bundle-as-text)
// instead of `fs.readFileSync`, unless bundling svg's, or something else where you want to make sure that an
// asset is bundled without ANY transformations whatsoevere.
//
// Parcel has a a feature where `fs.readFileSync` can be used to load file contents.
// The call to `readFileSync` is inlined to the file contents at bundle-time.
// Details: https://parceljs.org/features/node-emulation/#inlining-fs.readfilesync
declare module "fs" {
  // setting encoding to "utf-8" ensures that no processing is done to the asset (we think).
  // Therefore we make it a type error to not do this.
  function readFileSync(path: string, encoding: "utf-8"): string;
}
