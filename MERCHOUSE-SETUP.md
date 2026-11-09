# Merchouse theme – store setup

Shopify theme for merchouse.co, built on Dawn with a Merchouse layer
(`assets/merchouse*.css|js`, `sections/main-product-merchouse.liquid`,
`sections/main-product-preorder.liquid`, `sections/coming-soon.liquid`, `snippets/mh-*`).

## Hierarchy

```
Organization (school, club, business, church)   e.g. Georgetown HS
 └─ Team                                         e.g. Tennis
     └─ Products, one per design per style       e.g. Fresh Bagels – Tee
```

### Organization (Content → Metaobjects → Organization)
Name, short name (GHS), type, mascot, logo, primary/secondary color, collection.
Internal type handle is `school` (kept from the first version).

### Team (Content → Metaobjects → Team)
Name (Tennis), organization, give-back name ("Georgetown Tennis"), collection, logo, about text.

### Collections
- **Team collection** (e.g. `georgetown-hs-tennis`): automated, includes products whose
  **Team** field equals that team. Products appear here as soon as their Team is set.
- **Organization collection** (e.g. `georgetown-hs`): built from its team collections
  (sub-collections). When you add a team, add its collection to the organization's collection.
- Link each collection back on its Organization/Team entry (Collection field).
- New collections must be published to the Online Store sales channel.

## Products

- **One product per design per style.** Title them `Design – Style`
  (e.g. "Fresh Bagels – Hoodie"); the page shows only "Fresh Bagels".
- **Options (3 max):** `Color`, `Fit` (Adult, Youth), `Size`.
  Delete combinations that don't exist (e.g. Adult / XS, Youth / 2X).
- **Template:** `product` (default) for regular products, `product.preorder` for pre-orders.
- **Images:** 2000 × 2000 px squares; alt text = color + view, e.g. `Ice Blue front`, `Ice Blue back`.

### Product fields (namespace `merchouse`)

| Field | Key | Type | Notes |
|---|---|---|---|
| Team | `merchouse.team` | Team entry | Sets label, give-back name, More From and collections |
| Style | `merchouse.style` | Style entry | Style row name and icon |
| Sibling products | `merchouse.sibling_products` | Product list | Every style version of the design, in display order |
| Default color | `merchouse.default_color` | Text | (reserved) |
| Give-back flat amount | `merchouse.giveback_flat` | Decimal | Premium brands; empty = theme default % |
| Fabric & Fit | `merchouse.fabric_fit` | Rich text | Empty = product description |
| Complete the look | `merchouse.complete_the_look` | Product list | Empty = automatic |

Swatch colors come from Shopify's own option swatches, then **Garment Color** entries
(name + hex), then Theme settings → Merchouse → Swatch colors.

Store-wide: Theme settings → **Merchouse** (default give-back %, swatch colors).
Shipping and Returns tab text: product page → Merchouse product section.
