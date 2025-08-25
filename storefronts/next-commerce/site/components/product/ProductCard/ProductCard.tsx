import { FC } from 'react'
import cn from 'clsx'
import Link from 'next/link'
import type { Product } from '@commerce/types/product'
import s from './ProductCard.module.css'
import Image, { ImageProps } from 'next/image'
import WishlistButton from '@components/wishlist/WishlistButton'
import usePrice from '@framework/product/use-price'
import ProductTag from '../ProductTag'
import { StrongerDisplay } from '@lib/api/SearchDisplay'
import { DepictProductCard, ImagePlaceholder } from '@depict-ai/react-ui'

interface Props {
  className?: string
  product: Product
  noNameTag?: boolean
  imgProps?: Omit<
    ImageProps,
    'src' | 'layout' | 'placeholder' | 'blurDataURL' | 'alt'
  >
  variant?: 'default' | 'slim' | 'simple'
}

const placeholderImg = '/product-img-placeholder.svg'

const stronger_aspect_ratio = 464 / 696

export const SearchProductCard: DepictProductCard<StrongerDisplay> = ({
  display: raw_display,
}) => {
  if (!raw_display) {
    return <ImagePlaceholder aspectRatio={stronger_aspect_ratio} />
  }

  const display = raw_display.variant_displays[raw_display.variant_index];

  return (
    <>
      <ProductCard
        product={{
          id: display.product_id,
          name: display.title,
          description: display.title,
          variants: [],
          options: [],
          images: [{ url: display.image_urls[0], width: 972, height: 1458 }],
          price: {
            value: display.sale_price,
            currencyCode: display.currency,
          },
          slug: 'shirt',
        }}
        variant="simple"
      />
    </>
  )
}

const ProductCard: FC<Props> = ({
  product,
  imgProps,
  className,
  noNameTag = false,
  variant = 'default',
}) => {
  const { price } = usePrice({
    amount: product.price.value,
    baseAmount: product.price.retailPrice,
    currencyCode: product.price.currencyCode!,
  })

  const rootClassName = cn(
    s.root,
    { [s.slim]: variant === 'slim', [s.simple]: variant === 'simple' },
    className
  )

  return (
    <Link
      href={`/product/${product.slug}`}
      className={rootClassName}
      aria-label={product.name}
    >
      {variant === 'slim' && (
        <>
          <div className={s.header}>
            <span>{product.name}</span>
          </div>
          {product?.images && (
            <div>
              <Image
                quality="85"
                src={product.images[0]?.url || placeholderImg}
                alt={product.name || 'Product Image'}
                height={320}
                width={320}
                layout="fixed"
                {...imgProps}
              />
            </div>
          )}
        </>
      )}

      {variant === 'simple' && (
        <>
          {process.env.COMMERCE_WISHLIST_ENABLED && (
            <WishlistButton
              className={s.wishlistButton}
              productId={product.id}
              variant={product.variants[0]}
            />
          )}
          {!noNameTag && (
            <div className={s.header}>
              <h3 className={s.name}>
                <span>{product.name}</span>
              </h3>
              <div className={s.price}>{`${price}`}</div>
            </div>
          )}
          <div className={s.imageContainer}>
            {product?.images && (
              <div>
                <Image
                  alt={product.name || 'Product Image'}
                  className={s.productImage}
                  src={product.images[0]?.url || placeholderImg}
                  height={466.5}
                  width={311}
                  quality="85"
                  layout="responsive"
                  {...imgProps}
                />
              </div>
            )}
          </div>
        </>
      )}

      {variant === 'default' && (
        <>
          {process.env.COMMERCE_WISHLIST_ENABLED && (
            <WishlistButton
              className={s.wishlistButton}
              productId={product.id}
              variant={product.variants[0] as any}
            />
          )}
          <ProductTag name={product.name} price={`${price}`} />
          <div className={s.imageContainer}>
            {product?.images && (
              <div>
                <Image
                  alt={product.name || 'Product Image'}
                  className={s.productImage}
                  src={product.images[0]?.url || placeholderImg}
                  height={540}
                  width={540}
                  quality="85"
                  layout="responsive"
                  {...imgProps}
                />
              </div>
            )}
          </div>
        </>
      )}
    </Link>
  )
}

export default ProductCard
