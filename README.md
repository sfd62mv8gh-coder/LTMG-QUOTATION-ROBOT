# LTMG Quotation Tool

LTMG Quotation Tool is a simple internal web quotation calculator for foreign trade sales of construction machinery and logistics/material-handling equipment.

The V1 tool focuses on fast local quotation calculation for products such as forklifts, loaders, excavators, aerial work platforms, telehandlers, and warehouse equipment. It does not store customer private information, does not connect to external APIs, and does not include login or payment features.

## V1 Features

- Simple browser-based quotation form.
- Default sample product: `FD30` / `3 Ton Diesel Forklift`.
- Base FOB price, FOB port, quantity, markup type, markup value, standard configuration, and option inputs.
- Option rows can be included or excluded from the final price.
- Transparent price breakdown:
  - Base FOB price
  - Options total
  - Markup
  - Final FOB unit price
  - Quantity
  - Total FOB amount
- Automatic WhatsApp-style quotation text with validity and warranty in English, Spanish, and Portuguese.
- Form validation for required fields and invalid numeric values.

## Price Calculation Rules

The calculator uses these V1 formulas:

```text
options_total = sum of selected option prices
```

If markup type is fixed amount per unit:

```text
final_unit_price = base_fob_price + options_total + markup_value
```

If markup type is percentage:

```text
final_unit_price = (base_fob_price + options_total) * (1 + markup_value / 100)
```

Total amount:

```text
total_amount = final_unit_price * quantity
```


## Quote Language Output

Use the **Quote language / 报价语言** selector on the right side of the page to switch the customer-facing WhatsApp quotation text.

Available languages:

- `English`
- `Español` for Latin American customers
- `Português`

The Spanish output keeps trade terms such as `FOB Qingdao` unchanged and uses the following technical wording:

- `load capacity` → `capacidad de carga`
- `lifting height` → `altura de elevación`
- `side shifter` → `desplazador lateral`
- `triplex full free mast` → `mástil triplex full free`

## How to Install on Windows

No complex framework is required. You only need a browser for normal use.

For running automated tests, install Node.js:

1. Go to the official Node.js website: <https://nodejs.org/>
2. Download and install the LTS version for Windows.
3. Open **Command Prompt** or **PowerShell**.
4. Check that Node.js is installed:

```powershell
node --version
npm --version
```

## How to Run on Windows

### Option 1: Open directly in a browser

1. Download or copy this project folder to your Windows computer.
2. Open the project folder.
3. Double-click `index.html`.
4. The quotation calculator will open in your default browser.

### Option 2: Run with a local server

If you prefer to run it with a local web server:

1. Open **Command Prompt** or **PowerShell** in the project folder.
2. Run:

```powershell
npx serve .
```

3. Open the local URL shown in the terminal, usually something like:

```text
http://localhost:3000
```

## How to Test

Automated tests cover the quotation calculation logic, validation behavior, USD formatting, and generated English, Spanish, and Portuguese quotation text.

Run this command in the project folder:

```powershell
npm test
```

Manual test steps:

1. Open `index.html` in a browser.
2. Confirm the FD30 sample data is loaded automatically.
3. Confirm the selected `Side shifter` option adds `206 USD` to the options total.
4. Confirm the default fixed markup adds `300 USD` per unit.
5. Confirm the final unit price is `USD 6,200.00` for the default sample.
6. Check another option, such as `Front dual solid tires`, and confirm the price updates immediately.
7. Change markup type to `Percentage`, enter a percentage value, and confirm the price breakdown updates.
8. Clear a required field or enter invalid text in a price field and confirm the page shows validation errors instead of crashing.
9. Confirm the English WhatsApp quote includes product name, model, selected options, FOB port, unit price, quantity, total price, validity, and warranty.
10. Change **Quote language / 报价语言** to `Español` and confirm the quote changes to Spanish for Latin American customers, including `capacidad de carga`, `desplazador lateral`, and `FOB Qingdao`.
11. Change **Quote language / 报价语言** to `Português` and confirm the quote changes to Portuguese.

## How to Modify Default Product Data

Default sample data is stored in `src/defaultData.js`.

To change the default product:

1. Open `src/defaultData.js`.
2. Edit the `sampleProduct` values:
   - `productModel`
   - `productName`
   - `baseFobPrice`
   - `fobPort`
   - `quantity`
   - `markupType`
   - `markupValue`
   - `standardConfiguration`
   - `options`
3. Save the file.
4. Refresh `index.html` in the browser.

Example option format:

```js
{ name: 'Side shifter', price: 206, included: true }
```

Use `included: true` if the option should be counted in the default final price. Use `included: false` if it should be visible but not included by default.

## Current Limitations

- V1 supports WhatsApp-style quotation text in English, Spanish, and Portuguese.
- V1 does not generate PI documents, configuration sheets, container-loading plans, or spare-parts lists yet.
- V1 does not save quotation history.
- V1 does not include advanced language editing templates yet.
- V1 does not include lithium-battery dangerous-goods fee automation yet; this should be added as a separate reminder feature in a future version.
