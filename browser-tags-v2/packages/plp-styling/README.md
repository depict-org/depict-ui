# Depict UI styling

Breaking changes:

- 1.1.0 set `text-decoration: none` on all links within Depict components
- 3.1.0 changed some selectors previously beginning with `.depict.recommendations` to just `.depict` which could affect custom styling
- 3.2.0 changed `.line-clamp` to be declared within the .depict selector instead of `.depict.plp` and `.depict.recommendations`
- 3.3.0 changed `.cards` to be declared within the .depict selector instead of `.depict.plp` and `.depict.recommendations`
- 4.0.0 changed `button.primary` to be declared withing the `.depict` selector and therefore be part of both the `default-theme()` and `recommendations()` mixin. Also moved Buttons.scss. 
