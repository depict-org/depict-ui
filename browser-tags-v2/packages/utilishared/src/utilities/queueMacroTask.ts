import { catchify } from "../logging/error";

/**
 * Queues a task in the event queue without a timeout like setTimeout does, see https://www.youtube.com/watch?v=cCOL7MC4Pl0
 * @param callback callback function that gets queued as a task
 */
export function queueMacroTask(callback: VoidFunction) {
  // https://stackoverflow.com/a/61574326
  const channel = new MessageChannel();
  channel.port1.onmessage = catchify(callback);
  channel.port2.postMessage("");
}
