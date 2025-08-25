import { DepictCategory, DepictSearch } from "@depict-ai/ui";
import { globalState } from "../global_state";
import { onCleanup } from "solid-js";
import { create_search_instance } from "./create_search_instance";
import { create_category_instance } from "./create_category_instance";

type InstanceType<T> = T extends "search" ? DepictSearch<any> : DepictCategory<any>;

/*
 * Called in the solid component part of an exported component this keeps track of how many components are currently rendered that are part of the same instance. Add this in every search and category component that needs a DepictSearch or DepictCategory instance.
 * Also returns the instance for convenience.
 */
export function get_instance_and_track_component(
  type: "search",
  stateKey: string | undefined,
  componentName: string
): DepictSearch<any>;

export function get_instance_and_track_component(
  type: "category",
  stateKey: string | undefined,
  componentName: string
): DepictCategory<any>;

export function get_instance_and_track_component(
  type: "search" | "category",
  stateKey: string | undefined,
  componentName: string
): InstanceType<typeof type> {
  const instances = globalState[type + "_instances"] as Map<
    string | undefined,
    { instance: InstanceType<typeof type>; dispose?: VoidFunction; users: number }
  >;
  if (!instances.get(undefined)) {
    throw Error(
      `${componentName}: State not set up. Did you forget to wrap your app in DepictProvider? Also make sure you've provided a merchant and a market.`
    );
  }
  let instance = instances.get(stateKey);

  if (!instance) {
    instance = type === "search" ? create_search_instance(true, stateKey) : create_category_instance(true, stateKey);
    instances.set(stateKey, instance);
  }

  instance.users++;

  onCleanup(() => {
    instance!.users--;
    if (!instance!.users && instance?.dispose) {
      // main instance is not disposable, and shouldn't be deletable either
      instance.dispose();
      instances.delete(stateKey);
    }
  });

  return instance.instance;
}
