import { useRouter } from 'next/router'
import { Layout } from '@components/common'
import { Container } from '@components/ui'
import { CategoryPage } from '@depict-ai/react-ui'
import { SearchProductCard } from '@components/product/ProductCard/ProductCard'
import NotFound from 'pages/404'

export default function CategoryListingPage() {
  const router = useRouter()

  if (router.isFallback) return <h1>Loading...</h1>

  const { id } = router.query
  if (typeof id !== 'string') return NotFound()

  return (
    <Container>
      <CategoryPage listingQuery={{id: id, type: "listingId"}} productCard={SearchProductCard} />
    </Container>
  )
}

CategoryListingPage.Layout = Layout
