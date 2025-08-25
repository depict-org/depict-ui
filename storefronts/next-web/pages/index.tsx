// @ts-nocheck
import Link from "next/link";
import React from "react";
import Layout from "../components/Layout";
import { Title } from "../components/Title";

export default function Home() {
  return (
    <Layout title="Welcome home">
      <Title>
        Go to <Link href={`/se/search`}>Search!</Link>
      </Title>
    </Layout>
  );
}
