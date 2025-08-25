import { catchify } from "../logging/error";
import { get_session_id, set_session_id_fn } from "../tracking/depict_tracking";

const get_voyado_id = () => {
  const va = /\b_vaI=([^;]+)/.exec(document.cookie)?.[1];
  return va || get_session_id();
};

/**
 * Uses the default Voyado ID that is used in Voyado email recommendations.
 */
export const use_voyado_id = /*@__PURE__*/ catchify(() => {
  set_session_id_fn(get_voyado_id);
});
