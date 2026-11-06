# Merchouse theme – product setup

Shopify theme for merchouse.co, built on Dawn with a Merchouse layer
(`assets/merchouse*.css|js`, `sections/main-product-merchouse.liquid`,
`sections/main-product-preorder.liquid`, `sections/coming-soon.liquid`, `snippets/mh-*`).

## Product structure

- **One product per design per style.** "Fresh Bagels – T-Shirt" and
  "Fresh Bagels – Hooded" are separate products.
- **Options (3 max):** `Color`, `Fit` (Adult, Youth), `Size` (XS–3X).
  Delete combinations that don't exist (e.g. Adult / XS, Youth / 2X).
- **Template:** `product` (default) for regular products, `product.preorder`
  for pre-orders.
- **Images:** include the color in the alt text, plus "back" for back views,
  e.g. `Ice Blue front`, `Ice Blue back`. The gallery follows the selected color.

## Metafield definitions

Settings → Custom data → Products → Add definition. Namespace and key must match.

| Name | Namespace and key | Type | Used for |
|---|---|---|---|
| Style | `custom.style` | Single line text | Style name, e.g. T-Shirt (falls back to product type) |
| Style siblings | `custom.style_siblings` | Product (list) | Style row; list every style version of the design |
| Team label | `custom.team_label` | Single line text | "GEORGETOWN HS \| TENNIS" under the title (falls back to vendor) |
| Give-back recipient | `custom.giveback_recipient` | Single line text | "$5 back to …" (falls back to vendor) |
| Give-back flat | `custom.giveback_flat` | Decimal | Flat dollars back (premium brands); blank = theme % |
| Give-back percent | `custom.giveback_percent` | Integer | Overrides the default % for one product |
| Fabric & Fit | `custom.fabric_fit` | Rich text | Fabric & Fit tab (falls back to description) |
| Complete the look | `custom.complete_the_look` | Product (list) | Hand-picked pairings; blank = automatic |
| Team collection | `custom.team_collection` | Collection | "More from"; blank = product's first collection |

Store-wide settings: Online Store → Themes → Customize → Theme settings → **Merchouse**
(default give-back %, swatch colors). Shipping and Returns tab text: product page →
Merchouse product section.
