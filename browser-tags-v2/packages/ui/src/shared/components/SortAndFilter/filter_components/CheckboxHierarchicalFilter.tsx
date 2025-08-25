/** @jsxImportSource solid-js */
import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  JSX as solid_JSX,
  on,
  onCleanup,
  Setter,
  Show,
  Signal,
  untrack,
} from "solid-js";
import { SearchFilter, ValuesFilterMeta } from "@depict-ai/types/api/SearchResponse";
import { catchify, dlog } from "@depict-ai/utilishared";
import { Checkbox } from "./Checkbox";
import { MorphingSign } from "../../MorphingSign";
import { ExpandingDetails } from "../../ExpandingDetails";
import { useExpandingContainerReactive } from "../../../helper_functions/expanding_container_with_reactive_kids";
import { solid_plp_shared_i18n } from "../../../../locales/i18n_types";
import { ExpandCollapseFilter } from "../ExpandCollapseFilter";
import { to_lower_case_if_possible } from "../../../helper_functions/to_lower_case_if_possible";
import { HighlightSpecifiedText } from "../../HighlightSpecifiedText";

const max_visible_without_collapsing = 15;
const show_non_collapsible_when_collapsed = 4;
type hierarchical_data_structure = Record<
  string,
  {
    name_: string;
    value_: string[];
    count_?: number;
    is_checked_: Signal<boolean>;
    is_expanded_: ReturnType<typeof make_expanded_signal>;
    children_: Record<string, never> | hierarchical_data_structure;
    parent_: hierarchical_data_structure["string"] | Record<string, never>; // the code using this didn't end up working out but I'm leaving it in the structure since it is very handy to have
  }
>;

/**
 * Renders a hierarchical, collapsible list of checkboxes, commonly used for the category filter
 */
export function CheckboxHierarchicalFilter({
  filter_,
  selected_filters_,
  i18n_,
  view_more_button_below_group_: [, set_view_more_button_below_group],
  expanded_hierarchical_filters_,
  filter_query_,
}: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<SearchFilter[]>;
  i18n_: solid_plp_shared_i18n;
  view_more_button_below_group_: Signal<solid_JSX.Element>;
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  filter_query_?: Accessor<string | undefined>;
}) {
  let form: HTMLFormElement;
  const existing_filter = createMemo(() => {
    const { field, op } = filter_();

    return selected_filters_[0]().find(
      ({ field: checking_field, op: checking_op }) => checking_field === field && checking_op === op
    );
  });
  const show_extras = createSignal(false);
  const is_being_searched_ = createMemo(() => !!filter_query_?.()); // If the user is searching in the filter
  const trigger_sync_ = batching_filter_state_syncer({
    filter_,
    existing_filter_: existing_filter,
    selected_filters_,
    get category_structure_() {
      return structured_categories();
    },
  });

  const structured_categories = createMemo(() => {
    const execute_when_structure_finished: VoidFunction[] = [];
    const { values, names, counts } = filter_().meta as ValuesFilterMeta;
    const data_structure: hierarchical_data_structure = {};
    for (let i = 0; i < values.length; i++) {
      const value = values[i] as unknown as (string | number)[];
      let pointer = data_structure;
      let parent_: Record<string, never> | hierarchical_data_structure[string] = {};
      let created_an_object = false;
      for (let j = 0; j < value.length; j++) {
        const this_categories_name = value[j];
        const obj = (pointer[this_categories_name] ||= (() => {
          const value_as_string = value.map(v => (typeof v === "number" ? v + "" : v)); // don't think backend will ever send numbers but technically it's allowed;
          const created_obj: Omit<hierarchical_data_structure[string], "is_checked_"> = {
            name_: names![i],
            count_: counts?.[i],
            parent_,
            is_expanded_: make_expanded_signal({
              expanded_hierarchical_filters_,
              filter_value_: value_as_string,
              is_being_searched_,
            }),
            value_: value_as_string,
            children_: {},
          };
          type type_after_adding_is_checked = typeof created_obj & { is_checked_: Signal<boolean> };
          const { signal_, on_structure_complete_ } = create_updating_signal({
            self_: created_obj as type_after_adding_is_checked,
            existing_filter_: untrack(existing_filter),
            trigger_sync_,
          });
          execute_when_structure_finished.push(on_structure_complete_);
          (created_obj as type_after_adding_is_checked).is_checked_ = signal_;
          parent_ = created_obj as type_after_adding_is_checked;
          created_an_object = true;
          return created_obj as type_after_adding_is_checked;
        })());
        pointer = obj.children_;
        parent_ = obj;
      }
      if (!created_an_object && "value_" in parent_) {
        // if an object was created for our "depth" in the hierarchy but not for our specific entry this means that the entry array was unsorted and looked something like
        // [
        //   ["Öl", "IPA"],
        //   ["Öl", "Pale Ale"],
        //   ["Öl", "Ale"],
        //   ["Öl", "Mörk Lager"],
        //   ["Öl", "Suröl"],
        //   ["Öl", "Veteöl"],
        //   ["Öl", "Stout och Porter"],
        //   ["Öl"], // <- We are here, our `hierarchical_data_structure[string]`-object was created when we iterated over ["Öl", "IPA"]
        //   ["Öl", "Ljus Lager"],
        // ];
        // In this case we want to just correct the name and value of the already created object, which will be in parent_
        parent_.value_ = value.map(v => v + "");
        parent_.name_ = names![i];
        parent_.count_ = counts?.[i];
        parent_.is_expanded_ = make_expanded_signal({
          expanded_hierarchical_filters_,
          filter_value_: parent_.value_,
          is_being_searched_,
        });
      }
    }
    while (execute_when_structure_finished.length) {
      execute_when_structure_finished.pop()!();
    }
    expand_until_choice(data_structure);
    dlog("CheckboxHierarchicalFilter: Recomputed structured_categories", data_structure);
    return data_structure;
  });

  const some_top_level_are_hidden = createMemo(
    () => Object.keys(structured_categories()).length > max_visible_without_collapsing
  );

  const { expand, collapse, ExpandingContainer } = useExpandingContainerReactive({ duration: 200 });
  const expanding_container_els = // must have created this before the effect below
    (
      <ExpandingContainer>
        <Show when={some_top_level_are_hidden()}>
          {render_stuff(
            createMemo(() =>
              Object.fromEntries(Object.entries(structured_categories()).slice(show_non_collapsible_when_collapsed))
            ),
            existing_filter,
            i18n_,
            filter_query_
          )}
        </Show>
      </ExpandingContainer>
    );

  createRenderEffect(() => {
    set_view_more_button_below_group(
      some_top_level_are_hidden() ? <ExpandCollapseFilter show_extras_={show_extras} i18n_={i18n_} /> : []
    );
  });

  onCleanup(() => set_view_more_button_below_group());

  createEffect(
    catchify(async () => {
      if (!some_top_level_are_hidden()) {
        await collapse();
        return;
      }
      if (show_extras[0]()) {
        await expand();
      } else {
        await collapse();
      }
    })
  );

  return (
    <form
      class="checkboxes hierarchical"
      classList={{
        "any-expandable": Object.values(structured_categories()).some(
          category => Object.keys(category.children_).length
        ),
      }}
      ref={form!}
    >
      {render_stuff(
        createMemo(() =>
          some_top_level_are_hidden()
            ? Object.fromEntries(Object.entries(structured_categories()).slice(0, show_non_collapsible_when_collapsed))
            : structured_categories()
        ),
        existing_filter,
        i18n_,
        filter_query_
      )}
      {expanding_container_els}
    </form>
  );
}

function render_stuff(
  data: Accessor<hierarchical_data_structure>,
  existing_filter: Accessor<SearchFilter | undefined>,
  i18n_: solid_plp_shared_i18n,
  filter_query_: Accessor<string | undefined> | undefined
) {
  const keys = createMemo(() => Object.keys(data()));

  return (
    <For each={keys()}>
      {key => (
        <Show when={createMemo(() => !!data()[key])()}>
          {(() => {
            // for some reason the for thing doesn't dispose of us if the key no longer exists?? so I'm doing it with show instead
            const value = createMemo(() => data()[key] as hierarchical_data_structure[string] | undefined); // still sometimes get undefined here even though we have <Show>
            const has_expandable = createMemo(() => !!Object.keys(value()?.children_ || {}).length);
            const value_as_string = createMemo(() => JSON.stringify(value()?.value_));
            const label_text = createMemo(() => value()?.name_ || value_as_string());

            return (
              <div class="checkbox-details" classList={{ expandable: has_expandable() }}>
                <Checkbox
                  value_={value_as_string()}
                  label_={
                    // * Don't show highlighted text when disabled because a) it's confusing and b) the highlighting color messed up the disableing color */
                    <Show
                      when={value()?.count_ === 0}
                      fallback={<HighlightSpecifiedText text_={label_text()} to_highlight_={filter_query_?.()} />}
                    >
                      {label_text()}
                    </Show>
                  }
                  count_={has_expandable() ? undefined : value()?.count_}
                  is_count_zero_={has_expandable() && value()?.count_ === 0}
                  checked_={value()?.is_checked_?.[0]?.() ?? false}
                  input_ref_={input => {
                    input.addEventListener(
                      "change",
                      catchify(() =>
                        untrack(() => {
                          const { checked } = input;
                          if (checked) {
                            value()?.is_expanded_.set_user_expanded_(true);
                          }
                          value()?.is_checked_[1](checked);
                        })
                      )
                    );
                    const any_kids_checked = createMemo(() => {
                      let are_checked = false;
                      const to_check: hierarchical_data_structure[string][] = Object.values(value()?.children_ || {});
                      while (to_check.length) {
                        const kid_to_check = to_check.pop()!;
                        to_check.push(...Object.values(kid_to_check.children_));
                        if (kid_to_check.is_checked_[0]()) {
                          are_checked = true;
                          break;
                        }
                      }
                      return are_checked;
                    });
                    createEffect(() => input.classList[any_kids_checked() ? "add" : "remove"]("fake-checked"));
                  }}
                />
                <Show when={has_expandable()}>
                  {(() => {
                    const is_open = createMemo(() => {
                      const v = value();
                      if (!v) {
                        // only to prevent cleanup errors
                        return createSignal(false);
                      }
                      const {
                        is_expanded_: { ui_should_show_expanded_, set_user_expanded_ },
                      } = v;
                      return [ui_should_show_expanded_, set_user_expanded_ as Setter<boolean>] as Signal<boolean>;
                    });

                    return (
                      <ExpandingDetails
                        details_={(<details />) as HTMLDetailsElement}
                        summary_={
                          (
                            <summary class="category-parent">
                              <div class="summary">
                                {/* workaround https://github.com/philipwalton/flexbugs#flexbug-9 */}
                                <span class="count" classList={{ "count-0": value()?.count_ === 0 }}>
                                  {value()?.count_}
                                </span>
                                <MorphingSign
                                  i18n_={i18n_}
                                  expanded_={createMemo(
                                    () => value()?.is_expanded_?.ui_should_show_expanded_?.() ?? false
                                  )}
                                />
                              </div>
                            </summary>
                          ) as HTMLElement
                        }
                        is_open_={is_open()}
                      >
                        {render_stuff(
                          createMemo(() => value()?.children_ || {}),
                          existing_filter,
                          i18n_,
                          filter_query_
                        )}
                      </ExpandingDetails>
                    );
                  })()}
                </Show>
              </div>
            );
          })()}
        </Show>
      )}
    </For>
  );
}

function batching_filter_state_syncer(props: {
  filter_: Accessor<SearchFilter>;
  selected_filters_: Signal<SearchFilter[]>;
  existing_filter_: Accessor<SearchFilter | undefined>;
  category_structure_: hierarchical_data_structure; // this is a getter
}) {
  const { filter_, selected_filters_, existing_filter_ } = props;
  let sync_queued = false;
  const sync_fn = catchify(async () => {
    sync_queued = false;
    // if we change, update filter state - next microtask, so that "reactions" to the change can process before we send it off to the API
    const set_filter = existing_filter_();
    const { field, op } = filter_();
    const base_object = set_filter ? set_filter : { op, field };
    const data: string[][] = [];
    // recursively go through and build new filter value
    const to_process = Object.values(props.category_structure_);
    while (to_process.length) {
      const item = to_process.pop()!;
      to_process.push(...Object.values(item.children_));
      if (item.is_checked_[0]()) {
        data.push(item.value_);
      }
    }
    const filter_object = {
      ...base_object,
      data,
    };
    dlog("CheckboxHierarchicalFilter: Updating API state", filter_object);
    const selected_filters = [...selected_filters_[0]()];
    if (set_filter) {
      selected_filters.splice(selected_filters.indexOf(set_filter), 1);
    }
    if (filter_object.data.length) {
      selected_filters.push(filter_object);
    }
    selected_filters_[1](selected_filters);
  });
  const trigger_sync = () => {
    if (!sync_queued) {
      queueMicrotask(sync_fn);
      sync_queued = true;
    }
  };
  return trigger_sync;
}

function create_updating_signal({
  self_,
  existing_filter_,
  trigger_sync_,
}: {
  self_: hierarchical_data_structure["string"];
  trigger_sync_: VoidFunction;
  existing_filter_: SearchFilter | undefined; // this isn't reactive because on updating of the filters the whole filter data structure will get recalculated. If this was reactive and would receive state from history.state and update itself it happens that the old structure updates itself based on a popstate event and then upates history.state based on not knowing the actually available filters and then ruining the state for the new instance of this once the whole structure is recalculated
}) {
  const signal_ = [] as unknown as Signal<boolean>;
  const on_structure_complete_ = () => {
    // wait for the children to have populated and us to have received the correct value_ and name_ values
    let updating_blocked = false;
    const index_of_us_in_selected_filter = (existing_filter_?.data as string[][] | undefined)?.findIndex?.(
      el =>
        el.length === self_.value_.length &&
        el.every(
          (sub_el, index) => to_lower_case_if_possible(self_.value_[index]) === to_lower_case_if_possible(sub_el)
        )
    );

    signal_.push(...createSignal<boolean>(index_of_us_in_selected_filter! >= 0));
    const [read_checked, write_checked] = signal_;
    const child_objects = Object.values(self_.children_);
    const get_child_object_values = child_objects.map(({ is_checked_: [read_is_checked] }) => read_is_checked);

    createComputed(on(read_checked, trigger_sync_, { defer: true }));

    createComputed(
      on(
        read_checked,
        catchify(new_value => {
          if (updating_blocked) {
            return;
          }
          for (const child of child_objects) {
            child.is_checked_[1](new_value);
          }
        }),
        { defer: true }
      )
    );

    createEffect(
      on(
        get_child_object_values,
        catchify(() => {
          const all_kids_checked = get_child_object_values.every(accessor => accessor());
          if (all_kids_checked === read_checked()) {
            return;
          }
          updating_blocked = true;
          let initial_run = true;
          let done = false;
          createComputed(() => {
            if (!done) {
              read_checked();
            }
            if (initial_run) {
              initial_run = false;
              return;
            }
            updating_blocked = false; // change back updating blocked once the updates finished
            done = true;
          });
          write_checked(all_kids_checked);
        }),
        { defer: true }
      )
    );
  };

  return { signal_, on_structure_complete_ };
}

function make_expanded_signal({
  expanded_hierarchical_filters_: [read_expanded_hierarchical_filters, write_expanded_hierarchical_filters],
  filter_value_,
  is_being_searched_,
}: {
  expanded_hierarchical_filters_: Signal<{ value_: string[]; expanded_: boolean }[]>;
  filter_value_: string[];
  is_being_searched_: Accessor<boolean>;
}) {
  const index_in_expanded_filters = createMemo(
    () =>
      read_expanded_hierarchical_filters().findIndex(
        ({ value_ }) =>
          value_.length === filter_value_.length && value_.every((item, index) => filter_value_[index] === item)
      ),
    undefined,
    { equals: false } // we always want this to update so that we can make updates of the object on this index depend on this memo
  );
  const clone_history_state_with_us_removed = () => {
    const state = [...untrack(read_expanded_hierarchical_filters)];
    const index = untrack(index_in_expanded_filters);
    if (index >= 0) {
      state.splice(index, 1);
    }
    return state;
  };
  const user_choice_signal = createSignal(
    (
      untrack(read_expanded_hierarchical_filters)[untrack(index_in_expanded_filters)] as
        | ReturnType<typeof read_expanded_hierarchical_filters>[number]
        | undefined
    )?.expanded_
  ); // we already have a value stored from before, use it as inital value, otherwise default to collapsed
  const [get_user_choice_expanded, set_user_choice_expanded] = user_choice_signal;
  const [get_low_precedence_expanded, set_low_precedence_expanded] = createSignal(false); // for us to be helpful for the user to expand long trees where there's no choice to be made but user setting anything takes precedence

  createComputed(
    on(
      index_in_expanded_filters,
      index => {
        if (index >= 0) {
          // if history.state state updates, update signal
          const expanded_from_history_state = (
            read_expanded_hierarchical_filters()[index] as
              | ReturnType<typeof read_expanded_hierarchical_filters>[number]
              | undefined
          )?.expanded_;
          if (typeof expanded_from_history_state == "boolean") {
            set_user_choice_expanded(expanded_from_history_state);
          }
        }
      },
      { defer: true }
    )
  );

  createComputed(
    on(
      get_user_choice_expanded,
      expanded_ => {
        if (typeof expanded_ != "boolean") {
          return;
        }
        const new_state = clone_history_state_with_us_removed();
        new_state.push({ value_: filter_value_, expanded_ });
        write_expanded_hierarchical_filters(new_state);
      },
      { defer: true }
    )
  );

  return {
    ui_should_show_expanded_: createMemo(
      // When user is searching through filters, expand everything they haven't collapsed, so they can see the results
      () => user_choice_signal[0]() ?? (is_being_searched_() || get_low_precedence_expanded())
    ),
    set_low_precedence_expanded_: set_low_precedence_expanded,
    set_user_expanded_: set_user_choice_expanded,
  };
}

function expand_until_choice(data_structure: hierarchical_data_structure) {
  const nodes = Object.values(data_structure);
  const cloned_nodes = [...nodes];
  batch(() => {
    while (cloned_nodes.length) {
      const node = cloned_nodes.pop()!;
      node.is_expanded_.set_low_precedence_expanded_(false); // default all to false on every update
      cloned_nodes.push(...Object.values(node.children_));
    }
    while (nodes.length === 1) {
      const node = nodes.pop()!;
      // as long as there's only one thing to expand, expand everything
      node.is_expanded_.set_low_precedence_expanded_(true);
      nodes.push(...Object.values(node.children_));
    }
  });
}
