/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                        
                                                                          

             
          
                   
                                            

                                                             
import JSResourceReferenceImpl from 'JSResourceReferenceImpl';

import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';

                                                        
                                   
                                   

             
              
                                  
                          
                                              

import {resolveModelToJSON} from 'react-server/src/ReactFlightServer';

import {
  emitRow,
  resolveClientReferenceMetadata as resolveClientReferenceMetadataImpl,
  close,
} from 'ReactFlightDOMRelayServerIntegration';

             
              
                                  
                          
                                              

export function isClientReference(reference        )          {
  return reference instanceof JSResourceReferenceImpl;
}

export function isServerReference(reference        )          {
  return false;
}

                                                      

export function getClientReferenceKey(
  reference                      ,
)                     {
  // We use the reference object itself as the key because we assume the
  // object will be cached by the bundler runtime.
  return reference;
}

export function resolveClientReferenceMetadata   (
  config                ,
  resource                    ,
)                          {
  return resolveClientReferenceMetadataImpl(config, resource);
}

export function getServerReferenceId   (
  config                ,
  resource                    ,
)                    {
  throw new Error('Not implemented.');
}

export function getServerReferenceBoundArguments   (
  config                ,
  resource                    ,
)                          {
  throw new Error('Not implemented.');
}

                                

export function processErrorChunkProd(
  request         ,
  id        ,
  digest        ,
)        {
  if (__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'processErrorChunkProd should never be called while in development mode. Use processErrorChunkDev instead. This is a bug in React.',
    );
  }

  return [
    'E',
    id,
    {
      digest,
    },
  ];
}

export function processErrorChunkDev(
  request         ,
  id        ,
  digest        ,
  message        ,
  stack        ,
)        {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'processErrorChunkDev should never be called while in production mode. Use processErrorChunkProd instead. This is a bug in React.',
    );
  }

  return [
    'E',
    id,
    {
      digest,
      message,
      stack,
    },
  ];
}

function convertModelToJSON(
  request         ,
  parent                                                                       ,
  key        ,
  model                  ,
)            {
  const json = resolveModelToJSON(request, parent, key, model);
  if (typeof json === 'object' && json !== null) {
    if (isArray(json)) {
      const jsonArray                   = [];
      for (let i = 0; i < json.length; i++) {
        jsonArray[i] = convertModelToJSON(request, json, '' + i, json[i]);
      }
      return jsonArray;
    } else {
      const jsonObj                             = {};
      for (const nextKey in json) {
        if (hasOwnProperty.call(json, nextKey)) {
          jsonObj[nextKey] = convertModelToJSON(
            request,
            json,
            nextKey,
            json[nextKey],
          );
        }
      }
      return jsonObj;
    }
  }
  return json;
}

export function processModelChunk(
  request         ,
  id        ,
  model                  ,
)        {
  const json = convertModelToJSON(request, {}, '', model);
  return ['O', id, json];
}

export function processReferenceChunk(
  request         ,
  id        ,
  reference        ,
)        {
  return ['O', id, reference];
}

export function processImportChunk(
  request         ,
  id        ,
  clientReferenceMetadata                         ,
)        {
  // The clientReferenceMetadata is already a JSON serializable value.
  return ['I', id, clientReferenceMetadata];
}

export function processHintChunk(
  request         ,
  id        ,
  code        ,
  model           ,
)        {
  // The hint is already a JSON serializable value.
  return ['H', code, model];
}

export function scheduleWork(callback            ) {
  callback();
}

export function flushBuffered(destination             ) {}

export const supportsRequestStorage = false;
export const requestStorage                             = (null     );

export function beginWriting(destination             ) {}

export function writeChunk(destination             , chunk       )       {
  // $FlowFixMe[incompatible-call] `Chunk` doesn't flow into `JSONValue` because of the `E` row type.
  emitRow(destination, chunk);
}

export function writeChunkAndReturn(
  destination             ,
  chunk       ,
)          {
  // $FlowFixMe[incompatible-call] `Chunk` doesn't flow into `JSONValue` because of the `E` row type.
  emitRow(destination, chunk);
  return true;
}

export function completeWriting(destination             ) {}

export {close};

export function closeWithError(destination             , error       )       {
  close(destination);
}
