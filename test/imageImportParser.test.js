const assert = require('node:assert/strict');
const { test } = require('node:test');

const { NEED_REVIEW, parseImageImportText } = require('../src/imageImportParser');

test('parses clear USD FOB quotation data and selected options', () => {
  const parsed = parseImageImportText(`
Product model: FD30
Product name: 3 Ton Diesel Forklift
FOB port: Qingdao
Quantity: 1
Base FOB price: FOB USD 5694
Standard configuration: 3 ton load capacity, Stage III engine, 3000mm duplex mast
Options:
- Side shifter: USD 206 included
- Front dual solid tires: USD 412 not included
`);

  assert.equal(parsed.extractedData.productModel, 'FD30');
  assert.equal(parsed.extractedData.productName, '3 Ton Diesel Forklift');
  assert.equal(parsed.extractedData.baseFobPrice, 5694);
  assert.equal(parsed.extractedData.fobPort, 'Qingdao');
  assert.equal(parsed.extractedData.quantity, 1);
  assert.match(parsed.extractedData.standardConfiguration, /Stage III/);
  assert.deepEqual(parsed.extractedData.options, [
    { optionName: 'Side shifter', optionPrice: 206, included: true },
    { optionName: 'Front dual solid tires', optionPrice: 412, included: false },
  ]);
});

test('does not import RMB or CNY prices as USD prices', () => {
  const parsed = parseImageImportText(`
Model: FD30
Product name: 3 Ton Diesel Forklift
FOB port: Qingdao
Quantity: 1
Base price: RMB 39000
Option: Side shifter CNY 1450
`);

  assert.equal(parsed.extractedData.baseFobPrice, NEED_REVIEW);
  assert.equal(parsed.extractedData.options.length, 0);
  assert.ok(parsed.warnings.includes('RMB/CNY price detected. Please convert or confirm USD price manually.'));
  assert.ok(parsed.warnings.includes('Currency is unclear. Please confirm before quotation.'));
});

test('marks base FOB price as Need review when multiple USD price candidates are detected', () => {
  const parsed = parseImageImportText(`
Model: FD30
Product name: 3 Ton Diesel Forklift
FOB port: Qingdao
Quantity: 1
FOB USD 5694
EXW USD 5400
Exchange rate 6.70-6.8999
`);

  assert.equal(parsed.extractedData.baseFobPrice, NEED_REVIEW);
  assert.ok(parsed.warnings.includes('Multiple prices detected. Please confirm the correct FOB price.'));
  assert.ok(parsed.warnings.some((warning) => warning.startsWith('Exchange rate detected for internal review only:')));
});

test('detects missing FOB port and unclear currency risks', () => {
  const parsed = parseImageImportText(`
Product model: FD30
Product name: 3 Ton Diesel Forklift
Quantity: 1
Base price 5694
`);

  assert.equal(parsed.extractedData.fobPort, NEED_REVIEW);
  assert.ok(parsed.warnings.includes('FOB port is missing. Please confirm.'));
  assert.ok(parsed.warnings.includes('Currency is unclear. Please confirm before quotation.'));
});
