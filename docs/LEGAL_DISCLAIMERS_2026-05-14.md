# Legal Disclaimers Inventory — 2026-05-14

> **Status: DRAFT — NOT LEGALLY REVIEWED**
>
> This document inventories every user-facing surface in the four Ridendine apps where a legal disclaimer or notice is required, with draft text written by an engineer (not a lawyer). The intent is that counsel reviews this single document and the corresponding code surfaces below, then we replace the drafts with final approved text.
>
> Until then, every disclaimer surface in the apps carries a visible "DRAFT — Pending Legal Review" banner so beta testers know the wording is preliminary.

## 1. Privacy Policy & Terms of Service pages

**Location:** `apps/{web,chef-admin,driver-app}/src/app/{privacy,terms}/page.tsx`

**State today:** Auto-generated placeholder content lives in `apps/web/src/app/privacy/page.tsx` (155 lines) and `apps/web/src/app/terms/page.tsx`. The chef-admin and driver-app privacy/terms pages currently exist but the content matches the customer-facing version, which is wrong (chefs and drivers have different rights and obligations than customers).

**What counsel must provide before public launch:**
- Customer-facing Privacy Policy (compliant with PIPEDA in Canada, GDPR if EU traffic, CCPA if CA traffic)
- Customer-facing Terms of Service (defines liability cap, dispute resolution, governing law)
- Chef-facing Terms (chef as independent contractor, food safety responsibility, payouts, taxes)
- Driver-facing Terms (driver as independent contractor, insurance, license, conduct)
- A separate or embedded Cookie Notice if cookies are used for analytics/marketing (Vercel Analytics is currently in use)

**Beta-acceptable interim:** the existing placeholder text PLUS a prominent yellow "DRAFT — Pending Legal Review" banner at the top.

## 2. Customer signup — T&C and Privacy acceptance

**Location:** `apps/web/src/app/auth/signup/page.tsx`

**Required disclaimer (must be visible at point of account creation):**

> By creating an account, you agree to RideNDine's **[Terms of Service](/terms)** and **[Privacy Policy](/privacy)**. You confirm you are 18 years of age or older.

**Why:** unambiguous consent + age gate. Without this, the platform has no enforceable contract with customers, and food-delivery services typically restrict to adults (alcohol delivery, dispute capacity).

## 3. Checkout — payment processing + refund policy + delivery ETA

**Location:** `apps/web/src/app/checkout/page.tsx` (above or below the Stripe Elements form)

**Required disclaimers:**

> **Payment processing.** All payments are processed by Stripe. RideNDine does not store your full card number; payment information is handled directly by Stripe under PCI DSS compliance.
>
> **Refunds.** If your order is cancelled before the chef accepts, your payment is voided. After acceptance, refunds are issued at RideNDine's discretion based on the order status and our [Refund Policy](/terms#refunds). Refunds typically post back to your original payment method within 5–10 business days.
>
> **Delivery time.** The estimated delivery time displayed at checkout is an estimate, not a guarantee. Actual delivery time depends on chef preparation, driver availability, traffic, and weather.

## 4. Customer chef/menu page — food allergen + preparation disclaimer

**Location:** `apps/web/src/app/chefs/[slug]/page.tsx` (above the menu list)

**Required disclaimer:**

> **Allergen notice.** Menu items are prepared in private home kitchens, not commercial facilities. Despite each chef's best efforts, cross-contact with major allergens (peanuts, tree nuts, dairy, eggs, wheat/gluten, soy, fish, shellfish, sesame) cannot be guaranteed. Customers with severe allergies or dietary restrictions should contact the chef directly via the order's special-instructions field, or consider ordering from chefs whose kitchens are certified allergen-free.
>
> RideNDine displays ingredient and dietary information as provided by the chef and is not responsible for inaccuracies. Always confirm with the chef before ordering if you have a serious dietary concern.

## 5. Chef signup — independent contractor + food safety + tax + insurance

**Location:** `apps/chef-admin/src/app/auth/signup/page.tsx`

**Required disclaimer (must be agreed to before account creation):**

> **You are an independent contractor, not an employee.** RideNDine does not direct your work, set your hours, or guarantee any minimum income. You are responsible for your own taxes, including reporting all income from RideNDine on your annual tax return (Canada: T4A/T2125; US: 1099-NEC/Schedule C).
>
> **Food safety responsibility.** You are solely responsible for compliance with all applicable food safety laws, regulations, and health-department requirements in your jurisdiction. You agree to maintain a clean kitchen environment, store and handle food at safe temperatures, and disclose ingredients and allergens accurately.
>
> **Insurance.** Although not required by RideNDine, you are strongly encouraged to carry product liability insurance covering home-based food preparation.
>
> **Platform fees.** RideNDine charges a platform fee of 15% of the menu subtotal. Delivery fees and service fees collected from customers are remitted separately. Weekly payouts are processed via Stripe Connect.

## 6. Chef storefront publish — kitchen address + permit confirmation

**Location:** `apps/chef-admin/src/app/dashboard/storefront/page.tsx` (when chef updates kitchen address or attempts to publish)

**Required disclaimer:**

> By publishing your storefront you confirm that:
> - The kitchen address listed is accurate and is the location where food is prepared.
> - You have obtained any food handler certification, business licence, or municipal permit required in your jurisdiction.
> - Inspection or audit by RideNDine ops or by a health authority may occur with reasonable notice.

## 7. Driver signup — independent contractor + license + insurance + background check

**Location:** `apps/driver-app/src/app/auth/signup/page.tsx`

**Required disclaimer:**

> **You are an independent contractor, not an employee.** RideNDine does not guarantee shifts, hours, or income. You set your own availability.
>
> **License and insurance.** You confirm that you hold a valid driver's licence and that the vehicle you use for deliveries is insured. Your insurance must cover commercial or rideshare-style use; check with your insurer if uncertain. RideNDine does not provide insurance coverage for drivers, vehicles, or accidents during delivery.
>
> **Background check.** You consent to a background check before activation. Activation requires no disqualifying offences in the past 5 years (specific criteria are defined in the driver agreement).
>
> **Tax reporting.** Earnings from RideNDine are taxable income. RideNDine will issue tax statements at year-end (Canada: T4A; US: 1099-NEC).

## 8. Active delivery — safe driving notice

**Location:** `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx` (at the top of the active delivery view)

**Required disclaimer (small, persistent):**

> Drive safely. Do not use this app while the vehicle is in motion. Park before tapping any status update.

## 9. Customer reviews — moderation notice

**Location:** `apps/web/src/app/orders/[id]/review/page.tsx` or similar review-submission UI (if it exists; otherwise wherever reviews are submitted)

**Required disclaimer:**

> Reviews must reflect your actual experience. Reviews that are abusive, defamatory, contain personal information about other people, or appear to violate our [Content Guidelines](/terms#reviews) may be moderated or removed. Submitting a review grants RideNDine a perpetual non-exclusive licence to display it on the platform.

## 10. Account deletion — order history retention

**Location:** `apps/web/src/app/account/settings/page.tsx` (any account-deletion flow)

**Required disclaimer:**

> Deleting your account removes your personal profile, addresses, and payment methods from RideNDine. **Order history and ledger entries cannot be deleted** because they are required for tax, accounting, and dispute-resolution purposes; they are retained for the minimum period required by applicable law (typically 7 years in Canada). After deletion you cannot recover your account; you may create a new account with a different email.

## 11. Marketing / promotional emails — consent

**Location:** `apps/web/src/app/account/settings/page.tsx` (preferences) and `apps/web/src/app/auth/signup/page.tsx` (initial opt-in)

**Required disclaimer:**

> Promotional emails (new chefs in your area, weekly promos, surveys) are only sent if you opt in. You can opt out at any time from your account settings or by clicking the unsubscribe link in any email. Transactional emails (order confirmations, delivery updates, receipts) are not opt-outable while you have an active account.

## 12. Footer — copyright + legal links + business address

**Location:** Every page footer in all 4 apps

**Required content:**

> © 2026 RideNDine Inc. All rights reserved.
> [Terms](/terms) · [Privacy](/privacy) · [Contact](/contact)
> RideNDine Inc., 123 Main Street, Hamilton, ON L8P 1A1, Canada
> Business Number: [pending — to be issued by CRA]

## 13. Cookie / tracking notice

**Location:** First-load banner on all 4 apps (customer-facing especially)

**Required content (consent banner):**

> RideNDine uses cookies for authentication, cart persistence, and (with your consent) anonymous analytics. By clicking "Accept All" you agree to optional analytics cookies. You can manage your preferences at any time. See our [Privacy Policy](/privacy) for details.
>
> [Accept All] [Reject Optional] [Manage Preferences]

**Beta-acceptable interim:** none — but if there's any EU traffic the banner is legally required (GDPR consent must be opt-in not opt-out). Strongly recommended even for Canadian-only beta because Vercel Analytics fires a tracking pixel on every page load.

## 14. Restricted-items policy

**Location:** Chef menu management UI (`apps/chef-admin/src/app/dashboard/menu/`) and Terms page

**Required disclaimer (visible during menu-item creation):**

> Restricted items: alcoholic beverages, cannabis-derived products, raw oysters, unpasteurised dairy, raw fish/sushi-grade items, and prepared baby formula may not be sold via RideNDine without explicit pre-approval. Items found in violation will be removed and the chef account may be suspended.

## 15. Driver tip policy

**Location:** Checkout tip section + driver onboarding

**Required disclaimer:**

> Tips left by the customer go directly to the driver in full. RideNDine does not take a cut of tips and does not use tips to offset the driver's base delivery fee.

## 16. Surge pricing notice

**Location:** Checkout breakdown when surge multiplier > 1

**Required disclaimer:**

> Delivery fee is currently subject to a surge multiplier of {N}x due to high demand in your area. The base delivery fee plus the surge increment is shown in your order summary. Surge does not affect the menu price or service fee.

---

## Severity ranking

| # | Disclaimer | Severity | Why |
|---|---|---|---|
| 1 | Privacy + ToS pages | **Critical** | No enforceable contract, no privacy-law compliance |
| 2 | Customer signup acceptance | **Critical** | Required for contract formation |
| 5 | Chef signup IC + food safety | **Critical** | Misclassification + tax exposure + liability |
| 7 | Driver signup IC + insurance | **Critical** | Same as chef plus accident liability |
| 13 | Cookie notice | High | GDPR if any EU traffic; recommended otherwise |
| 4 | Allergen notice | High | Direct safety concern — home kitchens are unregulated |
| 3 | Checkout payment + refund + ETA | High | Manages customer expectations + Stripe legal alignment |
| 6 | Chef storefront publish | Medium | Confirms permit/licensing |
| 14 | Restricted items | Medium | Limits platform liability for alcohol/cannabis/etc. |
| 10 | Account deletion retention | Medium | Required for data-subject-rights compliance |
| 12 | Footer + business address | Medium | Required by Canadian commercial-disclosure laws |
| 8 | Driver safe-driving notice | Low | Mostly a "we told you" liability shield |
| 9 | Review moderation | Low | Sets expectations + IP licence |
| 11 | Marketing opt-in | Low | Required by CASL in Canada but most users won't opt in |
| 15 | Driver tip policy | Low | Honesty signal — not strictly required |
| 16 | Surge pricing | Low | Honesty signal — not strictly required |

---

## What's already in the apps

- `apps/web/src/app/privacy/page.tsx` — 155 lines of detailed placeholder content. **Needs visible DRAFT banner.**
- `apps/web/src/app/terms/page.tsx` — placeholder content. **Needs visible DRAFT banner.**
- `apps/chef-admin/src/app/privacy/page.tsx` — appears to be the customer copy. **Wrong audience — needs chef-specific rewrite.**
- `apps/driver-app/src/app/privacy/page.tsx` — same. **Needs driver-specific rewrite.**
- All other disclaimer surfaces (2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16): **NOT present in the code.**

## Recommendation

For beta launch with NDA-bound testers:
- Add visible "DRAFT — Pending Legal Review" banner to all 6 existing legal pages (this commit does that).
- Add the most critical inline disclaimers (signup acceptance #2, #5, #7) so testers see the structure even if wording is preliminary.

For public launch:
- All 16 items must be legally reviewed and replaced.
- Engage counsel to draft jurisdiction-specific text (Hamilton ON for soft launch).
- Implement the cookie banner (#13) if any tracking is enabled.

---

## Implementation Status — 2026-05-14

### Shipped this branch

- **DRAFT banner on all 6 legal pages** — amber `role="alert"` block at top of `privacy` and `terms` pages in `apps/web`, `apps/chef-admin`, `apps/driver-app`.
- **Customer signup acknowledgement** — expanded existing T&C checkbox label at `apps/web/src/app/auth/signup/page.tsx` to include age 18+, marketplace-not-restaurant clause, allergen-review reminder.
- **Chef signup acknowledgement** — added a second required checkbox at `apps/chef-admin/src/app/auth/signup/page.tsx` covering independent-contractor status, food-safety responsibility, food-handler certifications/permits, tax reporting, allergen accuracy. Form rejects submission without it.
- **Driver signup acknowledgement** — added a second required checkbox at `apps/driver-app/src/app/auth/signup/page.tsx` covering independent-contractor status, valid licence, commercial-delivery-eligible insurance, no-phone-while-driving, tax reporting. `validateForm` updated.

### DRAFT texts authored, not yet wired into the app

Each block below is the DRAFT wording counsel should review. Wiring happens after counsel approval — keep wording in this doc as the single source of truth.

#### Checkout — Order Authorization
**Location:** `apps/web/src/app/checkout/page.tsx` (above Place Order button)

> **DRAFT — Order Authorization.** By placing this order you authorize RideNDine to charge your selected payment method for the total shown, including taxes and fees. Delivery times are **estimates**, not guarantees, and depend on chef preparation and driver availability. Food is prepared by an independent chef, not by RideNDine. Refund requests must be submitted within **24 hours** of delivery via the order page — refunds are evaluated case-by-case.

#### Allergen / dietary banner — Chef storefront menu
**Location:** `apps/web/src/app/chefs/[slug]/page.tsx` (above menu list) and on each menu-item modal

> **DRAFT — Allergen Notice.** Ingredient, allergen, and dietary information is provided by the chef and has not been independently verified by RideNDine. Food is prepared in a home kitchen that may also handle nuts, dairy, eggs, gluten, shellfish, and other common allergens. **If you have a severe allergy, contact the chef directly through the order page before ordering.** RideNDine is not liable for allergic reactions or dietary incidents.

#### Cookie / tracking banner — first-visit footer banner (all customer-facing apps)
**Location:** new `<CookieBanner />` in `packages/ui`, mounted in root layout of each app

> **DRAFT — Cookies & Tracking.** We use cookies and similar technologies to keep you signed in, remember your cart, process orders, and understand how RideNDine is used. By continuing to use the site you accept these cookies. You can manage preferences in your browser settings. Read our [Privacy Policy](/privacy) for details. **[Accept] [Manage]**

#### CASL marketing-consent checkbox — customer signup (Canada)
**Location:** `apps/web/src/app/auth/signup/page.tsx` — separate, unticked-by-default, below the T&C box

> **DRAFT — Marketing Email Opt-In (optional).**
> ☐ Yes, I'd like to receive promotional emails from RideNDine about new chefs, menu drops, and offers in my area. I understand I can unsubscribe at any time using the link in any email. (You can still use RideNDine without this.)

#### Driver — Safe-driving in-app prompt
**Location:** `apps/driver-app/src/app/offers/page.tsx` — modal on first session each day

> **DRAFT — Drive Safely.** Do not interact with this app while your vehicle is in motion. Pull over safely before accepting offers, viewing maps, or capturing proof-of-delivery photos. Follow all traffic laws and local regulations. RideNDine is not responsible for traffic violations or accidents resulting from app use while driving. **[I Understand]**

#### Account deletion — confirmation step
**Location:** `apps/web/src/app/account/settings/page.tsx` (and chef/driver equivalents)

> **DRAFT — Account Deletion Notice.** Deleting your account removes your profile, saved addresses, and payment methods from active use. Order history, financial records, and tax documents are retained for **seven (7) years** as required by Canadian tax and consumer-protection law. Reviews you've written remain visible but become anonymized. This action cannot be undone. **[Cancel] [Permanently Delete]**

#### Reviews — moderation notice
**Location:** `apps/web/src/app/orders/[id]/review/page.tsx` (above review submit form)

> **DRAFT — Review Guidelines.** Reviews must reflect your genuine experience with this order. Do not include personal information about the chef or driver, profanity, threats, or defamatory content. RideNDine may remove or edit reviews that violate these guidelines. By submitting, you grant RideNDine a perpetual licence to display your review on our platform.

#### Surge / dynamic pricing (if/when enabled)
**Location:** delivery-fee line on checkout when surge multiplier > 1.0

> **DRAFT — Surge Pricing.** Delivery fee is currently elevated due to high demand or limited driver availability. The fee shown is final for this order — it will not change after you place the order.

#### Restricted items — age-gate (if alcohol/cannabis later enabled; N/A for soft launch)
**Location:** modal before viewing restricted listings

> **DRAFT — Age-Restricted Item.** You must be **19 or older** (Ontario) to purchase this item. ID verification will be required at delivery. The driver may refuse delivery without acceptable government-issued photo ID. By continuing, you confirm you meet the legal age requirement.

#### Chef storefront publish confirmation
**Location:** `apps/chef-admin/src/app/dashboard/storefront/page.tsx` (Publish button modal)

> **DRAFT — Publish Storefront.** By publishing, you confirm: (1) all menu items, prices, and allergen info are accurate; (2) you hold any required food-handler certifications and municipal permits; (3) you can fulfill orders during the hours shown. You can unpublish at any time.

#### Chef tax — T4A threshold notice
**Location:** `apps/chef-admin/src/app/dashboard/payouts/page.tsx` (banner on payouts page)

> **DRAFT — Tax Reporting.** RideNDine reports payments to chefs earning over **CAD $500/year** to the CRA on a T4A slip. You are responsible for declaring all platform income on your tax return, regardless of the T4A threshold. We are not your accountant — consult a tax professional for advice specific to your situation.

#### Driver tip policy
**Location:** `apps/driver-app/src/app/earnings/page.tsx` (footer note)

> **DRAFT — Tips.** 100% of customer tips go to the driver. RideNDine does not take a fee on tips. Tips are paid out on the same schedule as delivery earnings.

#### Footer legal links (all customer-facing pages)
**Location:** `apps/web/src/components/layout/footer.tsx`

> **DRAFT — Footer copy.** © 2026 RideNDine Inc. RideNDine is a marketplace platform; food is prepared by independent home chefs. RideNDine Inc., Hamilton, Ontario, Canada. [Terms] · [Privacy] · [Cookies] · [Contact] · [Accessibility]

---

### When to wire these up

Per direction 2026-05-14: defer wiring of the remaining 13 surfaces until **close to production-readiness**, then engage counsel for a single legal review pass on this whole document plus the 6 already-banner-protected pages.
