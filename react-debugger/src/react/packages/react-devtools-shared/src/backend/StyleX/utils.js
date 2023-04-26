/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                  
import isArray from 'react-devtools-shared/src/isArray';

const cachedStyleNameToValueMap                      = new Map();

export function getStyleXData(data     )               {
  const sources = new Set        ();
  const resolvedStyles = {};

  crawlData(data, sources, resolvedStyles);

  return {
    sources: Array.from(sources).sort(),
    resolvedStyles,
  };
}

export function crawlData(
  data     ,
  sources             ,
  resolvedStyles        ,
)       {
  if (data == null) {
    return;
  }

  if (isArray(data)) {
    data.forEach(entry => {
      if (entry == null) {
        return;
      }

      if (isArray(entry)) {
        crawlData(entry, sources, resolvedStyles);
      } else {
        crawlObjectProperties(entry, sources, resolvedStyles);
      }
    });
  } else {
    crawlObjectProperties(data, sources, resolvedStyles);
  }

  resolvedStyles = Object.fromEntries             (
    Object.entries(resolvedStyles).sort(),
  );
}

function crawlObjectProperties(
  entry        ,
  sources             ,
  resolvedStyles        ,
)       {
  const keys = Object.keys(entry);
  keys.forEach(key => {
    const value = entry[key];
    if (typeof value === 'string') {
      if (key === value) {
        // Special case; this key is the name of the style's source/file/module.
        sources.add(key);
      } else {
        const propertyValue = getPropertyValueForStyleName(value);
        if (propertyValue != null) {
          resolvedStyles[key] = propertyValue;
        }
      }
    } else {
      const nestedStyle = {};
      resolvedStyles[key] = nestedStyle;
      crawlData([value], sources, nestedStyle);
    }
  });
}

function getPropertyValueForStyleName(styleName        )                {
  if (cachedStyleNameToValueMap.has(styleName)) {
    return ((cachedStyleNameToValueMap.get(styleName)     )        );
  }

  for (
    let styleSheetIndex = 0;
    styleSheetIndex < document.styleSheets.length;
    styleSheetIndex++
  ) {
    const styleSheet = ((document.styleSheets[
      styleSheetIndex
    ]     )               );
    let rules                     = null;
    // this might throw if CORS rules are enforced https://www.w3.org/TR/cssom-1/#the-cssstylesheet-interface
    try {
      rules = styleSheet.cssRules;
    } catch (_e) {
      continue;
    }

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
      if (!(rules[ruleIndex] instanceof CSSStyleRule)) {
        continue;
      }
      const rule = ((rules[ruleIndex]     )              );
      const {cssText, selectorText, style} = rule;

      if (selectorText != null) {
        if (selectorText.startsWith(`.${styleName}`)) {
          const match = cssText.match(/{ *([a-z\-]+):/);
          if (match !== null) {
            const property = match[1];
            const value = style.getPropertyValue(property);

            cachedStyleNameToValueMap.set(styleName, value);

            return value;
          } else {
            return null;
          }
        }
      }
    }
  }

  return null;
}