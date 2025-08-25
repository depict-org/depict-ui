import { DepictCategory, FilterWithData } from "@depict-ai/ui";
import { useEffect, useState } from "react";
import { createRenderEffect, createRoot, createSignal, untrack } from "solid-js";
import { get_instance_and_track_component } from "../../helpers/get_instance_and_track_component";

/**
 * Gives you some helpers that let you interact with the state of a category page
 * @param stateKey the stateKey of the components to effect, leave unset if you haven't set a stateKey on your components.
 */
export function useCategoryFilterHelpers(stateKey?: string) {
  // Create signal that will persist re-renders
  const [[getStateKeySignalValue, setStateKeySignalValue]] = useState(createSignal<string | undefined>(stateKey));
  const [cachedFunctionCalls] = useState<{ [key: string]: any }>({});
  const [hookFunctionsObject, setHookFunctionsObject] = useState(
    new Proxy(
      {},
      {
        get(target, property) {
          return (...args) => {
            // Cache function calls until we have the real functions
            cachedFunctionCalls[property as string] = args;
          };
        },
      }
    ) as {
      categorySetShouldShowFilters: (shouldShow: boolean) => void;
      categorySetFilter: (filter: FilterWithData) => void;
      categoryExpandFilterGroup: (title: string) => void;
    }
  );

  useEffect(() => {
    // get_instance_and_track_component may first return something in useEffect because the next-js router first gives us stuff from the URL after hydration (effects have ran) and we only create the instances if merchant and market is set
    return createRoot(dispose => {
      let firstRun = true;
      createRenderEffect(() => {
        const depict_category = get_instance_and_track_component(
          "category",
          getStateKeySignalValue(),
          "useCategoryFilterHelpers"
        );
        const functions = createHookFunctions(depict_category);
        if (firstRun) {
          firstRun = false;
          // Run cached function calls
          Object.entries(cachedFunctionCalls).forEach(([key, args]) => functions[key]?.(...args));
        }
        setHookFunctionsObject(functions);
      });
      return dispose;
    });
  }, []);

  // When props change, update our signal value so solid can react to stateKey changing
  useEffect(() => {
    setStateKeySignalValue(stateKey);
  }, [stateKey]);

  return hookFunctionsObject;
}

function createHookFunctions(depictCategory: DepictCategory<any>) {
  const categorySetShouldShowFilters = (newValue: boolean) => {
    const {
      historyStateSignals_: {
        filters_open: [, setFiltersOpen],
        sorting_open: [, setSortingOpen],
      },
    } = depictCategory;
    if (newValue) {
      // Close sorting so we don't show both at once
      setSortingOpen(false);
    }
    setFiltersOpen(newValue);
  };

  const categorySetFilter = (filter: FilterWithData) => {
    const [selectedFilters, setSelectedFilters] = depictCategory.selectedFilters_;
    const filteredFilters = untrack(selectedFilters).filter(
      ({ field, op }) => field !== filter.field && op !== filter.op
    );
    filteredFilters.push(filter);
    setSelectedFilters(filteredFilters);
  };

  const categoryExpandFilterGroup = (groupToExpand: string) => {
    const [expandedFilters, setExpandedFilters] = depictCategory.historyStateSignals_.expanded_filters;
    const newExpanded = untrack(expandedFilters).filter(({ section_ }) => section_ !== groupToExpand);
    newExpanded.push({ section_: groupToExpand, expanded_: true });
    setExpandedFilters(newExpanded);
  };

  return {
    categorySetShouldShowFilters,
    categorySetFilter,
    categoryExpandFilterGroup,
  };
}
