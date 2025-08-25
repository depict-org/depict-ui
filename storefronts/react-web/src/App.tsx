import React, { useEffect, useState } from "react";
import { FrontPage } from "./FrontPage";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { ProductPage } from "./ProductPage";
import { DepictProvider, useSearchModal, ClassicSearchModal } from "@depict-ai/react-ui";
import * as locales from "@depict-ai/react-ui/locales";
import { SearchResultsPage } from "./SearchPage";
import { CategoryListingPage } from "./CategoryPage";
import { displayTransformers } from "./category-fix";

const availableLocales = Object.keys(locales);
const categoryPath = "/category";

function Router() {
  const { open } = useSearchModal({
    location: "centered",
  });
  const navigate = useNavigate();

  const defaultDelivery = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const location = useLocation();

  const [language, setLanguage] = useState("sv_SE");
  const [userId, setUserId] = useState("377693");
  const [marketId, setMarketId] = useState("SE-sv_SE");

  const [delivery_date, setDeliveryDate] = useState(defaultDelivery.toISOString().split("T")[0]);
  const metaData = { delivery_date };

  const rotateLang = () => {
    const i = availableLocales.indexOf(language);
    setLanguage(availableLocales[(i + 1) % availableLocales.length]);
  };

  return (
    <DepictProvider
      locale={locales[language as keyof typeof locales]}
      merchant={"mayadelorez"}
      market={marketId}
      navigateFunction={navigate}
      displayTransformers={displayTransformers}
      search={{
        searchPagePath: "/search",
        enableContentSearch: true,
        searchModalComponent: ClassicSearchModal
      }}
      sessionId={userId}
      metaData={metaData}
    >
      <div className="navbar">
        <button className="search-button" onClick={open}>
          Open search 🥺
        </button>
        <button className="lang-button" onClick={() => rotateLang()}>
          Next language - {language}
        </button>
        <div className="inputs">
          <div className="input">
            Market
            <input type="text" placeholder="market ID" value={marketId} onChange={e => setMarketId(e.target.value)} />
          </div>
          <div className="input" style={{ display: "flex" }}>
            <button onClick={setMarketId.bind(globalThis, "US-en_GB")}>MD US</button>
            <button onClick={setMarketId.bind(globalThis, "SE-sv_SE")}>MD SE</button>
          </div>
          <div className="input">
            User ID
            <input type="text" placeholder="userId" value={userId} onChange={e => setUserId(e.target.value)} />
          </div>
          <div className="input">
            Delivery date
            <input
              type="text"
              placeholder="delivery date"
              value={delivery_date}
              onChange={e => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route path="/pdp" element={<ProductPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path={categoryPath} element={<CategoryListingPage />} />
      </Routes>
    </DepictProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div>
        <Router />
      </div>
    </BrowserRouter>
  );
}
