import { version } from "./version";
import { add_to_version_info } from "./utilities/version_info";

// We can't use export * here since it makes everything that depends on utilishared or depends on something that depends on utilishared *HUGE*, even if it's only using one small utility function
// See parcel issue: https://github.com/parcel-bundler/parcel/issues/8676

export { setOverrideSentryEnvironment } from "./logging/sentry";
export { findMostFrequentItem } from "./utilities/findMostFrequentItem";
export { base64_decode_unicode, base64_encode_unicode } from "./utilities/base64";
export { make_plp_recommendations_inserted_handler } from "./tracking/make_plp_recommendations_inserted_handler";
export { version_info, add_version_query_params } from "./utilities/version_info";
export { cache_args } from "./deprecated/cache_args";
export { check_displays } from "./deprecated/check_displays";
export { err } from "./deprecated/err";
export { require_event_listener } from "./deprecated/event_listener";
export { infinite_promise_creator } from "./deprecated/infinite_promise";
export { infinite_promise_no_skip } from "./deprecated/infinite_promise_noskip";
export { placeholder } from "./deprecated/placeholder";
export { insert_styling_into_slider } from "./deprecated/slider";
export { default as wpff } from "./deprecated/wpf";
export { ElementObserver, observer } from "./element-observer/index";
export type { ElementObserverEvent, Disconnector } from "./element-observer/index";
export { jsx, jsxs, use_element, use_listener, classlist, Fragment } from "./jsx-runtime";
export { dlog, derror, dwarn, set_browser_prefix } from "./logging/dlog";
export { catchify, report } from "./logging/error";
export { is_debug } from "./logging/is_debug";
export { chevronLeft, chevronRight } from "./rendering/chevrons-jsx";
export { expandingContainer } from "./rendering/expanding-container";
export { Lazyfier, test_array_proxy_support } from "./rendering/image_lazyloader";
export { Amazing_Slider } from "./rendering/pure_slider";
export type { Slider_Options } from "./rendering/pure_slider";
export { colorize_elements, should_colorizeLogics } from "./rendering/recommendation-renderer/colorize_logics";
export {
  n_col_styling_with_dist,
  Layout,
  layout_get_visible_recs_without_partial_rows,
  layout_get_total_rec_amount_for_row,
  layout_media_query_header,
} from "./rendering/recommendation-renderer/layout";
export type { LayoutOptions, ColAtSize, ColsAtSize } from "./rendering/recommendation-renderer/layout";
export type {
  Display,
  LegacyDisplay,
  Node_Array,
  Node_Iterable,
  RecRendererResult,
} from "./rendering/recommendation-renderer/types";
export { slider_autoscroll_factory } from "./rendering/slider_autoscroll";
export { make_button1 } from "./rendering/slider_buttons1";
export { make_button2 } from "./rendering/slider_buttons2";
export { slider_dots_factory, navdot } from "./rendering/slider_dots";
export { slider_draggable_factory } from "./rendering/slider_draggable";
export { slider_fading_factory } from "./rendering/slider_fading";
export { slider_fractional_factory } from "./rendering/slider_fractional_scroll";
export { slider_show_scroll } from "./rendering/slider_show_scroll";
export { slider_snap_css, can_use_snapping_and_still_scroll } from "./rendering/slider_snap_css";
export { slider_snapping_factory } from "./rendering/slider_snapping";
export { Amazing_Lazy_Slider } from "./rendering/slider_with_lazy";
export { sizes_to_surface, surface_mixer, promise_until_next_navigation } from "./rendering/surface_mixer";
export { bind_to_a2c_button, bind_tracking_to_link } from "./tracking/add_to_cart_through_recbar_tracker";
export type { A2CTrackingFunction } from "./tracking/add_to_cart_through_recbar_tracker";
export {
  depict_click,
  depict_prefilled,
  depict_add_to_cart,
  set_session_id_fn,
  get_session_id,
  get_cookie,
  get_tracking_event_context_data,
} from "./tracking/depict_tracking";
export type { TrackingEventContextData } from "./tracking/depict_tracking";
export type { depict_payload, noisy_depict_payload, depict_body, event_types } from "./tracking/depict_transmission";
export {
  filter_depict_payload,
  send_depict,
  foolproof_send_beacon,
  send_depict_unfiltered,
  send_websocket,
} from "./tracking/depict_transmission";
export { create_ga_queue, make_tracker_send_to_depict } from "./tracking/ga_redirection";
export {
  send_impression_event,
  impression_track_element,
  impression_tracking_post_processor,
  set_impression_threshold,
  impression_threshold,
  has_to_be_intersecting_for,
} from "./tracking/impression/index";
export type { ImpressionEvent, ExplicitImpressionEventData } from "./tracking/impression/index";
export { add_new_tab_listener, broadcast_product_id, contextmenu_callback } from "./tracking/new_tab_click_emulator";
export { send_page_view_if_needed, send_page_view_on_navigation } from "./tracking/send_page_view_if_needed";
export type { PageViewEventData, PageViewTrackingData } from "./tracking/send_page_view_if_needed";
export { DepictAPIWS } from "./tracking/strongwilled_ws_client";
export type { AutoReconnectingWS } from "./tracking/strongwilled_ws_client";
export { ListenableSet } from "./utilities/ListenableSet";
export type { ListenableSetEvent } from "./utilities/ListenableSet";
export { deparallelize, deparallelize_no_drop } from "./utilities/async_function_only_once";
export type { AsyncFunction } from "./utilities/async_function_only_once";
export { buildThresholdList } from "./utilities/build_threshold_list";
export { chaotic_closest } from "./utilities/chaotic_closest";
export {
  standard_price_format,
  ensure_object_path,
  ensure_parameter_in_url,
  html2elems,
  html2elem,
  querySelectorAllElements,
  querySelectorUpwards,
  intl_number_format_with_fallback,
  relativify,
} from "./utilities/common_noapi";
export { deduplicate, dedup_products } from "./utilities/dedup";
export { navigate_with_next_router } from "./utilities/external_apis/nextjs/navigate_with_next_router";
export type { AddToCartOptions, ShopifyError, ShopifyItem, ShopifyEvent } from "./utilities/external_apis/shopify";
export {
  add_item,
  get_items_in_cart,
  get_shopify_analytics_meta_product,
  intercept,
} from "./utilities/external_apis/shopify";
export { fetch_replacer, FakeResponse } from "./utilities/fetch_replacement_toolbox";
export { fetch_retry } from "./utilities/fetch_retry";
export {
  stateless_href_change_ipns,
  href_change_ipns,
  history_replacer,
  on_next_navigation,
  instant_exec_on_suspect_history_change,
} from "./utilities/history";
export {
  async_iterable_ipns,
  make_ipns_stateful,
  make_ipns_stateless,
} from "./utilities/infinite_promise/async_iterable_ipns";
export type { IPNS } from "./utilities/infinite_promise/async_iterable_ipns";
export { make_simple_async_iterable, RawObservableInformation } from "./utilities/infinite_promise/infinite_promise_v3";
export { iterable_to_attribute } from "./utilities/infinite_promise/iterable_to_attribute";
export { iterable_to_elems } from "./utilities/infinite_promise/iterable_to_elems";
export { make_asyncIterable_exiter } from "./utilities/infinite_promise/make_asynciterable_exitable";
export { zip_async_iterables } from "./utilities/infinite_promise/zip_async_iterables";
export { insert_surfaces, prevent_infinite_loop, revertable_remove } from "./utilities/insert_surface";
export {
  insert_styling,
  depict_init,
  depict_init_with_market_logic,
  normal_get_product_id,
} from "./utilities/integration";
export type { InsertionVerb, Surface } from "./utilities/integration";
export { javascript_media_query } from "./utilities/javascript_media_query";
export { patched_querySelectorAll } from "./utilities/patched_querySelectorAll";
export { Promise_Any } from "./utilities/promise_any";
export { queueMacroTask } from "./utilities/queueMacroTask";
export { rand } from "./utilities/rand";
export { random_string, make_random_classname } from "./utilities/random_string";
export { reactive_template } from "./utilities/reactive_template";
export type { ReactiveTemplateValueContents } from "./utilities/reactive_template";
export { removeChild_error_swallowing_factory } from "./utilities/removeChild_error_swallowing_factory";
export {
  replace_promise_with_native_if_exists_and_enforce,
  get_iframe_promise,
} from "./utilities/restore_native_promise";
export { rp_relativify_fetch, rp_relativify_history, rp_relativify_xhr, default_rp_fixes } from "./utilities/rp_tools";
export { serialize_object } from "./utilities/serializer";
export { sort_obj } from "./utilities/sort_obj";
export { standard_get_market } from "./utilities/standard_get_market";
export { listenToLocalStorage } from "./utilities/storage";
export { timeout_promise } from "./utilities/timeout_promise";
export { variable_setter_to_ipns, find_descriptor, is_available_in } from "./utilities/variable_waiter";
export { use_voyado_id } from "./utilities/voyado";
export { wait } from "./utilities/wait";
export { xhr_load, xhr_read_interceptor, xhr_send_interceptor, xhr_replace } from "./utilities/xhr-replace";
export { DefaultViewMoreButton } from "./components/DefaultViewMoreButton";
export { GeneralSideSlidein } from "./components/GeneralSideSlidein";
export { GeneralSizeSelector } from "./components/GeneralSizeSelector";
export { Placeholder, ContainedPlaceholderImage } from "./components/Placeholder";
export { RecommendationContainer } from "./components/RecommendationContainer";
export { LeftChevron, RightChevron } from "./components/chevrons";
export type { ColorObj } from "./components/createColorPicker";
export { createColorPicker } from "./components/createColorPicker";
export { useExpandingContainer } from "./components/expanding";
export { ContainedHoverImage } from "./components/hover_image";
export { ContainedImage } from "./components/image";
export type { ImageOptions } from "./components/image";
export {
  make_sizes_setter,
  make_sourceset_component,
  is_safari,
  make_url_with_query_params,
  resize_base_url,
} from "./components/srcset";
export { base_url } from "./constants";
export { Sentry } from "./logging/sentry_instance";
export { camelCasifyObject, snakeCasifyObject } from "./utilities/camelCasifyObject";
export { rgb_to_hsl, hsl_to_rgb, relative_luminance_from_rgb, hsb_to_rgb, hex_to_rgb } from "./utilities/color";
export { version, add_to_version_info };
export { sync_el_content_with_accessor } from "./utilities/sync_el_content_with_accessor";
export { use_href_accessor } from "./utilities/use_href_accessor";

add_to_version_info("utilishared", version);
