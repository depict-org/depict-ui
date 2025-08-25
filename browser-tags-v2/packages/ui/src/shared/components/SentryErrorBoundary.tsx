/** @jsxImportSource solid-js */
import { createContext, ErrorBoundary, JSX as solid_JSX, useContext } from "solid-js";
import { report } from "@depict-ai/utilishared";
import { ProductCardError } from "../../sdks/errors";

const ExtraInfoContext = /*@__PURE__*/ createContext<() => Record<string, any>>();

/**
 * SentryErrorBoundaries within this provider will call getContext_ when an error happens and add that context to sentry
 */
export function ExtraSentryContextProvider(props: {
  children: solid_JSX.Element;
  getContext_: () => Record<string, any>;
}) {
  return <ExtraInfoContext.Provider value={props.getContext_}>{props.children}</ExtraInfoContext.Provider>;
}

export function SentryErrorBoundary(props: {
  children: solid_JSX.Element;
  message_: string;
  severity_: Parameters<typeof report>[1];
  on_error_?: (retry: VoidFunction) => solid_JSX.Element | void;
  class_list_?: string[];
}) {
  const getContextFunction = useContext(ExtraInfoContext);

  return ErrorBoundary({
    fallback(err: Error, retry) {
      const { message_, severity_ } = props;
      let message = message_;

      if (err instanceof ProductCardError) {
        console.error(err.cause);
        message = `${message}: ${err.message}`;
      } else {
        report([err, message_], severity_, getContextFunction?.());
      }
      return (
        <div classList={Object.fromEntries(props.class_list_?.map(c => [c, true]) || [])}>
          {message}
          {props.on_error_?.(retry) as solid_JSX.Element}
        </div>
      );
    },
    get children() {
      return props.children;
    },
  });
}
