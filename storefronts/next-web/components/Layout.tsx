// @ts-nocheck
import { DepictProvider, useSearchField, useSearchModal, ClassicSearchModal } from "@depict-ai/react-ui/latest";
import { de_DE, sv_SE, en_GB } from "@depict-ai/react-ui/locales/latest";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import Script from "next/script";
import React, { ReactNode } from "react";
import { displayTransformers } from "../util/category-fix";
import styles from "./Layout.module.scss";

const markets = [
  {
    name: "Sweden",
    code: "se",
    locale: sv_SE,
  },
  {
    name: "Germany",
    code: "de",
    locale: de_DE,
  },
  {
    name: "Great Britain",
    code: "gb",
    locale: en_GB,
  },
] as const;

const Layout = ({
  title,
  children,
  merchant = "stronger",
}: {
  title: string;
  children: ReactNode | ReactNode[];
  merchant?: string;
}) => {
  const router = useRouter();

  let { market } = router.query;
  market ||= "se";
  const ref = React.createRef();
  const { SearchField } = useSearchField({ alignerRef: ref });
  const { open } = useSearchModal({ location: "aligned", alignerRef: ref });

  // there's no router.query when the page is rendered on the server
  const marketObj = markets.find(m => m.code === market) || markets[0];

  return (
    <DepictProvider
      merchant={merchant}
      market={market as string}
      userId="next-web-user-1234"
      sessionId="next-web-session-1234"
      locale={marketObj.locale}
      displayTransformers={displayTransformers}
      search={{
        searchPagePath: `/${market}/search`,
        enableContentSearch: true,
        searchModalComponent: ClassicSearchModal
      }}
    >
      <div className={styles.container}>
        <Head>
          <title>{title}</title>
          <meta name="description" content="Depict Search Example" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <Link href={`/${market}`}>
                <h1>Depict Search Example</h1>
              </Link>
            </div>

            <button onClick={open} className="btn">
              Search
            </button>

            <SearchField />

            <div>
              Language:{" "}
              {markets.map((market, i) => {
                return (
                  <React.Fragment key={i}>
                    <Link
                      href={{
                        pathname: router.pathname,
                        query: { ...router.query, market: market.code },
                      }}
                      className={router.query.market === market.code ? styles.active : undefined}
                    >
                      {market.code.toUpperCase()}
                    </Link>
                    {i < markets.length - 1 && <span> / </span>}
                  </React.Fragment>
                );
              })}
            </div>
            {/* Have two divs aligned in column with a red square and a blue square of 100px  */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  backgroundColor: "red",
                }}
              />
              <div
                ref={ref}
                className={"aligner"}
                style={{
                  width: "100px",
                  height: "100px",
                  backgroundColor: "blue",
                }}
              />
            </div>

            <Link href={`/${market}/category`}>
              <h3>Checkout categories</h3>
            </Link>
          </header>
          {/* Fixes placeholders being super slim for some reason which breaks scroll restoration*/}
          <div style={{ alignSelf: "normal" }}>{children}</div>
        </main>

        <footer className={styles.footer}>
          <a
            href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by{" "}
            <span className={styles.logo}>
              <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
            </span>
          </a>
        </footer>
        <Script
          src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"
          strategy="lazyOnload"
        />
      </div>
    </DepictProvider>
  );
};

export default Layout;
