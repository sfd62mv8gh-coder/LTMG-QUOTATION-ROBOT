(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LtmgImageImport = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const RMB_PATTERN = /\b(?:rmb|cny|yuan)\b|人民币|元\b/i;
  const USD_PRICE_PATTERN = /(?:usd|us\$|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)|([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:usd|美元)/gi;
  const ANY_PRICE_PATTERN = /(?:usd|us\$|\$|rmb|cny|人民币|¥)\s*[0-9][0-9,]*(?:\.\d{1,2})?|[0-9][0-9,]*(?:\.\d{1,2})?\s*(?:usd|美元|rmb|cny|人民币|元)/gi;

  function normalizeText(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[：]/g, ':')
      .trim();
  }

  function cleanValue(value) {
    return String(value || '')
      .replace(/^[-•*]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseNumber(value) {
    const number = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
  }

  function getLineValue(lines, labelPattern) {
    for (const line of lines) {
      const match = line.match(labelPattern);
      if (match && match[1]) {
        return cleanValue(match[1]);
      }
    }
    return '';
  }

  function collectSectionLines(lines, startPattern, stopPattern) {
    const sectionLines = [];
    let collecting = false;

    for (const line of lines) {
      if (startPattern.test(line)) {
        collecting = true;
        const inlineValue = line.split(':').slice(1).join(':').trim();
        if (inlineValue) sectionLines.push(cleanValue(inlineValue));
        continue;
      }

      if (collecting && stopPattern.test(line)) {
        break;
      }

      if (collecting && line.trim()) {
        sectionLines.push(cleanValue(line));
      }
    }

    return sectionLines;
  }

  function extractUsdPrices(text) {
    const prices = [];
    USD_PRICE_PATTERN.lastIndex = 0;
    let match = USD_PRICE_PATTERN.exec(text);

    while (match) {
      const price = parseNumber(match[1] || match[2]);
      if (price !== null) prices.push(price);
      match = USD_PRICE_PATTERN.exec(text);
    }

    return prices;
  }

  function extractExplicitBaseFobPrice(lines) {
    for (const line of lines) {
      if (!/base\s*fob|fob\s*(?:price|底价)|FOB底价/i.test(line)) continue;

      const usdMatch = line.match(/(?:usd|us\$|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i)
        || line.match(/([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:usd|美元)/i);
      if (usdMatch) {
        return parseNumber(usdMatch[1]);
      }
    }

    return null;
  }

  function extractAllPriceTokens(text) {
    return text.match(ANY_PRICE_PATTERN) || [];
  }

  function extractProductName(lines) {
    const explicitName = getLineValue(lines, /^(?:product\s*name|product|machine|equipment|产品名称|产品|设备)\s*:\s*(.+)$/i);
    if (explicitName) return explicitName;

    const likelyNameLine = lines.find((line) => /(forklift|loader|excavator|telehandler|reach\s*truck|platform|叉车|装载机|挖掘机|高空作业平台)/i.test(line));
    return likelyNameLine ? cleanValue(likelyNameLine.replace(/^(?:name|名称)\s*:\s*/i, '')) : '';
  }

  function extractProductModel(lines) {
    const explicitModel = getLineValue(lines, /^(?:product\s*model|model|型号|产品型号)\s*:\s*(.+)$/i);
    if (explicitModel) return explicitModel;

    const modelLine = lines.find((line) => /\b[A-Z]{1,6}\d{2,4}[A-Z0-9-]*\b/.test(line));
    const modelMatch = modelLine ? modelLine.match(/\b[A-Z]{1,6}\d{2,4}[A-Z0-9-]*\b/) : null;
    return modelMatch ? modelMatch[0] : '';
  }

  function extractFobPort(lines) {
    const explicitPort = getLineValue(lines, /^(?:fob\s*port|port|港口|FOB港口)\s*:\s*(.+)$/i);
    if (explicitPort) return explicitPort.replace(/^FOB\s+/i, '');

    for (const line of lines) {
      if (/\bFOB\s*(?:price|底价|价格)\b/i.test(line)) continue;
      const match = line.match(/\bFOB\s+([A-Za-z][A-Za-z\s-]{1,40})\b/i);
      if (match) {
        return cleanValue(match[1]).replace(/\s+(?:price|unit|qty|quantity).*$/i, '');
      }
    }

    return '';
  }

  function extractQuantity(lines) {
    const explicitQuantity = getLineValue(lines, /^(?:quantity|qty|数量)\s*:\s*(\d+)\b/i);
    if (explicitQuantity) return Number(explicitQuantity);

    for (const line of lines) {
      const match = line.match(/\b(\d+)\s*(?:units?|pcs|台|辆)\b/i);
      if (match) return Number(match[1]);
    }

    return '';
  }

  function extractStandardConfiguration(lines) {
    const stopPattern = /^(?:options?|选配|option\s*list|base\s*fob|fob\s*port|quantity|qty|price|价格|港口|数量)\b/i;
    const sectionLines = collectSectionLines(lines, /^(?:standard\s*configuration|configuration|standard\s*config|标准配置|配置)\s*:/i, stopPattern);
    return sectionLines.join('\n');
  }

  function extractOptions(lines) {
    const stopPattern = /^(?:standard\s*configuration|configuration|base\s*fob|fob\s*port|quantity|qty|product|model|价格|港口|数量|产品|型号)\b/i;
    const optionLines = collectSectionLines(lines, /^(?:options?\s*list|included\s*options|options?|选配项|选配)\s*:/i, stopPattern);

    return optionLines
      .map((line) => {
        const withoutBullet = cleanValue(line);
        if (!withoutBullet) return null;

        const usdMatch = withoutBullet.match(/(.+?)(?:\s*[-–—:]\s*)?(?:usd|us\$|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*$/i)
          || withoutBullet.match(/(.+?)(?:\s*[-–—:]\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:usd|美元)\s*$/i);

        if (usdMatch) {
          return {
            name: cleanValue(usdMatch[1]),
            price: parseNumber(usdMatch[2]) || 0,
            included: true,
          };
        }

        return {
          name: withoutBullet,
          price: 0,
          included: true,
        };
      })
      .filter((option) => option && option.name);
  }

  function parseQuotationText(text) {
    const normalizedText = normalizeText(text);
    const lines = normalizedText.split('\n').map(cleanValue).filter(Boolean);
    const warnings = [];
    const usdPrices = extractUsdPrices(normalizedText);
    const allPriceTokens = extractAllPriceTokens(normalizedText);
    const containsRmb = RMB_PATTERN.test(normalizedText) || /¥\s*\d/.test(normalizedText);
    const fobPort = extractFobPort(lines);
    const explicitBaseFobPrice = extractExplicitBaseFobPrice(lines);

    if (allPriceTokens.length > 1) {
      warnings.push('Multiple prices detected. Please confirm the correct Base FOB price manually.');
    }

    if (containsRmb) {
      warnings.push('RMB/CNY/人民币 price detected. It was not imported as USD automatically.');
    }

    if (!fobPort) {
      warnings.push('FOB port is missing. Please confirm before importing.');
    }

    return {
      productModel: extractProductModel(lines),
      productName: extractProductName(lines),
      baseFobPrice: !containsRmb && explicitBaseFobPrice !== null ? explicitBaseFobPrice : (!containsRmb && usdPrices.length === 1 ? usdPrices[0] : ''),
      fobPort,
      quantity: extractQuantity(lines),
      standardConfiguration: extractStandardConfiguration(lines),
      options: extractOptions(lines),
      warnings,
      priceCandidates: usdPrices,
    };
  }

  function isSupportedImageFile(file) {
    if (!file) return false;
    const fileName = String(file.name || '').toLowerCase();
    return SUPPORTED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/.test(fileName);
  }

  return {
    SUPPORTED_IMAGE_TYPES,
    isSupportedImageFile,
    parseQuotationText,
  };
});
