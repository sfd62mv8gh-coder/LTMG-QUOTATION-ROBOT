(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LtmgImageImportParser = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const NEED_REVIEW = 'Need review';

  function normalizeText(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[：]/g, ':')
      .replace(/[，]/g, ',')
      .trim();
  }

  function parseNumber(value) {
    const normalizedValue = String(value || '').replace(/,/g, '').trim();
    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function findLabelValue(lines, labels) {
    const labelPattern = labels.join('|');
    const regex = new RegExp(`^(?:${labelPattern})\\s*[:：-]\\s*(.+)$`, 'i');
    const matchedLine = lines.find((line) => regex.test(line));
    if (!matchedLine) return '';
    return matchedLine.match(regex)[1].trim();
  }

  function detectWarnings(text, lines, usdCandidates, fobCandidates, fobPort) {
    const warnings = [];
    const lowerText = text.toLowerCase();

    if (/\b(rmb|cny)\b|人民币|¥/.test(lowerText)) {
      warnings.push('RMB/CNY price detected. Please convert or confirm USD price manually.');
    }

    if (!/\b(usd|us\$|fob\s+usd)\b/i.test(text)) {
      warnings.push('Currency is unclear. Please confirm before quotation.');
    }

    const nonOptionUsdCandidates = usdCandidates.filter((candidate) => !/option|选配|shifter|mast|tires|fork|attachment/i.test(candidate.line));
    if (fobCandidates.length > 1 || nonOptionUsdCandidates.length > 1) {
      warnings.push('Multiple prices detected. Please confirm the correct FOB price.');
    }

    if (!fobPort) {
      warnings.push('FOB port is missing. Please confirm.');
    }

    const exchangeRateLines = lines.filter((line) => /exchange\s*rate|汇率/i.test(line) || /\b6\.\d{2,4}\s*-\s*6\.\d{2,4}\b/.test(line));
    exchangeRateLines.forEach((line) => {
      warnings.push(`Exchange rate detected for internal review only: ${line}`);
    });

    return [...new Set(warnings)];
  }

  function extractUsdPrices(lines) {
    const usdPriceRegex = /(?:FOB\s*)?(?:USD|US\$|\$)\s*([0-9][0-9,]*(?:\.\d+)?)/gi;
    return lines.flatMap((line) => {
      const matches = [];
      let match = usdPriceRegex.exec(line);
      while (match) {
        matches.push({ line, value: parseNumber(match[1]) });
        match = usdPriceRegex.exec(line);
      }
      return matches.filter((candidate) => candidate.value !== null);
    });
  }

  function extractFobPort(text) {
    const labelPort = text.match(/(?:FOB\s*port|port|港口)\s*[:：-]\s*([A-Za-z][A-Za-z -]+)/i);
    if (labelPort) return labelPort[1].trim().replace(/^FOB\s+/i, '');

    const inlinePort = text.match(/FOB\s+(?!USD\b)([A-Za-z][A-Za-z -]+)/i);
    if (inlinePort) return inlinePort[1].trim();

    return '';
  }

  function extractQuantity(text) {
    const quantityMatch = text.match(/(?:quantity|qty|数量)\s*[:：-]?\s*(\d+)/i);
    if (!quantityMatch) return NEED_REVIEW;
    const quantity = parseNumber(quantityMatch[1]);
    return quantity && quantity > 0 ? quantity : NEED_REVIEW;
  }

  function extractStandardConfiguration(text, lines) {
    const directConfig = text.match(/(?:standard\s*configuration|configuration|standard config|标准配置)\s*[:：-]\s*([\s\S]*?)(?=\n\s*(?:options?|选配|base|FOB|quantity|qty|model|product)\b|$)/i);
    if (directConfig) return directConfig[1].trim().replace(/\n+/g, ' ');

    const configLine = lines.find((line) => /load\s*capacity|lifting\s*height|engine|mast|forks|tires|配置/i.test(line));
    return configLine || NEED_REVIEW;
  }

  function extractBaseFobPrice(lines, usdCandidates) {
    const nonOptionUsdCandidates = usdCandidates.filter((candidate) => !/option|选配|shifter|mast|tires|fork|attachment/i.test(candidate.line));
    const fobCandidates = nonOptionUsdCandidates.filter((candidate) => /FOB/i.test(candidate.line));
    if (nonOptionUsdCandidates.length > 1) {
      return { baseFobPrice: NEED_REVIEW, fobCandidates };
    }

    if (fobCandidates.length === 1) {
      return { baseFobPrice: fobCandidates[0].value, fobCandidates };
    }

    const labeledCandidates = nonOptionUsdCandidates.filter((candidate) => /base|底价|unit\s*price|price/i.test(candidate.line));
    if (labeledCandidates.length === 1 && fobCandidates.length === 0) {
      return { baseFobPrice: labeledCandidates[0].value, fobCandidates };
    }

    return { baseFobPrice: NEED_REVIEW, fobCandidates };
  }

  function cleanOptionName(line) {
    return line
      .replace(/^(?:option|options|选配项?|[-*•\d.\s])+/i, '')
      .replace(/(?:included|include|yes|no|not included|excluded|计入|不计入|是否计入).*$/i, '')
      .replace(/(?:FOB\s*)?(?:USD|US\$|\$)\s*[0-9][0-9,]*(?:\.\d+)?/gi, '')
      .replace(/[:：-]+\s*$/g, '')
      .trim();
  }

  function extractOptions(lines) {
    return lines
      .filter((line) => /(?:option|选配|shifter|mast|tires|fork|attachment|USD|US\$|\$)/i.test(line))
      .map((line) => {
        const priceMatch = line.match(/(?:USD|US\$|\$)\s*([0-9][0-9,]*(?:\.\d+)?)/i);
        if (!priceMatch) return null;

        const optionName = cleanOptionName(line);
        if (!optionName || /base|FOB\s*port|quantity|qty|product\s*name|model/i.test(optionName)) return null;

        return {
          optionName,
          optionPrice: parseNumber(priceMatch[1]),
          included: /included|include|yes|计入/i.test(line) && !/not included|excluded|不计入/i.test(line),
        };
      })
      .filter((option) => option && option.optionPrice !== null);
  }

  function parseImageImportText(rawText) {
    const text = normalizeText(rawText);
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const usdCandidates = extractUsdPrices(lines);
    const { baseFobPrice, fobCandidates } = extractBaseFobPrice(lines, usdCandidates);
    const fobPort = extractFobPort(text);

    const extractedData = {
      productModel: findLabelValue(lines, ['product\\s*model', 'model', '型号']) || NEED_REVIEW,
      productName: findLabelValue(lines, ['product\\s*name', 'name', '产品名称']) || NEED_REVIEW,
      baseFobPrice,
      fobPort: fobPort || NEED_REVIEW,
      quantity: extractQuantity(text),
      standardConfiguration: extractStandardConfiguration(text, lines),
      options: extractOptions(lines),
    };

    return {
      extractedData,
      warnings: detectWarnings(text, lines, usdCandidates, fobCandidates, fobPort),
      rawText: text,
    };
  }

  return {
    NEED_REVIEW,
    parseImageImportText,
  };
});
