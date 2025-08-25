// @ts-nocheck
const errors = [];

function dump_css(el) {
  const rules = [];
  try {
    for (const stylesheet of document.styleSheets) {
      try {
        rules.push(...getrulesfromstylehseet(el, stylesheet.cssRules));
      } catch (e) {
        errors.push(e);
      }
    }
  } catch (e) {
    errors.push(e);
  }
  return rules;
}
function getrulesfromstylehseet(el, rules_to_loop_over, csstext) {
  if (csstext) {
    // debugger;
  }
  const rules = [];
  for (const rule of rules_to_loop_over) {
    try {
      const possible_seltexts = [rule.selectorText];
      rule?.selectorText?.split(",")?.forEach(pseltext => {
        possible_seltexts.push(
          pseltext
            .split(" ")
            .map(pseltext2 => pseltext2.split(":")[0])
            .join(" ")
        );
        possible_seltexts.push(
          pseltext
            .split(" ")
            .map(pseltext2 => pseltext2.split("::")[0])
            .join(" ")
        );
        possible_seltexts.push(
          pseltext
            .split(">")
            .map(pseltext2 => pseltext2.split(":")[0])
            .join(" ")
        );
        possible_seltexts.push(
          pseltext
            .split(">")
            .map(pseltext2 => pseltext2.split("::")[0])
            .join(" ")
        );
      });
      possible_seltexts.forEach(seltext => {
        try {
          if (el?.matches?.(seltext)) {
            if (csstext) {
              rules.push(csstext);
            } else {
              // try to figure out which part of the selector matches the element and only push that
              // TODO
              const possible_selectors = rule.selectorText.split(",");
              const matching_selectors = [];
              for (const selector of possible_selectors) {
                if (el?.matches?.(selector)) {
                  matching_selectors.push(selector);
                }
              }
              if (matching_selectors.length) {
                const reworking_rule = rule.cssText.split("{");
                reworking_rule[0] = matching_selectors.join(",");
                rules.push(reworking_rule.join("{"));
              } else {
                rules.push(rule.cssText);
              }
            }
          }
        } catch (e) {
          errors.push(e);
        }
      });
      if (rule?.cssRules?.length || rule.type === 4) {
        if (!rule?.media?.mediaText) {
          rules.push(...getrulesfromstylehseet(el, rule.cssRules, rule.cssText));
        } else {
          const ruletexts = getrulesfromstylehseet(el, rule.cssRules);
          for (const ruletext of ruletexts) {
            rules.push(`@media ${rule.media.mediaText} { ${ruletext} }`);
          }
        }
      }
    } catch (e) {
      errors.push(e);
    }
  }
  return rules;
}
function dump_recursive(el) {
  const css = [];
  css.push(...dump_css(el));
  for (const node of el.childNodes) {
    css.push(...dump_recursive(node));
  }
  return css;
}
function dump_with_children(el) {
  const deduplicated_result = [...new Set(dump_recursive(el))].join("\n");
  console.error(errors);
  return deduplicated_result;
}

window.dump_rules = dump_with_children;
