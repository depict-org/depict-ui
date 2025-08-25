import { depict_body } from "./depict_transmission";
import { catchify, report } from "../logging/error";
import { rand } from "../utilities/rand";
import { dlog, dwarn } from "../logging/dlog";
import { infinite_promise_no_skip } from "../deprecated/infinite_promise_noskip";
import { deparallelize } from "../utilities/async_function_only_once";

type ws_event_callback = typeof WebSocket.prototype.onmessage;

export interface AutoReconnectingWS {
  onclose: ws_event_callback;
  onerrror: ws_event_callback;
  onmessage: ws_event_callback;
  onopen: ws_event_callback;
}

const ONE_MINUTE = 60000;

export class AutoReconnectingWS extends EventTarget {
  // WHEN MAKING CHANGES, PLEASE KEEP IN MIND THAT THIS CLASS IS ALSO USED ON THE FRONTEND
  current_socket: WebSocket;
  readonly #ws_constructor_options: ConstructorParameters<typeof WebSocket>;
  #possible_events = ["close", "error", "message", "open"] as const;
  #ons: Partial<{ [key in "close" | "error" | "message" | "open"]: ws_event_callback }> = {};
  restart_ws: (arg0?: any) => any;
  #try_again_in_ms = this.#initial_reconnect_delay;
  #fails = 0;
  #max_fails = 10;
  #max_backoff_ms = ONE_MINUTE;

  get #initial_reconnect_delay() {
    return rand(1, 1000);
  }

  #connect() {
    this.current_socket =
      typeof window === "object" || typeof WebSocket === "function"
        ? new WebSocket(...this.#ws_constructor_options)
        : ({ readyState: 0, addEventListener: () => {}, send: () => {} } as unknown as WebSocket);
    this.#possible_events.forEach(name => {
      this.current_socket.addEventListener(
        name,
        catchify(original_event => {
          let fixed_event: Event | CustomEvent;

          if (!(original_event instanceof Event)) {
            // Node - the WS class uses a predecessor of EventTarget and doesn't fire actual events, which we need for dispatchEvent since we're an EventTarget
            fixed_event = new Event(name);
            delete original_event["target"];
            delete original_event["type"];
            Object.assign(fixed_event, original_event);
            // @ts-ignore
            fixed_event.data ||= original_event.data;

            // original_event can either be an event from the 'ws' npm package which is some custom made event for something that extends EventEmitter or an actual Event
            // the event will only have `.data` if it's a message or close event, but wdgaf because setting undefined = undefined is still undefined
            // ts-ignore because it would be very hard to teach typescript the situation
          } else {
            try {
              // @ts-ignore
              fixed_event = new original_event.constructor(original_event.type, original_event); // modern browsers - clones an event as well as possible
            } catch (e) {
              // IE11 and the likes
              // dlog("Can't reconstruct event", e, original_event, "trying to make a CustomEvent instead");
              fixed_event = new CustomEvent(original_event.type, original_event);
              const intermediate = {};
              for (const key in original_event) {
                intermediate[key] = original_event[key]; // for some reason Object.assign doesn't work because things like MessageEvent.data are not enumarable
              }
              delete intermediate["target"];
              Object.assign(fixed_event, intermediate);
            }
          }
          this.dispatchEvent(fixed_event);
        })
      );
    });
  }

  #setup_dot_on_event_support() {
    // the idea is to make AutoReconnectingWS usable just like a normal WebSocket
    // so that you can do .onmessage or .addEventListener("message", handler) on an AutoReconnectingWS. It basically abstracts away connections that can close and die to one big EventTarget where you don't need to care about the underlying connection
    // this is how we add .onmessage, .onclose, .onopen and .onerror support to our EventTarget (this class)
    for (const ev of this.#possible_events) {
      Object.defineProperty(this, "on" + ev, {
        configurable: false,
        enumerable: true,
        get: () => this.#ons[ev],
        set: v => (this.#ons[ev] = v),
      });
      this.addEventListener(ev, e => {
        // e can be MessageEvent | CloseEvent | ErrorEvent I think
        const on_fn = this.#ons[ev];
        if (typeof on_fn === "function") {
          catchify(on_fn).call(ev, e);
        }
      });
    }
  }

  async #ensure_connection() {
    while (true) {
      const error: { [key: string]: any } | CloseEvent | ErrorEvent = await new Promise(resolve => {
        this.addEventListener("close", resolve);
        this.addEventListener("error", resolve);
        this.restart_ws = resolve;
      });
      this.removeEventListener("close", this.restart_ws);
      this.removeEventListener("error", this.restart_ws);

      // 4100 means server thinks this is a scraper bot that's ignoring robots.txt
      // @ts-ignore
      if (error?.code === 4100) {
        dlog("Websocket connection rejected by server, won't reconnect", error);
        return;
      }

      dlog(
        "Somehow the websocket died",
        error,
        "message:",
        // @ts-ignore
        error?.message,
        "code:",
        // @ts-ignore
        error?.code,
        "reason:",
        // @ts-ignore
        error?.reason,
        "reconnecting in",
        this.#try_again_in_ms
      );
      await new Promise<void>(r => {
        // "race" the timeout and getting an https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event by the browser
        const handler = catchify((ev: Event) => {
          r();
          dlog("Retrying due to 'online' event", ev);
          clearTimeout(timeout);
        });
        globalThis?.addEventListener?.("online", handler, { once: true });
        const timeout = setTimeout(
          catchify(() => {
            this.#try_again_in_ms *= 1.5 + Math.random();
            if (this.#try_again_in_ms > this.#max_backoff_ms) {
              this.#try_again_in_ms = this.#max_backoff_ms * (1 + Math.random() / 10);
            }
            r();
            globalThis?.removeEventListener?.("online", handler);
          }),
          this.#try_again_in_ms
        );
      });
      this.#connect();
    }
  }

  increase_fails() {
    this.#fails++;
    if (this.#fails > this.#max_fails) {
      this.restart_ws();
      this.#fails = 0;
    }
  }

  async send(...args: Parameters<typeof WebSocket.prototype.send>) {
    this.current_socket.send(...args);
  }

  constructor(url: string, protocols?: string | string[], options: { max_backoff_ms?: number } = {}) {
    super();

    this.#ws_constructor_options = [url, protocols];
    const { max_backoff_ms } = options;
    if (max_backoff_ms) {
      this.#max_backoff_ms = max_backoff_ms;
    }

    this.#setup_dot_on_event_support();
    this.#connect();
    this.#ensure_connection().catch(e => report(e, "error"));
    this.addEventListener(
      "open",
      catchify(() => {
        dlog("Connection opened");
        this.#try_again_in_ms = this.#initial_reconnect_delay; // reset exponential backoff
      })
    );
  }
}

export class DepictAPIWS extends AutoReconnectingWS {
  // WHEN MAKING CHANGES, PLEASE KEEP IN MIND THAT THIS CLASS IS ALSO USED ON THE FRONTEND
  #msg_ipns = new infinite_promise_no_skip<MessageEvent>();
  #initial_retry_ms = 5000;
  #connection_last_active = 0;
  #reconnect_if_dead_for_ms = 20000;
  #messages_queued = 0;

  async #wait_for_open_and_send(msg: Parameters<typeof WebSocket.prototype.send>[0]) {
    while (this.current_socket.readyState !== 1) {
      await new Promise(resolve => {
        this.addEventListener("open", resolve, { once: true });
      });
    }
    this.send(msg);
  }

  #start_reconnection_if_offline_process = deparallelize(async () => {
    await new Promise(r => setTimeout(r, this.#reconnect_if_dead_for_ms + rand(-2, 10)));
    // so if we are trying to send something and there's no activity ("error" which could mean the server is down or message or reconnection) we can safely assume that the internet connection is down. In that case we skip the exponential backoff since we want to know when we're connected again ASAP and just retry every like 20s
    if (this.#messages_queued === 0) {
      return;
    }
    const now = +new Date();
    if (now - this.#connection_last_active > this.#reconnect_if_dead_for_ms) {
      const reason = `No activity in ${this.#reconnect_if_dead_for_ms} ms`;
      dlog(reason, "reconnecting ws");
      this.restart_ws(reason);
    }
  });

  #periodic_send(msg: Parameters<typeof WebSocket.prototype.send>[0]) {
    let delay_to_next_send = this.#initial_retry_ms;
    let quit = false;
    this.#messages_queued++;

    (async () => {
      while (!quit) {
        this.#start_reconnection_if_offline_process();
        await this.#wait_for_open_and_send(msg);
        const waited = await new Promise<boolean>(r => {
          const handler = () => {
            r(false);
            clearTimeout(resend_due_to_lost_message_timeout);
          };
          // wait the correct delay
          const resend_due_to_lost_message_timeout = setTimeout(
            // this might actually never be needed and be from when Daniel didn't understand WebSockets as well
            catchify(() => {
              r(true);
              this.removeEventListener("open", handler);
            }),
            delay_to_next_send
          );
          // BUT if we new websocket opens (which means the internet connection works) try again immediately (shortcut the delay)
          this.addEventListener("open", handler, { once: true });
        });
        if (quit) {
          break;
        }
        delay_to_next_send *= 1.5 + Math.random();
        if (delay_to_next_send > ONE_MINUTE) {
          delay_to_next_send = ONE_MINUTE * (Math.random() + 1);
        }
        if (waited) {
          // don't count the fail as fail if we're trying again due to a reconnect since that could make us kill the connection if many messages suddenly retry which we don't want
          // this is not a proven theory and might be wrong
          this.increase_fails();
        }
      }
      this.#messages_queued--;
    })().catch(e => report(e, "error"));

    return () => (quit = true);
  }

  async ensure_sent(payload: { id: string; event?: depict_body; [key: string]: any }) {
    const json_payload = JSON.stringify(payload);
    const stop_sending = this.#periodic_send(json_payload);
    while (true) {
      const { data } = await this.#msg_ipns.promise;
      let reply;
      try {
        reply = JSON.parse(data);
      } catch (e) {
        const msg = "Got malformed message (ignoring, might cause memory leak)";
        dlog(msg, data, e);
        report([e, msg], "error", { data });
        continue;
      }
      if (reply.id == payload.id) {
        const { status } = reply;
        if (status == "ack") {
          stop_sending();
          continue;
        } else if (status == "not-ok") {
          dwarn("Got reply not-ok reply from server for event!", payload, reply);
        } else if (status == "ok") {
          if (process.env.BUILD_TARGET !== "node") {
            dlog(`Successfully sent ${payload?.event?.type} (WS)`, payload, reply);
          }
        } else {
          dwarn("Strange reply from WSS server to", payload, ":", reply);
        }
        stop_sending();
        return [reply, data];
      }
    }
  }

  constructor(
    ...params: [
      url: ConstructorParameters<typeof AutoReconnectingWS>[0],
      protocols?: ConstructorParameters<typeof AutoReconnectingWS>[1],
      options?: ConstructorParameters<typeof AutoReconnectingWS>[2] &
        Partial<{
          initial_retry_ms: number;
        }>,
    ]
  ) {
    super(...params);
    const option_retry_ms = params[2]?.initial_retry_ms;
    if (option_retry_ms) {
      this.#initial_retry_ms = option_retry_ms;
    }
    this.addEventListener("message", catchify(this.#msg_ipns.resolve as (e: Event) => void));
    ["open", "error", "message"].forEach(event =>
      this.addEventListener(
        event,
        catchify(() => (this.#connection_last_active = +new Date()))
      )
    );
  }
}
