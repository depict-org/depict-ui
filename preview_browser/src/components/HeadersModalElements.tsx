import { SetStoreFunction } from "solid-js/store";
import { media_query_to_accessor } from "@depict-ai/ui/latest";
import { createComputed, createMemo, createSignal, Index, JSX, onCleanup } from "solid-js";
import { catchify, make_random_classname, Node_Array } from "@depict-ai/utilishared/latest";

export function HeadersModalElements({
  close_modal_,
  headers_store,
}: {
  close_modal_: VoidFunction;
  headers_store: [get: { [p: string]: string }, set: SetStoreFunction<{ [p: string]: string }>];
}) {
  const supports_hover = media_query_to_accessor("(hover: hover) and (pointer: fine)");
  const desktop_short = media_query_to_accessor("(max-height: 790px)");
  const mobile_short = media_query_to_accessor("(max-height: 1000px)");
  const transform_y = createMemo(() => (supports_hover() ? !desktop_short() : !mobile_short()));
  const style_props_ = createSignal<JSX.CSSProperties>({
    position: "fixed",
  });
  const close_on_escape_handler = catchify(({ key }: KeyboardEvent) => {
    if (key === "Escape") {
      close_modal_();
    }
  });
  const [headers, set_headers] = headers_store;
  const keys = createMemo(() => Object.keys(headers));

  createComputed(() =>
    style_props_[1](() => (transform_y() ? { position: "fixed", transform: "translateY(-50%)", top: "50%" } : {}))
  );

  window.addEventListener("keydown", close_on_escape_handler);
  onCleanup(catchify(() => window.removeEventListener("keydown", close_on_escape_handler)));

  return [
    <div class="depict plp search extra_headers">
      <div class="depict-search-modal-backdrop" onClick={close_modal_} />
      <div class="depict-search-modal">
        <div class="body" style={style_props_[0]()}>
          <div class="padded">
            <h1>Extra headers sent in API requests</h1>
            <button
              class="add major"
              disabled={"" in headers}
              onClick={catchify(() => set_headers(old_headers => ({ ...old_headers, "": "" })))}
            >
              Add another header
            </button>
            <div class="headers">
              <Index each={keys()}>
                {key => {
                  const value = createMemo(() => headers[key()]);
                  const key_id = make_random_classname();
                  const value_id = make_random_classname();

                  return (
                    <div class="row">
                      <div class="section">
                        <label for={key_id}>Key</label>
                        <input
                          id={key_id}
                          type="text"
                          value={key()}
                          onInput={({ currentTarget }) => {
                            const new_key = currentTarget.value;
                            if (new_key in headers) {
                              alert("One key can't exist twice");
                              currentTarget.value = key();
                              return;
                            }
                            set_headers(old_headers => ({
                              ...old_headers,
                              [key()]: undefined,
                              [new_key]: value(),
                            }));
                          }}
                        />
                      </div>
                      <div class="section">
                        <label for={value_id}>Value</label>
                        <input
                          id={value_id}
                          type="text"
                          value={value()}
                          onInput={e => {
                            const new_value = e.currentTarget.value;
                            set_headers(key(), new_value);
                          }}
                        />
                      </div>
                      <button
                        class="remove major"
                        onClick={() => {
                          set_headers(old_headers => ({ ...old_headers, [key()]: undefined }));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                }}
              </Index>
            </div>
          </div>
        </div>
      </div>
    </div>,
  ] as Node_Array;
}
