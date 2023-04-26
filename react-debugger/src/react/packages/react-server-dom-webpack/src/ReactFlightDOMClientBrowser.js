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
  processStringChunk,
  processBinaryChunk,
  close,
} from 'react-client/src/ReactFlightClientStream';

import {
  processReply,
  createServerReference,
} from 'react-client/src/ReactFlightReplyClient';

                                                                

                       
                                  
  

function createResponseFromOptions(options                ) {
  return createResponse(
    null,
    options && options.callServer ? options.callServer : undefined,
  );
}

function startReadingFromStream(
  response                ,
  stream                ,
)       {
  const reader = stream.getReader();
  function progress({
    done,
    value,
  }   
                  
                
       
   )                       {
    if (done) {
      close(response);
      return;
    }
    const buffer             = (value     );
    processBinaryChunk(response, buffer);
    return reader.read().then(progress).catch(error);
  }
  function error(e     ) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress).catch(error);
}

function createFromReadableStream   (
  stream                ,
  options          ,
)              {
  const response                 = createResponseFromOptions(options);
  startReadingFromStream(response, stream);
  return getRoot(response);
}

function createFromFetch   (
  promiseForResponse                   ,
  options          ,
)              {
  const response                 = createResponseFromOptions(options);
  promiseForResponse.then(
    function (r) {
      startReadingFromStream(response, (r.body     ));
    },
    function (e) {
      reportGlobalError(response, e);
    },
  );
  return getRoot(response);
}

function createFromXHR   (
  request                ,
  options          ,
)              {
  const response                 = createResponseFromOptions(options);
  let processedLength = 0;
  function progress(e               )       {
    const chunk = request.responseText;
    processStringChunk(response, chunk, processedLength);
    processedLength = chunk.length;
  }
  function load(e               )       {
    progress(e);
    close(response);
  }
  function error(e               )       {
    reportGlobalError(response, new TypeError('Network error'));
  }
  request.addEventListener('progress', progress);
  request.addEventListener('load', load);
  request.addEventListener('error', error);
  request.addEventListener('abort', error);
  request.addEventListener('timeout', error);
  return getRoot(response);
}

function encodeReply(
  value                  ,
)          
                                      
  /* We don't use URLSearchParams yet but maybe */ {
  return new Promise((resolve, reject) => {
    processReply(value, '', resolve, reject);
  });
}

export {
  createFromXHR,
  createFromFetch,
  createFromReadableStream,
  encodeReply,
  createServerReference,
};
