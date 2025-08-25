import { base_url } from "../constants";

export function make_tracker_send_to_depict(ga_tracker: any, append_to_url?: string) {
  if (!ga_tracker) {
    return;
  }
  // Docs for analytics.js Tasks:
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/tasks
  const sendHitTask = "sendHitTask";
  const originalSendHitTask = ga_tracker.get(sendHitTask);
  ga_tracker.set(sendHitTask, model => {
    originalSendHitTask(model);
    // console.log('Sent original hit, now sending to depict');

    try {
      const payLoad = model.get("hitPayload");
      const path = base_url + "/collect-ga";
      let url = path + "?" + payLoad;
      if (append_to_url) {
        url += append_to_url;
      }
      const n = navigator;
      const sb = "sendBeacon";
      if (n[sb]) {
        // this is actually smaller, I tested
        n[sb](url);
      } else {
        const xhttp = new XMLHttpRequest();
        xhttp.open("GET", url);
        xhttp.send();
      }
    } catch (e) {
      // console.log('Could not send beacon to /collect-ga', e);
    }
  });
}
export function create_ga_queue() {
  // Snippet to load GA async
  const w = window as any;
  // @ts-ignore
  w.ga ||= function () {
    (w.ga.q ||= []).push(arguments);
  };
  w.ga.l = +new Date();
}
