import type { SearchPropsType } from '@lib/search-props'
import { useRouter } from 'next/router'

import type { Brand } from '@commerce/types/site'

import { Layout } from '@components/common'
import { Container } from '@components/ui'

import useSearch from '@framework/product/use-search'

import { filterQuery, useSearchMeta } from '@lib/search'
import ErrorMessage from './ui/ErrorMessage'
import { SearchPage } from '@depict-ai/react-ui'
import { SearchProductCard } from './product/ProductCard/ProductCard'

export default function Search({ categories, brands }: SearchPropsType) {
  const router = useRouter()
  const { asPath, locale } = router
  const { q, sort } = router.query
  // `q` can be included but because categories and designers can't be searched
  // in the same way of products, it's better to ignore the search input if one
  // of those is selected
  const query = filterQuery({ sort })

  const { pathname, category, brand } = useSearchMeta(asPath)

  const activeCategory = categories.find((cat: any) => cat.slug === category)
  const activeBrand = brands.find((b: Brand) => b.slug === brand)

  const { data, error } = useSearch({
    search: typeof q === 'string' ? q : '',
    categoryId: activeCategory?.id,
    brandId: activeBrand?.id,
    sort: typeof sort === 'string' ? sort : '',
    locale,
  })

  if (error) {
    return <ErrorMessage error={error} />
  }

  return (
    <Container>
      <SearchPage productCard={SearchProductCard} />
    </Container>
  )
}

Search.Layout = Layout
