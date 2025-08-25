import { guaranteeAlignment } from "../../../search/helper_functions/guaranteeAlignment";
import { catchify, dwarn, observer } from "@depict-ai/utilishared";
import { Accessor, batch, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import { get_cols_currently_showing } from "../../../shared/helper_functions/get_cols_currently_showing";
import { ModifiedLayoutOptionsAccessor } from "../../../shared/components/PLPResults";
import { disable_scrolling } from "../../../search/helper_functions/disable_scrolling";
import { media_query_to_accessor } from "../../../shared/helper_functions/media_query_to_accessor";

const looksContainerClass = "looks-container";

/**
 * Orphaned code. See https://github.com/depict-org/depict/pull/494/files for the original context.
 * This enables the epic tiktok like feed layout for looks. Within an existing page, preserving the header. With normal content above and below.
 * Disables scrolling, does stuff
 * TODO: better naming, both here and in LooksPlugin type
 */
export function enableFeedLayout(
  props: Parameters<typeof actuallyEnableFeedLayout>[0] & {
    layout_options_: ModifiedLayoutOptionsAccessor;
  }
) {
  const n_cols_currently_showing_ = get_cols_currently_showing(() => props.layout_options_().cols_at_size);

  createEffect(() => {
    const colsRightNow = n_cols_currently_showing_();
    if (colsRightNow === 1) {
      // Only enable feed layout if showing 1 column
      actuallyEnableFeedLayout(props);
    }
  });
}

function actuallyEnableFeedLayout({
  cardsElement_,
  expandedLooks_,
}: {
  cardsElement_: HTMLElement;
  expandedLooks_: Accessor<Set<symbol>>;
}) {
  let lastCardsTopDistanceFromMenuBottomWasPositive = true;
  let lastBodyScrollY = scrollY;
  const { classList } = cardsElement_;
  const [menuBottom, setMenuBottom] = createSignal(0);
  const [innerHeightAccessor, setInnerHeight] = createSignal(innerHeight);
  const [wantsToExitFeedMode, setWantsToExitFeedMode] = createSignal(false);
  const cardsHeight = createMemo<number>(prev => {
    if (prev && wantsToExitFeedMode()) return prev;
    return innerHeightAccessor() - menuBottom();
  });
  const [cardsTopDistanceFromMenuBottom, setCardsTopDistanceFromMenuBottom] = createSignal(Infinity);
  const [cardsOutsideViewport, setCardsOutsideViewport] = createSignal(true);
  const [cardsTop_scrollIndependent, setCardsTop_scrollIndependent] = createSignal(0);
  // false = last scroll was downwards
  const [lastScrolledUp, setLastScrolledUp] = createSignal(false);
  const [isAtTopOfCards, setIsAtTopOfCards] = createSignal(false);
  const [isAtBottomOfCards, setIsAtBottomOfCards] = createSignal(false);
  // null = not set, true = forbid exiting while scrolling up, false = forbid exiting while scrolling down
  const [forbidExitingFeedModeForDirection, setForbidExitingFeedModeForDirection] = createSignal<null | boolean>(null);
  const anyLookHasExpandedItems = createMemo(() => !!expandedLooks_().size);
  const cardsTopDistanceFromMenuBottomFiltered = createMemo<number>(prev => {
    const now = cardsTopDistanceFromMenuBottom();
    if (now < 1 && now > -1) {
      return prev;
    }
    return now;
  }, Infinity);
  const cardsWithinHandoverPosition = createMemo<boolean>(prev => {
    const cardsTopDistanceFromMenuBottomPositive = cardsTopDistanceFromMenuBottomFiltered() >= 0;
    try {
      if (cardsOutsideViewport()) return false;
      if (prev && !wantsToExitFeedMode()) {
        return prev;
      }
      // We're currently scrolling the viewport, so we need to be within the right position and scroll direction
      if (lastScrolledUp()) {
        return !lastCardsTopDistanceFromMenuBottomWasPositive && cardsTopDistanceFromMenuBottomPositive;
      }
      return lastCardsTopDistanceFromMenuBottomWasPositive && !cardsTopDistanceFromMenuBottomPositive;
    } finally {
      lastCardsTopDistanceFromMenuBottomWasPositive = cardsTopDistanceFromMenuBottomPositive;
    }
  }, false);
  const letViewportScrollInsteadOfCards = createMemo<boolean>(prev => {
    // If any look has expanded items, don't allow exiting the feed layout before they're closed
    if (anyLookHasExpandedItems()) return false;
    if (forbidExitingFeedModeForDirection() === lastScrolledUp() && !prev) return prev;
    return !cardsWithinHandoverPosition() || wantsToExitFeedMode();
  }, true);
  const checkPosition = guaranteeAlignment(
    () => {
      const { top, bottom, height } = cardsElement_.getBoundingClientRect();
      const viewportHeight = innerHeight;
      const scrollTop = scrollY;
      const newMenuBottom = getMenuBottom();
      const currentCardsScrollTop = cardsElement_.scrollTop;

      setInnerHeight(viewportHeight);
      setCardsTop_scrollIndependent(top + scrollTop);
      setIsAtTopOfCards(currentCardsScrollTop < 10);
      setIsAtBottomOfCards(currentCardsScrollTop + height >= cardsElement_.scrollHeight - 10); // 10px buffer for ios safari that's not so precise
      setCardsOutsideViewport(bottom < 0 || top > viewportHeight);

      const bodyScrollDiff = scrollTop - lastBodyScrollY;
      if (untrack(letViewportScrollInsteadOfCards)) {
        if (bodyScrollDiff) {
          // onTryingToScrollInDirection isn't always 100% precise on mobilesafari for fast scrolling. When not in danger of feeding changing scroll position back into ourselves (viewport is scrolling) therefore also take scroll direction information from scroll events
          const wasUp = bodyScrollDiff < 0;
          setLastScrolledUp(wasUp);
          // Make it possible to re-enter feed mode just from scroll events too
          if (!(isAtTopOfCards() && wasUp) && !(isAtBottomOfCards() && !wasUp)) {
            setWantsToExitFeedMode(false);
          }
        }
        lastBodyScrollY = scrollTop;
      }

      if (newMenuBottom == null) {
        dwarn("Cannot calculate menu height, please check z-index of header and content");
        // Under stress, getElementFromPoint behaves weird in firefox and safari and only returns document.documentElement, use cached value
        const oldValue = untrack(menuBottom);
        if (oldValue != null) {
          setCardsTopDistanceFromMenuBottom(top - oldValue);
        }
        return;
      }
      setMenuBottom(newMenuBottom);
      setCardsTopDistanceFromMenuBottom(top - newMenuBottom);
    },
    undefined,
    false
  );
  const disconnect = observer.onexists(cardsElement_, checkPosition);

  onTryingToScrollInDirection(directionIsUp =>
    batch(() => {
      if (isAtTopOfCards() && directionIsUp) {
        setWantsToExitFeedMode(true);
      } else if (isAtBottomOfCards() && !directionIsUp) {
        setWantsToExitFeedMode(true);
      } else {
        setWantsToExitFeedMode(false);
      }
      setLastScrolledUp(directionIsUp);
    })
  );

  createEffect(() => {
    console.log("wantsToExitFeedMode", wantsToExitFeedMode());
  });
  createEffect(() => {
    console.log("isAtBottomOfCards", isAtBottomOfCards());
  });
  createEffect(() => {
    console.log("isAtTopOfCards", isAtTopOfCards());
  });

  // Set height of cards element to available space
  createEffect(() => cardsElement_.style.setProperty(`--looks-height`, cardsHeight() + "px"));
  createEffect(() => {
    // Hand over scrolling on cards element
    if (letViewportScrollInsteadOfCards()) return;
    classList.add("scrolling");
    onCleanup(() => classList.remove("scrolling"));
    disable_scrolling();
    setForbidExitingFeedModeForDirection(untrack(lastScrolledUp));
    // Force snap into position completely once we should hand over scrolling to the cards element
    // Chrome sometimes has inertia that persists even though scrolling has been disabled, therefore snap again if needed
    createEffect(() => {
      if (Math.abs(cardsTopDistanceFromMenuBottom()) < 5) return;
      const newTop = untrack(cardsTop_scrollIndependent) - untrack(menuBottom);
      if (scrollY === newTop) return; // Bail, or weTriggeredScroll could get stuck (happens on mobilesafari, but we still need the aggressive snapping for chrome)
      scrollTo({ top: newTop });
    });
    // For one event loop iteration, forbid exiting feed mode. This is so that things have time to settle (we can achieve victory over the scroll intertia)
    setTimeout(
      catchify(() => setForbidExitingFeedModeForDirection(null)),
      800 // <- So all inertia can die out, seems like mobilesafari preserves inertia for a while and the inertia ignores overflow: hidden
    );
  });

  classList.add(looksContainerClass);
  cardsElement_.addEventListener("scroll", checkPosition, { passive: false });

  onCleanup(() => {
    disconnect();
    classList.remove(looksContainerClass);
    cardsElement_.removeEventListener("scroll", checkPosition);
  });
}

function onTryingToScrollInDirection(callback: (directionIsUp: boolean) => void) {
  const wheelHandler = catchify(({ deltaY }) => {
    if (deltaY > 0) {
      callback(false);
    } else if (deltaY < 0) {
      callback(true);
    }
  });
  const hasFinePointer = media_query_to_accessor("(pointer: fine)");
  const keyHandler = catchify(({ key }: KeyboardEvent) => {
    if (key === "ArrowUp") {
      callback(true);
    } else if (key === "ArrowDown") {
      callback(false);
    }
  });

  addEventListener("wheel", wheelHandler);
  onCleanup(() => removeEventListener("wheel", wheelHandler));

  addEventListener("keydown", keyHandler); // TODO: add support for keyboard scrolling within cards too
  onCleanup(() => removeEventListener("keydown", keyHandler));

  createEffect(() => {
    if (hasFinePointer()) return;
    const handler = catchify((ev: PointerEvent) => {
      if (ev.movementY > 0) {
        callback(true);
      } else if (ev.movementY < 0) {
        callback(false);
      }
    });
    for (const evt of ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const) {
      addEventListener(evt, handler);
      onCleanup(() => removeEventListener(evt, handler));
    }
  });
}

/**
 * Scalable way to get the "height" of the header (bottom coordinate where it ends), regarding of header or scroll position. Takes ~0.8ms on preview browser on my chrome. Should usually work, unless z-index set on content.
 */
function getMenuBottom() {
  let headerHeight: number | undefined;
  const div = (
    <div
      style={{ height: "100vh", width: "100vw", position: "fixed", top: 0, left: 0, background: "transparent" }}
      // css class in case someone needs to manually set z-index on this
      class="depict-header-height-finder-overlay"
    />
  ) as HTMLDivElement;
  document.body?.append?.(div);
  const x = innerWidth / 2;
  const height = innerHeight;
  let nextPixelToCheck = 0;
  while (nextPixelToCheck != undefined) {
    if (nextPixelToCheck >= height) break;
    const el = document.elementFromPoint(x, nextPixelToCheck)!;
    if (el === div) {
      headerHeight = nextPixelToCheck;
      break;
    }
    const probablyNext = el.getBoundingClientRect().bottom;
    if (nextPixelToCheck === probablyNext) {
      // mobile safari case that leads to infinite loop, need to check a pixel below
      nextPixelToCheck = probablyNext + 1;
    } else {
      nextPixelToCheck = probablyNext;
    }
  }
  div.remove();
  return headerHeight;
}
