export default async function try_until({
  t,
  to_try,
  until,
}: {
  t: TestController;
  to_try?: () => Promise<void>;
  until: () => Promise<boolean>;
}) {
  for (let i = 0; i < 20; ++i) {
    await to_try?.();

    if (await until()) {
      break;
    }
    await t.wait(i * 50);
  }
}
