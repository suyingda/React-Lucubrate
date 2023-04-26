/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

// This file is an intermediate layer to translate between Flight
// calls to stream output over a binary stream.

/*
FLIGHT PROTOCOL GRAMMAR

Response
- RowSequence

RowSequence
- Row RowSequence
- Row

Row
- "J" RowID JSONData
- "M" RowID JSONModuleData
- "H" RowID HTMLData
- "B" RowID BlobData
- "U" RowID URLData
- "E" RowID ErrorData

RowID
- HexDigits ":"

HexDigits
- HexDigit HexDigits
- HexDigit

HexDigit
- 0-F

URLData
- (UTF8 encoded URL) "\n"

ErrorData
- (UTF8 encoded JSON: {message: "...", stack: "..."}) "\n"

JSONData
- (UTF8 encoded JSON) "\n"
  - String values that begin with $ are escaped with a "$" prefix.
  - References to other rows are encoding as JSONReference strings.

JSONReference
- "$" HexDigits

HTMLData
- ByteSize (UTF8 encoded HTML)

BlobData
- ByteSize (Binary Data)

ByteSize
- (unsigned 32-bit integer)
*/

// TODO: Implement HTMLData, BlobData and URLData.

             
          
                   
                                            

import {stringToChunk} from './ReactServerStreamConfig';

                                                     

                                                                  

const stringify = JSON.stringify;

function serializeRowHeader(tag        , id        ) {
  return id.toString(16) + ':' + tag;
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

  const errorInfo      = {digest};
  const row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  return stringToChunk(row);
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

  const errorInfo      = {digest, message, stack};
  const row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  return stringToChunk(row);
}

export function processModelChunk(
  request         ,
  id        ,
  model                  ,
)        {
  // $FlowFixMe[incompatible-type] stringify can return null
  const json         = stringify(model, request.toJSON);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

export function processReferenceChunk(
  request         ,
  id        ,
  reference        ,
)        {
  const json = stringify(reference);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

export function processImportChunk(
  request         ,
  id        ,
  clientReferenceMetadata                  ,
)        {
  // $FlowFixMe[incompatible-type] stringify can return null
  const json         = stringify(clientReferenceMetadata);
  const row = serializeRowHeader('I', id) + json + '\n';
  return stringToChunk(row);
}

export function processHintChunk(
  request         ,
  id        ,
  code        ,
  model           ,
)        {
  const json         = stringify(model);
  const row = serializeRowHeader('H' + code, id) + json + '\n';
  return stringToChunk(row);
}

export {
  scheduleWork,
  flushBuffered,
  beginWriting,
  writeChunk,
  writeChunkAndReturn,
  completeWriting,
  close,
  closeWithError,
} from './ReactServerStreamConfig';
