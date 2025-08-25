/** @jsxImportSource solid-js */
import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  createUniqueId,
  getOwner,
  Index,
  JSX,
  mergeProps,
  onCleanup,
  runWithOwner,
  Show,
  untrack,
  useContext,
} from "solid-js";
import { catchify, ListenableSet, use_href_accessor } from "@depict-ai/utilishared/latest";
import { Dynamic } from "solid-js/web";
import { SlidableItems } from "./SlidableItems";

type TabData = { label: JSX.Element; children: JSX.Element; id: string; onSelected?: VoidFunction };
const TabsContext = /*@__PURE__*/ createContext<ListenableSet<TabData>>();
const useTabs = () => useContext(TabsContext);

/**
 * Renders a set of tabs
 * Will ignore any children that's not a <Tab />
 * Will cache children after the first visit, so they don't get re-created when closing and re-opening a tab
 */
export function Tabs(props: Parameters<typeof ActualTabs>[0]) {
  return (
    <TabsContext.Provider value={new ListenableSet<TabData>()}>
      <ActualTabs {...props}>{props.children}</ActualTabs>
    </TabsContext.Provider>
  );
}

function ActualTabs(props: {
  children: JSX.Element;
  wrapTabBar?: (navElement: JSX.Element) => JSX.Element;
  slidable?: boolean;
  /**
   * Component to use for creating an anchor (<a> tag) for the tab bar
   */
  AnchorComponent: (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { children: JSX.Element }) => JSX.Element;
}) {
  const [tabsReactive, setTabsReactive] = createSignal<TabData[]>([]); // Can't have a store since reconciling with a store would call the children getters, and we could get x-tle rendered components
  const [currentlySelected, setCurrentlySelected] = createSignal<string>();
  const [tabsVisitedOnce, setTabsVisitedOnce] = createSignal(new Set<string>(), { equals: false });
  const isSelected = createSelector(currentlySelected);
  const owner = getOwner()!;
  const updateTabsSignal = catchify(() => runWithOwner(owner, () => setTabsReactive([...ourTabsSet])));
  const ourTabsSet = useTabs()!;
  const location = use_href_accessor();
  const linkWithChangedHash = (hash: string) => {
    const u_o = new URL(location());
    u_o.hash = hash;
    return u_o.href;
  };
  const headerItems = (
    <Index each={tabsReactive()}>
      {item => {
        const weSelected = createMemo(() => isSelected(item().id));
        return (
          <Dynamic
            component={props.AnchorComponent}
            aria-controls={item().id}
            role="tab"
            classList={{ selected: weSelected() }}
            {...(weSelected() ? {} : { href: linkWithChangedHash(item().id) })}
          >
            {item().label}
          </Dynamic>
        );
      }}
    </Index>
  );

  // Enable nice pattern of doing <Tabs><Tab>Content</Tab><Tab>More content</Tab></Tabs>
  children(() => props.children); // "Render" children (.children is a getter), this means that we now can connect the children with the parent

  for (const event of ["add", "delete"] as const) {
    ourTabsSet.addEventListener(event, updateTabsSignal);
    onCleanup(() => ourTabsSet.removeEventListener(event, updateTabsSignal));
  }
  updateTabsSignal();

  createEffect(() => {
    const { hash } = new URL(location());
    const id = hash.slice(1);
    if (tabsReactive().some(item => item.id === id)) {
      setCurrentlySelected(id);
      return;
    }
    if (!currentlySelected() || !tabsReactive().some(item => item.id === currentlySelected())) {
      // Select first one by default if possible
      const firstTab = tabsReactive()[0]?.id;
      if (!firstTab) return;
      setCurrentlySelected(firstTab);
    }
  });

  return (
    <>
      {(props.wrapTabBar || (v => v))(
        <nav role="tablist" class="tabs-bar">
          {props.slidable ? <SlidableItems>{headerItems}</SlidableItems> : headerItems}
        </nav>
      )}
      <section aria-live="polite" role="region" class="tabs-body">
        <Index each={tabsReactive()}>
          {item => {
            const weSelected = createMemo(() => isSelected(item().id));

            createEffect(() => {
              if (weSelected()) {
                setTabsVisitedOnce(prev => {
                  prev.add(item().id);
                  return prev;
                });
                untrack(() => item().onSelected?.());
              }
            });

            onCleanup(() => setTabsVisitedOnce(prev => (prev.delete(item().id), prev)));

            return (
              <article
                id={item().id}
                role="tabpanel"
                classList={{ "selected": weSelected() }}
                style={{ display: weSelected() ? "" : "none" }}
              >
                {/* Keep rendered tabs in the DOM but only render tabs once they've been visited once */}
                <Show when={tabsVisitedOnce().has(item().id)}>{item().children}</Show>
              </article>
            );
          }}
        </Index>
      </section>
    </>
  );
}

/**
 * Renders a tab
 * Provide a custom id if you want to link to it from outside the tabs (i.e. provide "hello" and then linking to "#hello" focuses the tab). The id has to be unique.
 */
export function Tab(props: { label: JSX.Element; children: JSX.Element; onSelected?: VoidFunction; id?: string }) {
  const currentTabs = useTabs();
  if (!currentTabs) {
    throw new Error("Tab must be a child of Tabs");
  }

  const id = createUniqueId();
  const ourSet = currentTabs;
  const extendedProps = mergeProps({ id }, props);
  ourSet.add(extendedProps);
  onCleanup(() => ourSet.delete(extendedProps));

  return undefined;
}
