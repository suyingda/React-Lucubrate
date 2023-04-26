/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                   

                                                                       

                                                                          

                                     

import {
  createResponse,
  getRoot,
  reportGlobalError,
  processBinaryChunk,
  close,
} from 'react-client/src/ReactFlightClientStream';
import {processStringChunk} from '../../react-client/src/ReactFlightClientStream';

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

export function createServerReference                     (
  id     ,
  callServer     ,
)                       {
  return noServerCall;
}

function createFromNodeStream   (
  stream          ,
  moduleMap                            ,
)              {
  const response           = createResponse(moduleMap, noServerCall);
  stream.on('data', chunk => {
    if (typeof chunk === 'string') {
      processStringChunk(response, chunk, 0);
    } else {
      processBinaryChunk(response, chunk);
    }
  });
  stream.on('error', error => {
    reportGlobalError(response, error);
  });
  stream.on('end', () => close(response));
  return getRoot(response);
}

export {createFromNodeStream};
