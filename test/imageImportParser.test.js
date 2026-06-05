const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  isSupportedImageFile,
  parseQuotationText,
} = require('../src/imageImportParser');

test('parses quotation data from manually pasted recognized text', () => {
  const parsed = parseQuotationText(`
Product model: FD30
Product name: 3 Ton Diesel Forklift
Base FOB price: USD 5,694
FOB port: Qingdao
Quantity: 2 units
Standard configuration:
3,000kg load capacity, Stage III engine, 3000mm mast
Options list:
- Side shifter USD 206
- Front dual solid tires USD 240
`);

  assert.equal(parsed.productModel, 'FD30');
  assert.equal(parsed.productName, '3 Ton Diesel Forklift');
  assert.equal(parsed.baseFobPrice, 5694);
  assert.equal(parsed.fobPort, 'Qingdao');
  assert.equal(parsed.quantity, 2);
  assert.match(parsed.standardConfiguration, /Stage III engine/);
  assert.deepEqual(parsed.options, [
    { name: 'Side shifter', price: 206, included: true },
    { name: 'Front dual solid tires', price: 240, included: true },
  ]);
  assert.ok(parsed.warnings.includes('Multiple prices detected. Please confirm the correct Base FOB price manually.'));
});

test('does not import RMB prices as USD and asks user to confirm multiple prices', () => {
  const parsed = parseQuotationText(`
Model: FB25
Product name: Electric Forklift
Factory price: RMB 80,000
USD 11,200 reference only
USD 11,500 with options
Quantity: 1
`);

  assert.equal(parsed.productModel, 'FB25');
  assert.equal(parsed.baseFobPrice, '');
  assert.ok(parsed.warnings.includes('RMB/CNY/人民币 price detected. It was not imported as USD automatically.'));
  assert.ok(parsed.warnings.includes('Multiple prices detected. Please confirm the correct Base FOB price manually.'));
  assert.ok(parsed.warnings.includes('FOB port is missing. Please confirm before importing.'));
});

test('warns when FOB port is missing', () => {
  const parsed = parseQuotationText(`
Product model: LG936
Product name: Wheel Loader
Base FOB price: USD 28,000
Quantity: 1 unit
`);

  assert.equal(parsed.baseFobPrice, 28000);
  assert.equal(parsed.fobPort, '');
  assert.ok(parsed.warnings.includes('FOB port is missing. Please confirm before importing.'));
});

test('validates supported image file types by MIME type or extension', () => {
  assert.equal(isSupportedImageFile({ name: 'quote.jpg', type: 'image/jpeg' }), true);
  assert.equal(isSupportedImageFile({ name: 'quote.webp', type: '' }), true);
  assert.equal(isSupportedImageFile({ name: 'quote.gif', type: 'image/gif' }), false);
  assert.equal(isSupportedImageFile(null), false);
});
