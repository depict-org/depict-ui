import { createMemo } from "solid-js";
import { Title } from "@solidjs/meta";

export function Home(props: { needs?: [] | ["locale"] | ["market", "locale"] | ["merchant", "market", "locale"] }) {
  const list_formatter = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

  const a_what = createMemo(() => list_formatter.format(props.needs || []));
  return (
    <main>
      <Title>Preview Browser</Title>
      <h1>Preview Browser</h1>
      <p>Please configure a {a_what()}</p>
    </main>
  );
}
