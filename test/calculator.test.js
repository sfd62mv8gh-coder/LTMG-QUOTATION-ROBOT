const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  calculateQuotation,
  formatUsd,
  generateEnglishQuote,
  generatePortugueseQuote,
  generateQuote,
  generateSpanishQuote,
  MARKUP_TYPES,
  QUOTE_LANGUAGES,
} = require('../src/calculator');
const { sampleProduct } = require('../src/defaultData');

test('calculates fixed per-unit markup with selected options only', () => {
  const { errors, result } = calculateQuotation(sampleProduct);

  assert.deepEqual(errors, []);
  assert.equal(result.optionsTotal, 206);
  assert.equal(result.markupAmount, 300);
  assert.equal(result.finalUnitPrice, 6200);
  assert.equal(result.totalAmount, 6200);
});

test('calculates percentage markup from base price plus selected options', () => {
  const { errors, result } = calculateQuotation({
    ...sampleProduct,
    quantity: 2,
    markupType: MARKUP_TYPES.PERCENTAGE,
    markupValue: 10,
    options: [
      { name: 'Side shifter', price: 206, included: true },
      { name: 'Mast', price: 1000, included: true },
    ],
  });

  assert.deepEqual(errors, []);
  assert.equal(result.optionsTotal, 1206);
  assert.equal(result.finalUnitPrice, 7590);
  assert.equal(result.totalAmount, 15180);
});

test('returns validation errors for empty required fields and invalid numbers', () => {
  const { errors, result } = calculateQuotation({
    productModel: '',
    productName: '',
    baseFobPrice: 'abc',
    fobPort: '',
    quantity: 0,
    markupType: 'fixed',
    markupValue: '',
    standardConfiguration: '',
    options: [{ name: '', price: 'bad', included: true }],
  });

  assert.equal(result, null);
  assert.ok(errors.length >= 7);
  assert.ok(errors.includes('Product model is required.'));
  assert.ok(errors.includes('Base FOB price must be a valid number greater than or equal to 0.'));
  assert.ok(errors.includes('Option 1 price must be a valid number greater than or equal to 0.'));
});

test('generates customer-readable English WhatsApp quotation text', () => {
  const { result } = calculateQuotation(sampleProduct);
  const quote = generateEnglishQuote(result);

  assert.match(quote, /Product: 3 Ton Diesel Forklift/);
  assert.match(quote, /Model: FD30/);
  assert.match(quote, /- Side shifter/);
  assert.match(quote, /FOB port: FOB Qingdao/);
  assert.match(quote, /Validity: 7 days/);
  assert.match(quote, /Warranty: 1 year or 2000 working hours/);
  assert.doesNotMatch(quote, /China III/);
});


test('generates Latin American Spanish WhatsApp quotation text with required technical terms', () => {
  const { result } = calculateQuotation({
    ...sampleProduct,
    standardConfiguration: `${sampleProduct.standardConfiguration} 4500mm lifting height.`,
    options: [
      { name: 'Side shifter', price: 206, included: true },
      { name: '6000mm triplex full free mast', price: 1097, included: true },
    ],
  });
  const quote = generateSpanishQuote(result);

  assert.match(quote, /Hola, le comparto nuestra cotización LTMG:/);
  assert.match(quote, /Configuración estándar:/);
  assert.match(quote, /capacidad de carga/);
  assert.match(quote, /altura de elevación/);
  assert.match(quote, /desplazador lateral/);
  assert.match(quote, /mástil triplex full free/);
  assert.match(quote, /Puerto FOB: FOB Qingdao/);
  assert.match(quote, /Validez: 7 días/);
  assert.match(quote, /Garantía: 1 año o 2000 horas de trabajo/);
  assert.doesNotMatch(quote, /China III/);
});

test('generates Portuguese WhatsApp quotation text when Portuguese is selected', () => {
  const { result } = calculateQuotation(sampleProduct);
  const quote = generatePortugueseQuote(result);

  assert.match(quote, /Olá, segue nossa cotação LTMG:/);
  assert.match(quote, /Produto: 3 Ton Diesel Forklift/);
  assert.match(quote, /capacidade de carga/);
  assert.match(quote, /deslocador lateral/);
  assert.match(quote, /Porto FOB: FOB Qingdao/);
  assert.match(quote, /Validade: 7 dias/);
  assert.match(quote, /Garantia: 1 ano ou 2000 horas de trabalho/);
});

test('dispatches quote generation based on selected language', () => {
  const { result } = calculateQuotation(sampleProduct);

  assert.equal(generateQuote(result, QUOTE_LANGUAGES.ENGLISH), generateEnglishQuote(result));
  assert.equal(generateQuote(result, QUOTE_LANGUAGES.SPANISH), generateSpanishQuote(result));
  assert.equal(generateQuote(result, QUOTE_LANGUAGES.PORTUGUESE), generatePortugueseQuote(result));
});

test('formats USD values consistently', () => {
  assert.equal(formatUsd(6200), '$6,200.00');
});
