(function () {
  const { sampleProduct } = window.LtmgDefaultData;
  const {
    calculateQuotation,
    formatUsd,
    generateQuote,
  } = window.LtmgCalculator;

  const form = document.getElementById('quotationForm');
  const errorBox = document.getElementById('errorBox');
  const optionsList = document.getElementById('optionsList');
  const copyStatus = document.getElementById('copyStatus');

  const fields = {
    productModel: document.getElementById('productModel'),
    productName: document.getElementById('productName'),
    baseFobPrice: document.getElementById('baseFobPrice'),
    fobPort: document.getElementById('fobPort'),
    quantity: document.getElementById('quantity'),
    markupType: document.getElementById('markupType'),
    markupValue: document.getElementById('markupValue'),
    standardConfiguration: document.getElementById('standardConfiguration'),
    quoteLanguage: document.getElementById('quoteLanguage'),
  };

  const displays = {
    baseFob: document.getElementById('baseFobDisplay'),
    optionsTotal: document.getElementById('optionsTotalDisplay'),
    markup: document.getElementById('markupDisplay'),
    finalUnitPrice: document.getElementById('finalUnitPriceDisplay'),
    quantity: document.getElementById('quantityDisplay'),
    totalAmount: document.getElementById('totalAmountDisplay'),
    quoteText: document.getElementById('quoteText'),
  };

  function setFieldValues(product) {
    fields.productModel.value = product.productModel;
    fields.productName.value = product.productName;
    fields.baseFobPrice.value = product.baseFobPrice;
    fields.fobPort.value = product.fobPort;
    fields.quantity.value = product.quantity;
    fields.markupType.value = product.markupType;
    fields.markupValue.value = product.markupValue;
    fields.standardConfiguration.value = product.standardConfiguration;
  }

  function createOptionRow(option = { name: '', price: 0, included: false }) {
    const row = document.createElement('div');
    row.className = 'option-row';

    row.innerHTML = `
      <label>
        Option name / 选配名称
        <input class="option-name" type="text" autocomplete="off" required>
      </label>
      <label>
        Option price / 选配价格，USD
        <input class="option-price" type="number" min="0" step="0.01" required>
      </label>
      <label class="checkbox-label">
        <input class="option-included" type="checkbox">
        Included in final price / 计入最终报价
      </label>
      <button type="button" class="remove-option-button">Remove</button>
    `;

    row.querySelector('.option-name').value = option.name;
    row.querySelector('.option-price').value = option.price;
    row.querySelector('.option-included').checked = option.included;
    row.querySelector('.remove-option-button').addEventListener('click', () => {
      row.remove();
      updateQuotation();
    });

    row.addEventListener('input', updateQuotation);
    row.addEventListener('change', updateQuotation);
    optionsList.appendChild(row);
  }

  function loadProduct(product) {
    setFieldValues(product);
    optionsList.innerHTML = '';
    product.options.forEach(createOptionRow);
    updateQuotation();
  }

  function collectInput() {
    const options = Array.from(optionsList.querySelectorAll('.option-row')).map((row) => ({
      name: row.querySelector('.option-name').value,
      price: row.querySelector('.option-price').value,
      included: row.querySelector('.option-included').checked,
    }));

    return {
      productModel: fields.productModel.value,
      productName: fields.productName.value,
      baseFobPrice: fields.baseFobPrice.value,
      fobPort: fields.fobPort.value,
      quantity: fields.quantity.value,
      markupType: fields.markupType.value,
      markupValue: fields.markupValue.value,
      standardConfiguration: fields.standardConfiguration.value,
      options,
    };
  }

  function showErrors(errors) {
    errorBox.hidden = errors.length === 0;
    errorBox.innerHTML = errors.map((error) => `<div>${error}</div>`).join('');
  }

  function clearOutput() {
    displays.baseFob.textContent = 'USD 0.00';
    displays.optionsTotal.textContent = 'USD 0.00';
    displays.markup.textContent = 'USD 0.00';
    displays.finalUnitPrice.textContent = 'USD 0.00';
    displays.quantity.textContent = '0';
    displays.totalAmount.textContent = 'USD 0.00';
    displays.quoteText.value = '';
  }

  function updateQuotation() {
    copyStatus.textContent = '';
    const { errors, result } = calculateQuotation(collectInput());
    showErrors(errors);

    if (errors.length > 0) {
      clearOutput();
      return;
    }

    displays.baseFob.textContent = formatUsd(result.baseFobPrice);
    displays.optionsTotal.textContent = formatUsd(result.optionsTotal);
    displays.markup.textContent = result.markupType === 'fixed'
      ? `${formatUsd(result.markupAmount)} fixed per unit`
      : `${formatUsd(result.markupAmount)} (${result.markupValue}%)`;
    displays.finalUnitPrice.textContent = formatUsd(result.finalUnitPrice);
    displays.quantity.textContent = String(result.quantity);
    displays.totalAmount.textContent = formatUsd(result.totalAmount);
    displays.quoteText.value = generateQuote(result, fields.quoteLanguage.value);
  }

  form.addEventListener('input', updateQuotation);
  form.addEventListener('change', updateQuotation);
  fields.quoteLanguage.addEventListener('change', updateQuotation);

  document.getElementById('addOptionButton').addEventListener('click', () => {
    createOptionRow();
    updateQuotation();
  });

  document.getElementById('resetSampleButton').addEventListener('click', () => loadProduct(sampleProduct));

  document.getElementById('copyQuoteButton').addEventListener('click', async () => {
    if (!displays.quoteText.value) {
      copyStatus.textContent = 'Please fix the form errors before copying.';
      return;
    }

    try {
      await navigator.clipboard.writeText(displays.quoteText.value);
      copyStatus.textContent = 'Quotation text copied.';
    } catch (error) {
      displays.quoteText.select();
      copyStatus.textContent = 'Clipboard unavailable. Please copy the selected text manually.';
    }
  });

  loadProduct(sampleProduct);
})();
