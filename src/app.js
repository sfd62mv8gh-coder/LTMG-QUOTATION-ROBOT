(function () {
  const { sampleProduct } = window.LtmgDefaultData;
  const {
    calculateQuotation,
    formatUsd,
    generateQuote,
  } = window.LtmgCalculator;
  const {
    isSupportedImageFile,
    parseQuotationText,
  } = window.LtmgImageImport;

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

  const imageImport = {
    input: document.getElementById('quotationImageInput'),
    previewPanel: document.getElementById('imagePreviewPanel'),
    preview: document.getElementById('quotationImagePreview'),
    status: document.getElementById('imageImportStatus'),
    recognizedText: document.getElementById('recognizedText'),
    extractButton: document.getElementById('extractQuotationButton'),
    reviewSection: document.getElementById('extractedDataReview'),
    warnings: document.getElementById('extractionWarnings'),
    importButton: document.getElementById('importExtractedDataButton'),
    addReviewOptionButton: document.getElementById('addReviewOptionButton'),
    reviewOptionsList: document.getElementById('reviewOptionsList'),
    reviewFields: {
      productModel: document.getElementById('reviewProductModel'),
      productName: document.getElementById('reviewProductName'),
      baseFobPrice: document.getElementById('reviewBaseFobPrice'),
      fobPort: document.getElementById('reviewFobPort'),
      quantity: document.getElementById('reviewQuantity'),
      standardConfiguration: document.getElementById('reviewStandardConfiguration'),
    },
  };

  let imagePreviewUrl = '';

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

  function createReviewOptionRow(option = { name: '', price: 0, included: true }) {
    const row = document.createElement('div');
    row.className = 'option-row review-option-row';

    row.innerHTML = `
      <label>
        Option name
        <input class="review-option-name" type="text" autocomplete="off">
      </label>
      <label>
        Option price, USD
        <input class="review-option-price" type="number" min="0" step="0.01">
      </label>
      <label class="checkbox-label">
        <input class="review-option-included" type="checkbox">
        Include after import
      </label>
      <button type="button" class="remove-option-button">Remove</button>
    `;

    row.querySelector('.review-option-name').value = option.name;
    row.querySelector('.review-option-price').value = option.price;
    row.querySelector('.review-option-included').checked = option.included;
    row.querySelector('.remove-option-button').addEventListener('click', () => row.remove());
    imageImport.reviewOptionsList.appendChild(row);
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

  function collectReviewInput() {
    const options = Array.from(imageImport.reviewOptionsList.querySelectorAll('.review-option-row')).map((row) => ({
      name: row.querySelector('.review-option-name').value.trim(),
      price: row.querySelector('.review-option-price').value,
      included: row.querySelector('.review-option-included').checked,
    })).filter((option) => option.name);

    return {
      productModel: imageImport.reviewFields.productModel.value.trim(),
      productName: imageImport.reviewFields.productName.value.trim(),
      baseFobPrice: imageImport.reviewFields.baseFobPrice.value,
      fobPort: imageImport.reviewFields.fobPort.value.trim(),
      quantity: imageImport.reviewFields.quantity.value,
      standardConfiguration: imageImport.reviewFields.standardConfiguration.value.trim(),
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

  function showExtractionWarnings(warnings) {
    imageImport.warnings.hidden = warnings.length === 0;
    imageImport.warnings.textContent = '';

    warnings.forEach((warning) => {
      const warningLine = document.createElement('div');
      warningLine.textContent = warning;
      imageImport.warnings.appendChild(warningLine);
    });
  }

  function showExtractedData(parsedData) {
    imageImport.reviewSection.hidden = false;
    imageImport.reviewFields.productModel.value = parsedData.productModel || '';
    imageImport.reviewFields.productName.value = parsedData.productName || '';
    imageImport.reviewFields.baseFobPrice.value = parsedData.baseFobPrice || '';
    imageImport.reviewFields.fobPort.value = parsedData.fobPort || '';
    imageImport.reviewFields.quantity.value = parsedData.quantity || '';
    imageImport.reviewFields.standardConfiguration.value = parsedData.standardConfiguration || '';

    imageImport.reviewOptionsList.innerHTML = '';
    if (parsedData.options.length > 0) {
      parsedData.options.forEach(createReviewOptionRow);
    } else {
      createReviewOptionRow();
    }

    showExtractionWarnings(parsedData.warnings);
  }

  function handleImageSelection() {
    const file = imageImport.input.files && imageImport.input.files[0];

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      imagePreviewUrl = '';
    }

    if (!file) {
      imageImport.previewPanel.hidden = true;
      imageImport.preview.removeAttribute('src');
      imageImport.status.textContent = '';
      return;
    }

    if (!isSupportedImageFile(file)) {
      imageImport.previewPanel.hidden = true;
      imageImport.preview.removeAttribute('src');
      imageImport.input.value = '';
      imageImport.status.textContent = 'Unsupported image type. Please upload JPG, JPEG, PNG, or WEBP.';
      return;
    }

    imagePreviewUrl = URL.createObjectURL(file);
    imageImport.preview.src = imagePreviewUrl;
    imageImport.previewPanel.hidden = false;
    imageImport.status.textContent = `Preview ready: ${file.name}. Paste recognized text below before extracting.`;
  }

  function extractQuotationData() {
    const recognizedText = imageImport.recognizedText.value.trim();
    if (!recognizedText) {
      imageImport.status.textContent = 'Please paste recognized text before extracting quotation data.';
      imageImport.reviewSection.hidden = true;
      return;
    }

    const parsedData = parseQuotationText(recognizedText);
    showExtractedData(parsedData);
    imageImport.status.textContent = 'Extraction complete. Please review the data before importing.';
  }

  function importExtractedData() {
    const reviewedData = collectReviewInput();

    fields.productModel.value = reviewedData.productModel;
    fields.productName.value = reviewedData.productName;
    fields.baseFobPrice.value = reviewedData.baseFobPrice;
    fields.fobPort.value = reviewedData.fobPort;
    fields.quantity.value = reviewedData.quantity;
    fields.standardConfiguration.value = reviewedData.standardConfiguration;

    optionsList.innerHTML = '';
    reviewedData.options.forEach(createOptionRow);
    updateQuotation();
    imageImport.status.textContent = 'Reviewed data imported to quotation form. Please confirm the price breakdown before sending any quote.';
  }

  form.addEventListener('input', updateQuotation);
  form.addEventListener('change', updateQuotation);
  fields.quoteLanguage.addEventListener('change', updateQuotation);
  imageImport.input.addEventListener('change', handleImageSelection);
  imageImport.extractButton.addEventListener('click', extractQuotationData);
  imageImport.importButton.addEventListener('click', importExtractedData);
  imageImport.addReviewOptionButton.addEventListener('click', () => createReviewOptionRow());

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
