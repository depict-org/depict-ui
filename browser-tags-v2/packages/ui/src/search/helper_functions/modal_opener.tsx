import { createRoot } from "solid-js";
import { catchify, Node_Array, observer } from "@depict-ai/utilishared";

/**
 * Basically allows you to use SearchModal
 * So the idea is to have a modal. It should either be rendered and exist, in which case it is in the foreground and open, or it's completely gone. This makes things easier.
 * @param search_modal a function which returns an array of nodes that get appended into <body>. This function will run in its own solid-js root which will call onCleanup and cleanup all reactive things inside it when the modal is closed. This function will get the arguments passed to open_modal_ and the modal_fn_opts merged together, along with register_closing_animation_ where an async function that resolves once the animation is finished can be provided to animate the closing of the modal
 * @param modal_fn_opts static options for the modal that won't change on a per-opening basis
 * @param parent override the parent element to append the modal to. Defaults to <body>
 @returns a function to open and close the modal. When calling the open_modal_ function additional parameters can be passed to the modal
 */
export async function modal_opener<
  StaticOptions extends { [key: string]: any },
  ExtraOptionsProvidedOnOpen extends { [key: string]: any },
>(
  search_modal: (
    options: StaticOptions &
      ExtraOptionsProvidedOnOpen & {
        close_modal_: VoidFunction;
        open_modal_: (extra_options_for_modal?: ExtraOptionsProvidedOnOpen, on_dispose?: VoidFunction) => void;
        register_closing_animation_: (animation: () => Promise<any>) => void;
      }
  ) => Node_Array,
  modal_fn_opts: StaticOptions,
  parent?: HTMLElement | ShadowRoot
) {
  const body = parent || document.body || (await observer.wait_for_element("body"));
  let dispose_and_remove: undefined | VoidFunction;
  let restoring_focus = false;

  const open_modal_ = catchify(
    async (extra_options_for_modal = {} as ExtraOptionsProvidedOnOpen, on_dispose?: VoidFunction) => {
      if (restoring_focus) {
        // Ignore opens triggered by our own focus restore below (a merchant can open the modal on the trigger's
        // `focus` event, and without this closing the modal would instantly reopen it, trapping keyboard users).
        // Only covers handlers that open within the same task as the restore — a handler that opens
        // asynchronously (debounce, framework effect) can still reopen the modal on close.
        return;
      }
      // Below await is very intentional,
      // The reason is that effects don't run in <Suspense> boundaries before they've resolved and this carries even through roots created, but if a modal is opened from a suspense boundary we still want the effects in it to run
      // This is because the suspense is for the content in the page and not the modal (the modal goes above it)
      // By having an await here, solid loses all its knowledge of the suspense boundary
      // (there is also some bug where effects don't run when created inside a suspense boundary that is resolved)
      if (await dispose_and_remove) {
        // modal is already open
        return;
      }
      // When the modal is mounted into a shadow root, document.activeElement is the shadow host, not the real
      // focused element — focus capture/restore (and the pre-existing contains()/blur() below) are best-effort
      // there and fail closed
      const opening_active_element = document.activeElement;
      const element_focused_before_open =
        opening_active_element instanceof HTMLElement && opening_active_element !== document.body
          ? opening_active_element
          : undefined;
      const modal_els = createRoot(dispose => {
        let closing_animation: () => Promise<void> | undefined;
        let animation_started: number | undefined;
        dispose_and_remove = () => {
          const actually_close = () => {
            dispose();
            on_dispose?.();
            const { activeElement } = document;
            // Don't steal focus if the user has already focused something outside the modal by the time it closes
            // (for example when the modal closes due to navigating away while they're typing elsewhere).
            // !dispose_and_remove: if the modal was reopened during our closing animation, don't steal focus from
            // the new instance — its input focuses asynchronously, so activeElement can still be body here
            const should_restore_focus =
              (!activeElement ||
                activeElement === document.body ||
                activeElement === document.documentElement ||
                modal_els.some(el => el.contains(activeElement))) &&
              !dispose_and_remove;
            modal_els.forEach(el => {
              if (el.contains(activeElement)) {
                // Fix page jumping to the bottom when closing modal with scape after animation in safari
                (activeElement as HTMLElement)?.blur?.();
              }
              el.remove();
            });
            if (should_restore_focus && element_focused_before_open?.isConnected) {
              restoring_focus = true;
              try {
                // preventScroll so this can't re-introduce the safari page-jump the blur() above works around
                element_focused_before_open.focus({ preventScroll: true });
              } finally {
                // Cleared on a task instead of synchronously in case a browser delivers the focus event async
                setTimeout(() => (restoring_focus = false), 0);
              }
            }
          };
          if (animation_started && +new Date() - animation_started > 1000) {
            // Animation broke, close it this time
            actually_close();
          } else if (!animation_started && closing_animation) {
            animation_started = +new Date();
            catchify(closing_animation)()?.then(catchify(actually_close));
          } else {
            actually_close();
          }
        };
        return search_modal({
          ...modal_fn_opts,
          ...extra_options_for_modal,
          close_modal_,
          open_modal_,
          register_closing_animation_: animation => (closing_animation = animation),
        });
      });
      body.append(...modal_els);
    }
  );
  const close_modal_ = catchify(() => {
    if (dispose_and_remove) {
      // modal is open
      const dispose_fn = dispose_and_remove;
      // set dispose function to undefined in case that it triggers this dispose function itself. Not doing it leads to a bug like https://github.com/solidjs/solid/discussions/1194
      dispose_and_remove = undefined;
      dispose_fn();
    }
  });
  return { open_modal_, close_modal_ };
}
