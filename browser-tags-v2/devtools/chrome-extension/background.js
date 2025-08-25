const filter = {
  urls: [
    "https://static-scripts-deploy.s3.eu-north-1.amazonaws.com/*/depict-ai.js*",
    "https://cdn.depict.ai/*/depict-ai.js*",
    "https://cdn.depict.ai/*/modern.js*",
    "https://cdn.depict.ai/*/compatibility.js*",
  ],
};
const cancel = reqDetails => {
  if (reqDetails.url.includes("lazy_sentry")) {
    console.log("Allowing request to lazy_sentry");
    return { cancel: false };
  }
  console.log("Blocked depict request to: " + reqDetails.url);
  return { cancel: true }; // block it
};
chrome.webRequest.onBeforeRequest.addListener(cancel, filter, ["blocking"]);
