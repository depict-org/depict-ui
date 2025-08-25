// @ts-nocheck
import Layout from "../../../components/Layout";
import Link from "next/link";
import { useRouter } from "next/router";

const categoryPages: [string, string][] = [["news", "a8f79b9d-ea83-4da5-9b96-74d1c42daeeb"], ["tights", "9146602d-deba-4383-b84f-0e4135cc7fcf"], ["bestsellers", "ab013fa4-6b7a-49a7-9b38-1069067b8091"], ["gym", "3cdfe5c4-62fc-4003-9482-d45be34ef260"], ["running", "8771d243-fb10-4131-9be8-e424b3eafc57"]];

export default function CategoryOverview() {
  const router = useRouter();
  const { market } = router.query;

  return (
    <Layout title={"Category Page"} merchant={"stronger"}>
      <h1>Category pages</h1>
      {categoryPages.map(([name, id]) => (
        <><Link href={`/${market}/category/${id}`}>{name}</Link><br /></>
      ))}
    </Layout>
  );
}
