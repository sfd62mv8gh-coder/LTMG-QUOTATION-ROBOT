(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LtmgCalculator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MARKUP_TYPES = {
    FIXED: 'fixed',
    PERCENTAGE: 'percentage',
  };

  const QUOTE_LANGUAGES = {
    ENGLISH: 'english',
    SPANISH: 'spanish',
    PORTUGUESE: 'portuguese',
  };

  function toNumber(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : NaN;
    }

    if (typeof value !== 'string') {
      return NaN;
    }

    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      return NaN;
    }

    return Number(trimmedValue);
  }

  function validateQuotationInput(input) {
    const errors = [];
    const productModel = String(input.productModel || '').trim();
    const productName = String(input.productName || '').trim();
    const fobPort = String(input.fobPort || '').trim();
    const standardConfiguration = String(input.standardConfiguration || '').trim();
    const markupType = input.markupType;
    const baseFobPrice = toNumber(input.baseFobPrice);
    const quantity = toNumber(input.quantity);
    const markupValue = toNumber(input.markupValue);

    if (!productModel) errors.push('Product model is required.');
    if (!productName) errors.push('Product name is required.');
    if (!fobPort) errors.push('FOB port is required.');
    if (!standardConfiguration) errors.push('Standard configuration is required.');
    if (!Number.isFinite(baseFobPrice) || baseFobPrice < 0) errors.push('Base FOB price must be a valid number greater than or equal to 0.');
    if (!Number.isInteger(quantity) || quantity <= 0) errors.push('Quantity must be a whole number greater than 0.');
    if (!Number.isFinite(markupValue) || markupValue < 0) errors.push('Markup value must be a valid number greater than or equal to 0.');
    if (![MARKUP_TYPES.FIXED, MARKUP_TYPES.PERCENTAGE].includes(markupType)) errors.push('Markup type is required.');

    const options = (input.options || []).map((option, index) => {
      const optionName = String(option.name || '').trim();
      const optionPrice = toNumber(option.price);
      const included = Boolean(option.included);

      if (!optionName) errors.push(`Option ${index + 1} name is required.`);
      if (!Number.isFinite(optionPrice) || optionPrice < 0) errors.push(`Option ${index + 1} price must be a valid number greater than or equal to 0.`);

      return {
        name: optionName,
        price: optionPrice,
        included,
      };
    });

    return {
      errors,
      normalizedInput: {
        productModel,
        productName,
        baseFobPrice,
        fobPort,
        quantity,
        markupType,
        markupValue,
        standardConfiguration,
        options,
      },
    };
  }

  function calculateQuotation(input) {
    const { errors, normalizedInput } = validateQuotationInput(input);
    if (errors.length > 0) {
      return { errors, result: null };
    }

    const includedOptions = normalizedInput.options.filter((option) => option.included);

    // optionsTotal is the sum of only the selected options that should be included in the final customer price.
    const optionsTotal = includedOptions.reduce((total, option) => total + option.price, 0);
    const priceBeforeMarkup = normalizedInput.baseFobPrice + optionsTotal;

    // Fixed markup adds the entered USD amount per unit. Percentage markup multiplies the base-plus-options price.
    const markupAmount = normalizedInput.markupType === MARKUP_TYPES.FIXED
      ? normalizedInput.markupValue
      : priceBeforeMarkup * (normalizedInput.markupValue / 100);

    const finalUnitPrice = priceBeforeMarkup + markupAmount;

    // The total FOB amount is the final customer-facing unit price multiplied by the quoted quantity.
    const totalAmount = finalUnitPrice * normalizedInput.quantity;

    return {
      errors: [],
      result: {
        ...normalizedInput,
        includedOptions,
        optionsTotal,
        markupAmount,
        finalUnitPrice,
        totalAmount,
      },
    };
  }

  function formatUsd(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function applyTermMap(text, termMap) {
    return Object.entries(termMap).reduce((translatedText, [englishTerm, translatedTerm]) => {
      return translatedText.replace(new RegExp(englishTerm, 'gi'), translatedTerm);
    }, text);
  }

  function formatFobPort(fobPort) {
    return fobPort.toUpperCase().startsWith('FOB ') ? fobPort : `FOB ${fobPort}`;
  }

  function formatSelectedOptions(options, emptyText, termMap = {}) {
    if (options.length === 0) {
      return `- ${emptyText}`;
    }

    return options
      .map((option) => `- ${applyTermMap(option.name, termMap)}`)
      .join('\n');
  }

  function generateEnglishQuote(result) {
    const selectedOptionsText = formatSelectedOptions(result.includedOptions, 'No extra options included');

    return [
      `Hello, please find our LTMG quotation below:`,
      ``,
      `Product: ${result.productName}`,
      `Model: ${result.productModel}`,
      `Standard configuration: ${result.standardConfiguration}`,
      `Selected options:`,
      selectedOptionsText,
      `FOB port: ${formatFobPort(result.fobPort)}`,
      `Unit price: ${formatUsd(result.finalUnitPrice)} / unit`,
      `Quantity: ${result.quantity} unit${result.quantity > 1 ? 's' : ''}`,
      `Total price: ${formatUsd(result.totalAmount)}`,
      `Validity: 7 days`,
      `Warranty: 1 year or 2000 working hours`,
    ].join('\n');
  }

  function generateSpanishQuote(result) {
    const spanishTermMap = {
      'load capacity': 'capacidad de carga',
      'lifting height': 'altura de elevación',
      'side shifter': 'desplazador lateral',
      'triplex full free mast': 'mástil triplex full free',
    };
    const selectedOptionsText = formatSelectedOptions(result.includedOptions, 'Sin opciones adicionales incluidas', spanishTermMap);

    return [
      `Hola, le comparto nuestra cotización LTMG:`,
      ``,
      `Producto: ${result.productName}`,
      `Modelo: ${result.productModel}`,
      `Configuración estándar: ${applyTermMap(result.standardConfiguration, spanishTermMap)}`,
      `Opciones seleccionadas:`,
      selectedOptionsText,
      `Puerto FOB: ${formatFobPort(result.fobPort)}`,
      `Precio unitario: ${formatUsd(result.finalUnitPrice)} / unidad`,
      `Cantidad: ${result.quantity} unidad${result.quantity > 1 ? 'es' : ''}`,
      `Precio total: ${formatUsd(result.totalAmount)}`,
      `Validez: 7 días`,
      `Garantía: 1 año o 2000 horas de trabajo`,
    ].join('\n');
  }

  function generatePortugueseQuote(result) {
    const portugueseTermMap = {
      'load capacity': 'capacidade de carga',
      'lifting height': 'altura de elevação',
      'side shifter': 'deslocador lateral',
      'triplex full free mast': 'mastro triplex full free',
    };
    const selectedOptionsText = formatSelectedOptions(result.includedOptions, 'Sem opcionais adicionais incluídos', portugueseTermMap);

    return [
      `Olá, segue nossa cotação LTMG:`,
      ``,
      `Produto: ${result.productName}`,
      `Modelo: ${result.productModel}`,
      `Configuração padrão: ${applyTermMap(result.standardConfiguration, portugueseTermMap)}`,
      `Opcionais selecionados:`,
      selectedOptionsText,
      `Porto FOB: ${formatFobPort(result.fobPort)}`,
      `Preço unitário: ${formatUsd(result.finalUnitPrice)} / unidade`,
      `Quantidade: ${result.quantity} unidade${result.quantity > 1 ? 's' : ''}`,
      `Preço total: ${formatUsd(result.totalAmount)}`,
      `Validade: 7 dias`,
      `Garantia: 1 ano ou 2000 horas de trabalho`,
    ].join('\n');
  }

  function generateQuote(result, language = QUOTE_LANGUAGES.ENGLISH) {
    if (language === QUOTE_LANGUAGES.SPANISH) {
      return generateSpanishQuote(result);
    }

    if (language === QUOTE_LANGUAGES.PORTUGUESE) {
      return generatePortugueseQuote(result);
    }

    return generateEnglishQuote(result);
  }

  return {
    MARKUP_TYPES,
    QUOTE_LANGUAGES,
    calculateQuotation,
    formatUsd,
    generateEnglishQuote,
    generatePortugueseQuote,
    generateQuote,
    generateSpanishQuote,
    validateQuotationInput,
  };
});
