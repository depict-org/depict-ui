import { OnNavigation } from "@depict-ai/ui";
import { dlog } from "@depict-ai/utilishared/latest";
import { useNavigate } from "@solidjs/router";

export function make_sdk_on_navigation_cb() {
  const navigate = useNavigate();

  const on_navigation: OnNavigation = ({ new_url, is_replace, scroll }) => {
    if (new_url.origin !== location.origin) {
      dlog("External navigation detected, not using solid-start's useNavigate", new_url);
      location.assign(new_url);
      return;
    }
    navigate(new_url.pathname + new_url.search + new_url.hash, {
      replace: is_replace,
      scroll,
    });
  };
  return on_navigation;
}
