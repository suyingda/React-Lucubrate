/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */
'use strict';

import * as tmp from 'tmp';
import * as fs from 'fs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import {rollup} from 'rollup';
import path from 'path';

const rollupCache                             = new Map();

// Utility function to read and bundle a standalone browser script
async function getRollupResult(scriptSrc        )                         {
  const cachedResult = rollupCache.get(scriptSrc);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  let tmpFile;
  try {
    tmpFile = tmp.fileSync();
    const rollupConfig = {
      input: require.resolve(scriptSrc),
      onwarn: console.warn,
      plugins: [
        replace({__DEV__: 'true', preventAssignment: true}),
        resolve({
          rootDir: path.join(__dirname, '..', '..', '..'),
        }),
      ],
      output: {
        externalLiveBindings: false,
        freeze: false,
        interop: false,
        esModule: false,
      },
    };
    const outputConfig = {
      file: tmpFile.name,
      format: 'iife',
    };
    const bundle = await rollup(rollupConfig);
    await bundle.write(outputConfig);
    const bundleBuffer = Buffer.alloc(4096);
    let bundleStr = '';
    while (true) {
      // $FlowFixMe[incompatible-call]
      const bytes = fs.readSync(tmpFile.fd, bundleBuffer);
      if (bytes <= 0) {
        break;
      }
      bundleStr += bundleBuffer.slice(0, bytes).toString();
    }
    rollupCache.set(scriptSrc, bundleStr);
    return bundleStr;
  } catch (e) {
    rollupCache.set(scriptSrc, null);
    return null;
  } finally {
    if (tmpFile) {
      tmpFile.removeCallback();
    }
  }
}

async function insertNodesAndExecuteScripts(
  source                    ,
  target      ,
  CSPnonce               ,
) {
  const ownerDocument = target.ownerDocument || target;

  // We need to remove the script content for any scripts that would not run based on CSP
  // We restore the script content after moving the nodes into the target
  const badNonceScriptNodes                       = new Map();
  if (CSPnonce) {
    const scripts = source.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (
        !script.hasAttribute('src') &&
        script.getAttribute('nonce') !== CSPnonce
      ) {
        badNonceScriptNodes.set(script, script.textContent);
        script.textContent = '';
      }
    }
  }
  let lastChild = null;
  while (source.firstChild) {
    const node = source.firstChild;
    if (lastChild === node) {
      throw new Error('Infinite loop.');
    }
    lastChild = node;

    if (node.nodeType === 1) {
      const element          = (node     );
      if (
        // $FlowFixMe[prop-missing]
        element.dataset != null &&
        (element.dataset.rxi != null ||
          element.dataset.rri != null ||
          element.dataset.rci != null ||
          element.dataset.rsi != null)
      ) {
        // Fizz external runtime instructions are expected to be in the body.
        // When we have renderIntoContainer and renderDocument this will be
        // more enforceable. At the moment you can misconfigure your stream and end up
        // with instructions that are deep in the document
        (ownerDocument.body     ).appendChild(element);
      } else {
        target.appendChild(element);

        if (element.nodeName === 'SCRIPT') {
          await executeScript(element);
        } else {
          const scripts = element.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            await executeScript(script);
          }
        }
      }
    } else {
      target.appendChild(node);
    }
  }

  // restore the textContent now that we have finished attempting to execute scripts
  badNonceScriptNodes.forEach((scriptContent, script) => {
    script.textContent = scriptContent;
  });
}

async function executeScript(script         ) {
  const ownerDocument = script.ownerDocument;
  if (script.parentNode == null) {
    throw new Error(
      'executeScript expects to be called on script nodes that are currently in a document',
    );
  }
  const parent = script.parentNode;
  const scriptSrc = script.getAttribute('src');
  if (scriptSrc) {
    const rollupOutput = await getRollupResult(scriptSrc);
    if (rollupOutput) {
      const transientScript = ownerDocument.createElement('script');
      transientScript.textContent = rollupOutput;
      parent.appendChild(transientScript);
      parent.removeChild(transientScript);
    }
  } else {
    const newScript = ownerDocument.createElement('script');
    newScript.textContent = script.textContent;
    parent.insertBefore(newScript, script);
    parent.removeChild(script);
  }
}

function mergeOptions(options        , defaultOptions        )         {
  return {
    ...defaultOptions,
    ...options,
  };
}

function stripExternalRuntimeInNodes(
  nodes                                             ,
  externalRuntimeSrc               ,
)                {
  if (!Array.isArray(nodes)) {
    nodes = Array.from(nodes);
  }
  if (externalRuntimeSrc == null) {
    return nodes;
  }
  return nodes.filter(
    n =>
      (n.tagName !== 'SCRIPT' && n.tagName !== 'script') ||
      n.getAttribute('src') !== externalRuntimeSrc,
  );
}

// Since JSDOM doesn't implement a streaming HTML parser, we manually overwrite
// readyState here (currently read by ReactDOMServerExternalRuntime). This does
// not trigger event callbacks, but we do not rely on any right now.
async function withLoadingReadyState   (
  fn         ,
  document          ,
)             {
  // JSDOM implements readyState in document's direct prototype, but this may
  // change in later versions
  let prevDescriptor = null;
  let proto         = document;
  while (proto != null) {
    prevDescriptor = Object.getOwnPropertyDescriptor(proto, 'readyState');
    if (prevDescriptor != null) {
      break;
    }
    proto = Object.getPrototypeOf(proto);
  }
  Object.defineProperty(document, 'readyState', {
    get() {
      return 'loading';
    },
    configurable: true,
  });
  const result = await fn();
  // $FlowFixMe[incompatible-type]
  delete document.readyState;
  if (prevDescriptor) {
    Object.defineProperty(proto, 'readyState', prevDescriptor);
  }
  return result;
}

export {
  insertNodesAndExecuteScripts,
  mergeOptions,
  stripExternalRuntimeInNodes,
  withLoadingReadyState,
};
