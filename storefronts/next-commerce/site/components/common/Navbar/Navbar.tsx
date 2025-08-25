import React, { FC } from 'react'
import Link from 'next/link'
import s from './Navbar.module.css'
import NavbarRoot from './NavbarRoot'
import { Logo, Container } from '@components/ui'
import { Searchbar, UserNav } from '@components/common'
import { ComponentAligner, useSearchModal } from '@depict-ai/react-ui'

interface Link {
  href: string
  label: string
}

interface NavbarProps {
  links?: Link[]
}

const Navbar: FC<NavbarProps> = () => {
  const ref = React.createRef<HTMLElement>()

  const { open } = useSearchModal({
    location: 'aligned',
    alignerRef: ref,
  })

  return (
    <NavbarRoot>
      <Container clean className="mx-auto max-w-8xl px-6">
        <div className={s.nav}>
          <div className="flex items-center flex-1 h-12">
            <ComponentAligner ref={ref} />

            <Link href="/" className={s.logo} aria-label="Logo">
              <Logo />
            </Link>
            <nav className={s.navMenu}>
              <Link href="/search" className={s.link}>
                Search
              </Link>
              <Link href="/category/9146602d-deba-4383-b84f-0e4135cc7fcf" className={`${s.link} test-category-page`}>
                Tights
              </Link>
              <Link href="/category/ab013fa4-6b7a-49a7-9b38-1069067b8091" className={s.link}>
                Bestsellers
              </Link>
              <button onClick={open}>🔎</button>
            </nav>
          </div>
          {process.env.COMMERCE_SEARCH_ENABLED && (
            <div className="justify-center flex-1 hidden lg:flex">
              <Searchbar />
            </div>
          )}
          <div className="flex items-center justify-end flex-1 space-x-8">
            <UserNav />
          </div>
        </div>
        {process.env.COMMERCE_SEARCH_ENABLED && (
          <div className="flex pb-4 lg:px-6 lg:hidden">
            <Searchbar id="mobile-search" />
          </div>
        )}
      </Container>
    </NavbarRoot>
  )
}

export default Navbar
