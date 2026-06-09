import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, Card } from '@ridendine/ui';

const cuisineChips = [
  { label: 'Vietnamese', href: '/chefs?cuisine=Vietnamese' },
  { label: 'Burgers', href: '/chefs?cuisine=American' },
  { label: 'Japanese', href: '/chefs?cuisine=Japanese' },
  { label: 'Italian', href: '/chefs?cuisine=Italian' },
  { label: 'Vegan', href: '/chefs?cuisine=Vegan' },
];

export function CustomerMarketplaceHero({
  activeChefs,
  liveMenuItems,
}: {
  activeChefs: number;
  liveMenuItems: number;
}) {
  return (
    <section
      data-testid="customer-marketplace-hero"
      className="relative overflow-hidden bg-background py-10 sm:py-14"
    >
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <Image
                src="/logo-icon.png"
                alt=""
                width={52}
                height={52}
                className="h-12 w-12 rounded-lg object-contain"
                priority
              />
              <div>
                <Badge tone="accent">Hamilton marketplace</Badge>
                <p className="mt-1 text-sm text-textMuted">Local chefs, fresh meals, simple delivery.</p>
              </div>
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text sm:text-5xl">
              Find chef-made meals near you.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-textMuted">
              Search local chefs, compare delivery windows, and order fresh food from Hamilton kitchens in a few taps.
            </p>

            <form
              data-testid="customer-marketplace-search-form"
              action="/chefs"
              className="mt-7 rounded-lg border border-border bg-surface p-2 shadow-md"
            >
              <label className="sr-only" htmlFor="marketplace-search">
                Search dishes, chefs, or cuisines
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="marketplace-search"
                  name="search"
                  type="search"
                  placeholder="Search dishes, chefs, or cuisines"
                  className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-background px-4 text-base text-text outline-none transition-colors placeholder:text-textSubtle focus:border-primary focus:shadow-focus"
                />
                <Button type="submit" size="lg" className="sm:w-auto">
                  Search
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular cuisines">
              {cuisineChips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-textMuted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/chefs">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Chefs
                </Button>
              </Link>
              <Link href="/account/orders">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Order Again
                </Button>
              </Link>
            </div>
          </div>

          <Card elevated padding="lg" className="border border-primary/10 bg-surface">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-textMuted">Delivering in</p>
                <p className="mt-1 font-display text-2xl font-bold text-text">Hamilton</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primarySoft p-4">
                  <p className="text-2xl font-bold text-primary">
                    {activeChefs > 0 ? activeChefs : '—'}
                  </p>
                  <p className="mt-1 text-sm text-textMuted">Local Chefs</p>
                </div>
                <div className="rounded-lg bg-accentSoft p-4">
                  <p className="text-2xl font-bold text-accent">
                    {liveMenuItems > 0 ? `${liveMenuItems}+` : '—'}
                  </p>
                  <p className="mt-1 text-sm text-textMuted">Live Dishes</p>
                </div>
              </div>
              <div className="rounded-lg border border-divider bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">Fast local delivery</p>
                    <p className="text-sm text-textMuted">Chef prep plus driver pickup, shown before checkout.</p>
                  </div>
                  <span className="rounded-full bg-successSoft px-3 py-1 text-xs font-semibold text-success">
                    Open now
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
