(function () {
  const { sampleProduct } = window.LtmgDefaultData;
  const { NEED_REVIEW, parseImageImportText } = window.LtmgImageImportParser;
  const {
    calculateQuotation,
    formatUsd,
    generateQuote,
  } = window.LtmgCalculator;

  const form = document.getElementById('quotationForm');
  const errorBox = document.getElementById('errorBox');
  const optionsList = document.getElementById('optionsList');
  const copyStatus = document.getElementById('copyStatus');
  const imageUpload = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const ocrTextInput = document.getElementById('ocrTextInput');
  const imageImportStatus = document.getElementById('imageImportStatus');
  const extractedDataReview = document.getElementById('extractedDataReview');
  const reviewOptionsTableBody = document.getElementById('reviewOptionsTableBody');
  const reviewWarnings = document.getElementById('reviewWarnings');

  let currentExtractedData = null;

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

  const reviewFields = {
    productModel: document.getElementById('reviewProductModel'),
    productName: document.getElementById('reviewProductName'),
    baseFobPrice: document.getElementById('reviewBaseFobPrice'),
    fobPort: document.getElementById('reviewFobPort'),
    quantity: document.getElementById('reviewQuantity'),
    standardConfiguration: document.getElementById('reviewStandardConfiguration'),
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



  function isReviewedValue(value) {
    return value !== NEED_REVIEW && value !== '' && value !== null && value !== undefined;
  }

  function formatReviewValue(value) {
    return isReviewedValue(value) ? String(value) : NEED_REVIEW;
  }

  function renderExtractedDataReview(parsedResult) {
    currentExtractedData = parsedResult.extractedData;
    extractedDataReview.hidden = false;

    reviewFields.productModel.textContent = formatReviewValue(currentExtractedData.productModel);
    reviewFields.productName.textContent = formatReviewValue(currentExtractedData.productName);
    reviewFields.baseFobPrice.textContent = formatReviewValue(currentExtractedData.baseFobPrice);
    reviewFields.fobPort.textContent = formatReviewValue(currentExtractedData.fobPort);
    reviewFields.quantity.textContent = formatReviewValue(currentExtractedData.quantity);
    reviewFields.standardConfiguration.textContent = formatReviewValue(currentExtractedData.standardConfiguration);

    reviewOptionsTableBody.innerHTML = '';
    if (currentExtractedData.options.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="3">Need review</td>';
      reviewOptionsTableBody.appendChild(emptyRow);
    } else {
      currentExtractedData.options.forEach((option) => {
        const row = document.createElement('tr');
        [option.optionName, option.optionPrice, option.included ? 'Yes' : 'No'].forEach((cellValue) => {
          const cell = document.createElement('td');
          cell.textContent = String(cellValue);
          row.appendChild(cell);
        });
        reviewOptionsTableBody.appendChild(row);
      });
    }

    reviewWarnings.innerHTML = '';
    const warnings = parsedResult.warnings.length > 0
      ? parsedResult.warnings
      : ['No major risk detected. Please still confirm all fields before quotation.'];
    warnings.forEach((warning) => {
      const item = document.createElement('li');
      item.textContent = warning;
      reviewWarnings.appendChild(item);
    });
  }

  function importExtractedDataToForm() {
    if (!currentExtractedData) {
      imageImportStatus.textContent = 'Please extract and review data before importing.';
      return;
    }

    fields.productModel.value = isReviewedValue(currentExtractedData.productModel) ? currentExtractedData.productModel : '';
    fields.productName.value = isReviewedValue(currentExtractedData.productName) ? currentExtractedData.productName : '';
    fields.baseFobPrice.value = isReviewedValue(currentExtractedData.baseFobPrice) ? currentExtractedData.baseFobPrice : '';
    fields.fobPort.value = isReviewedValue(currentExtractedData.fobPort) ? currentExtractedData.fobPort : '';
    fields.quantity.value = isReviewedValue(currentExtractedData.quantity) ? currentExtractedData.quantity : '';
    fields.standardConfiguration.value = isReviewedValue(currentExtractedData.standardConfiguration) ? currentExtractedData.standardConfiguration : '';

    optionsList.innerHTML = '';
    currentExtractedData.options.forEach((option) => {
      createOptionRow({
        name: option.optionName,
        price: option.optionPrice,
        included: option.included,
      });
    });

    imageImportStatus.textContent = 'Reviewed data imported. Please check the quotation form before sending to a customer.';
    updateQuotation();
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



  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files && imageUpload.files[0];
    if (!file) {
      imagePreview.hidden = true;
      imagePreview.removeAttribute('src');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      imageImportStatus.textContent = 'Unsupported image type. Please upload JPG, JPEG, PNG, or WEBP.';
      imageUpload.value = '';
      imagePreview.hidden = true;
      imagePreview.removeAttribute('src');
      return;
    }

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
    imageImportStatus.textContent = 'Image preview loaded. Paste OCR text, then click extract.';
  });

  document.getElementById('extractDataButton').addEventListener('click', () => {
    const pastedText = ocrTextInput.value.trim();
    if (!pastedText) {
      imageImportStatus.textContent = 'V1 does not run automatic OCR yet. Please paste recognized text first.';
      return;
    }

    const parsedResult = parseImageImportText(pastedText);
    renderExtractedDataReview(parsedResult);
    imageImportStatus.textContent = 'Extraction complete. Please review warnings before importing.';
  });

  document.getElementById('importExtractedDataButton').addEventListener('click', importExtractedDataToForm);

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
