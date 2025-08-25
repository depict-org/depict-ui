import { CallbackableNode, Disconnector, ListenerNames } from "./ElementObserver";

export class ElementObserverEvent<
  ElemType extends CallbackableNode = HTMLElement,
  SelectorType extends string | CallbackableNode = string | CallbackableNode,
> {
  constructor(opts: {
    element_: ElemType;
    selector_: SelectorType;
    disconnector_: Disconnector;
    mutation_record_?: MutationRecord;
    event_?: ListenerNames;
  }) {
    this.element = opts.element_;
    this.selector = opts.selector_;
    this.disconnector = opts.disconnector_;
    opts.mutation_record_ && (this.mutation_record = opts.mutation_record_);
    opts.event_ && (this.event = opts.event_);
  }
}

export interface ElementObserverEvent<
  ElemType extends CallbackableNode = HTMLElement,
  SelectorType extends string | CallbackableNode = string | CallbackableNode,
> {
  element: ElemType;
  selector: SelectorType;
  disconnector: Disconnector;
  mutation_record?: MutationRecord;
  event?: ListenerNames;
}
