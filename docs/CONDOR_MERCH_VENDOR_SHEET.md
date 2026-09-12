# Condor Merch — Drop 01 Vendor Sheet

Research date: 2026-09-12  
Proposed fulfilment merchant: Printful  
Launch region: Australia first

## Decision

Use five underlying Printful catalogue products to fulfil six Condor storefront products. The two T-shirts share the same blank and differ only by garment colour and artwork. This simplifies fulfilment, sizing, QA and future API mapping.

Do not connect live checkout until physical samples are approved.

## Proposed SKU map

| Condor storefront product | Printful blank | Vendor colour | Technique | Sizes | Observed base price* | Approx. AUD base** | Proposed retail | Gross margin before shipping/tax/fees |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| Condor Crest Tee | Men's Staple T-Shirt — AS Colour 5001 | Black | DTG front print | S–3XL | US$19.95 | A$27.73 | A$55 | 49.6% |
| Night Flight Tee | Men's Staple T-Shirt — AS Colour 5001 | Navy or Midnight Blue | DTG front print, silver-tone artwork | S–3XL | US$19.95 | A$27.73 | A$55 | 49.6% |
| Vault Hoodie | Unisex Kangaroo Pocket Hoodie — AS Colour 5101 | Navy or Black | DTG front print; optional embroidery later | S–2XL | US$36.25 | A$50.39 | A$99 | 49.1% |
| Operator Cap | Classic Dad Hat — Yupoong 6245CM | Navy | Front embroidery, gold thread | One size | US$14.02 | A$19.49 | A$45 | 56.7% |
| Cold Storage Mug | Black Glossy Mug | Black | Sublimation | 11 oz | US$8.11 | A$11.27 | A$29 | 61.1% |
| Founders Mark Patch | Embroidered Tactical Patch | Black / circular | Embroidery + hook-and-loop | Circular Ø3 in | US$8.72 | A$12.12 | A$24 | 49.5% |

* Vendor prices are observed catalogue prices and can vary by fulfilment location, production method, colour, size, tax and currency.  
** Approximate conversion uses 1 USD ≈ 1.39 AUD on 2026-09-12. This is planning data, not a final landed cost.

## Product notes

### 1. Condor Crest Tee
Printful product: Men's Staple T-Shirt — AS Colour 5001  
Official page: https://www.printful.com/custom/mens/shirts/mens-staple-t-shirt-as-colour-5001

Why it fits:
- Australia/New Zealand-only Printful catalogue product.
- 100% combed cotton for solid colours.
- 150 g/m².
- Regular fit.
- Sizes S–3XL.
- Black, Navy and Midnight Blue are current listed colours.
- Supports DTG front/back/sleeve printing and chest embroidery.

Design instruction:
- Black blank.
- Gold Condor crest centered on chest.
- Use flat gold artwork, not a metallic-effect promise.
- Keep first drop to one front placement to control cost and visual noise.

### 2. Night Flight Tee
Same blank as Condor Crest Tee.

Design instruction:
- Navy or Midnight Blue blank.
- Condor mark rendered in white/light-grey "silver-tone".
- Do not describe DTG ink as metallic silver.
- Same size architecture as Crest Tee.

Reason for sharing the blank:
- One garment size chart.
- One QA baseline.
- Easier stock/variant mapping in the storefront.
- Lower complexity when Printful API integration begins.

### 3. Vault Hoodie
Printful product: Unisex Kangaroo Pocket Hoodie — AS Colour 5101  
Official page: https://www.printful.com/custom/mens/hoodies/unisex-kangaroo-pocket-hoodie-as-colour-5101

Why it fits:
- Australia/New Zealand-only catalogue product.
- 80% cotton / 20% polyester anti-pill fleece.
- 290 g/m².
- Regular fit.
- Sizes S–2XL.
- Current listed colours include Black, Coal and Navy.
- Supports DTG and embroidery.

Design instruction:
- Use Navy or Black as the actual blank.
- Create the "Vault" teal language in the printed geometry rather than relying on a teal hoodie blank.
- Gold crest + restrained teal geometry.
- Keep sleeve print out of Drop 01 unless sample economics justify the extra placement.

### 4. Operator Cap
Printful product: Classic Dad Hat — Yupoong 6245CM  
Official page: https://www.printful.com/custom/embroidered/dad-hats/classic-dad-cap-yupoong-6245cm

Why it fits:
- Bestseller in Printful's catalogue.
- 100% chino cotton twill in standard colours.
- Unstructured, six-panel, low-profile shape.
- Curved visor.
- Adjustable antique-buckle strap.
- Navy and Black are listed colours.
- Supports front, back and side embroidery.

Design instruction:
- Navy blank.
- Small gold Condor crest on front.
- No text on Drop 01 cap.
- Optional tiny "01" rear embroidery can become a later premium variant.

### 5. Cold Storage Mug
Printful product: Black Glossy Mug  
Official page: https://www.printful.com/custom/mugs/personalized/black-glossy-mug

Why it fits:
- Black ceramic.
- 11 oz and 15 oz variants.
- Sublimation print.
- Dishwasher and microwave safe.
- No order minimum.

Design instruction:
- Launch only the 11 oz size.
- Gold-colour Condor mark.
- Note: the printed gold is a colour simulation, not metallic foil.

### 6. Founders Mark Patch
Printful product: Embroidered Tactical Patches  
Official page: https://www.printful.com/custom/patches/personalized/embroidered-tactical-patches

Why it fits:
- Circular Ø3 in option.
- Hook-and-loop backing.
- Embroidery.
- Matches the "operator / field identity" direction better than a generic iron-on patch.

Design instruction:
- Black background.
- Gold Condor round mark.
- Simplify very fine internal details before digitisation.
- Order a physical sample before approving the embroidery file.

## Shipping policy for launch

Recommendation: charge shipping separately during Drop 01 rather than burying it in retail prices.

Current Printful standard shipping tables show Australia/New Zealand single-product rates such as:
- T-shirts: US$7.69.
- Hoodies: US$11.99.
- Embroidered hats: US$7.79.
- Black/white 11 oz mugs: US$8.39.

Rates vary by product and order composition. Printful also notes that some products, including hats and mugs, may ship separately because of packaging requirements.

This is why the margin table above deliberately excludes shipping.

## Brand/production constraints discovered

1. "Gold" DTG and sublimation artwork is a printed gold colour, not metallic foil.
2. "Silver" DTG artwork should be described as silver-tone / light grey, not metallic silver.
3. The Vault Hoodie should move from a teal garment mock-up to Navy or Black with teal artwork because the selected AS Colour 5101 blank does not currently list a teal colour.
4. The patch should use the simplified round Condor mark because embroidery loses very fine gradients and detail.
5. Hat and apparel embroidery files can require separate digitisation because stitch density/direction differs by product type.

## Sample gate

Before checkout is enabled, order one of each:

- Condor Crest Tee — Black, L
- Night Flight Tee — Navy, L
- Vault Hoodie — Navy, L
- Operator Cap — Navy
- Cold Storage Mug — 11 oz
- Founders Mark Patch — Circular 3 in

Pass criteria:
- Logo proportions correct.
- Gold colour/thread acceptable.
- No unreadable fine detail.
- Garment fit/feel consistent with premium positioning.
- Print and embroidery placement visually balanced.
- Shipping packaging acceptable.
- Real landed cost recorded.

Only after this sample gate should the public merch page be changed from "concept pricing" to "available / coming soon" product commerce.

## Next implementation

Once samples are approved:

1. Update /merch to the exact vendor blanks, colours, sizes and retail prices above.
2. Replace conceptual mock-ups with Printful-generated or photographed product mock-ups.
3. Add real variants.
4. Connect Printful product IDs/API mappings.
5. Add checkout and order fulfilment.
6. Add shipping calculation and order-status handling.
