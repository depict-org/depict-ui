// @refresh reload
import { MetaProvider } from "@solidjs/meta";
import { Route, Router } from "@solidjs/router";
import { PathnameStateProvider } from "~/helpers/url_state";
import { NullMerchantMarketFallback } from "~/components/null_merchant_market_fallback";
import { StateSet } from "~/pages/with_data/state_set";
import { SelectListingPage } from "~/pages/with_data/select_listing";
import { NonSearchListingPage } from "~/pages/with_data/listing";
import { RecommendationsPage } from "~/pages/with_data/recommendations";
import { SearchPage } from "~/pages/with_data/search";
import { lazyLoadFonts } from "~/lazyLoadFonts";
import { catchify } from "@depict-ai/utilishared/latest";
import { ToplevelContextProvider } from "~/helpers/useTopLevelContext";
import { Header } from "~/components/Header";
import { LooksSliderPage } from "~/pages/with_data/looks-slider";
import { TypesPage } from "~/pages/with_data/types";
import { GapProvider } from "~/helpers/GapProvider";

export default function App() {
  catchify(lazyLoadFonts)();
  return (
    <Router
      root={props => (
        <MetaProvider>
          <ToplevelContextProvider>
            <GapProvider>
              <Header />
              {props.children}
            </GapProvider>
          </ToplevelContextProvider>
        </MetaProvider>
      )}
    >
      {/* Please wrap all components in PathnameStateProvider and all components that need merchant or market in <NullMerchantMarketFallback> */}
      <Route
        path="/"
        component={() => (
          <PathnameStateProvider>
            <NullMerchantMarketFallback />
          </PathnameStateProvider>
        )}
      />
      <Route path="/:merchant">
        <Route
          path="/"
          component={() => (
            <PathnameStateProvider>
              <NullMerchantMarketFallback />
            </PathnameStateProvider>
          )}
        />
        <Route path="/:market">
          <Route
            path="/"
            component={() => (
              <PathnameStateProvider>
                <NullMerchantMarketFallback />
              </PathnameStateProvider>
            )}
          />
          <Route path="/:locale">
            <Route
              path="/"
              component={() => (
                <PathnameStateProvider>
                  <NullMerchantMarketFallback>
                    <StateSet />
                  </NullMerchantMarketFallback>
                </PathnameStateProvider>
              )}
            />
            <Route path="/listings">
              <Route
                path="/"
                component={() => (
                  <PathnameStateProvider>
                    <NullMerchantMarketFallback>
                      <SelectListingPage />
                    </NullMerchantMarketFallback>
                  </PathnameStateProvider>
                )}
              ></Route>
              <Route path="/:listing_id">
                <Route
                  path="/"
                  component={() => (
                    <PathnameStateProvider>
                      <NullMerchantMarketFallback>
                        <NonSearchListingPage />
                      </NullMerchantMarketFallback>
                    </PathnameStateProvider>
                  )}
                ></Route>
              </Route>
            </Route>
            <Route
              path="/recommendations"
              component={() => (
                <PathnameStateProvider>
                  <NullMerchantMarketFallback>
                    <RecommendationsPage />
                  </NullMerchantMarketFallback>
                </PathnameStateProvider>
              )}
            />
            <Route
              path="/types"
              component={() => (
                <PathnameStateProvider>
                  <NullMerchantMarketFallback>
                    <TypesPage />
                  </NullMerchantMarketFallback>
                </PathnameStateProvider>
              )}
            />
            <Route
              path="/looks-slider"
              component={() => (
                <PathnameStateProvider>
                  <NullMerchantMarketFallback>
                    <LooksSliderPage />
                  </NullMerchantMarketFallback>
                </PathnameStateProvider>
              )}
            />
            <Route
              path="/search"
              component={() => (
                <PathnameStateProvider>
                  <NullMerchantMarketFallback>
                    <SearchPage />
                  </NullMerchantMarketFallback>
                </PathnameStateProvider>
              )}
            />
          </Route>
        </Route>
      </Route>
    </Router>
  );
}
