/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                

import {
  knownServerReferences,
  createServerReference,
} from './ReactFlightServerReferenceRegistry';

import {
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_PROVIDER_TYPE,
  getIteratorFn,
} from 'shared/ReactSymbols';

import {
  describeObjectForErrorMessage,
  isSimpleObject,
  objectName,
} from 'shared/ReactSerializationErrors';

import isArray from 'shared/isArray';

                     
          
           
          
        
                                  
                      

                                          

// Serializable values
                              
                                         
                        
                                                                         
                                                            
          
           
          
          
        
        
                              
                           
                     
                               // Thenable<ReactServerValue>

                                                            

// function serializeByValueID(id: number): string {
//   return '$' + id.toString(16);
// }

function serializePromiseID(id        )         {
  return '$@' + id.toString(16);
}

function serializeServerReferenceID(id        )         {
  return '$F' + id.toString(16);
}

function serializeSymbolReference(name        )         {
  return '$S' + name;
}

function serializeFormDataReference(id        )         {
  // Why K? F is "Function". D is "Date". What else?
  return '$K' + id.toString(16);
}

function serializeNumber(number        )                  {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}

function serializeUndefined()         {
  return '$undefined';
}

function serializeDateFromDateJSON(dateJSON        )         {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + dateJSON;
}

function serializeBigInt(n        )         {
  return '$n' + n.toString(10);
}

function escapeStringValue(value        )         {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

export function processReply(
  root                  ,
  formFieldPrefix        ,
  resolve                             ,
  reject                        ,
)       {
  let nextPartId = 1;
  let pendingParts = 0;
  let formData                  = null;

  function resolveToJSON(
         
                                                   
                                         
    key        ,
    value                  ,
  )                 {
    const parent = this;

    // Make sure that `parent[key]` wasn't JSONified before `value` was passed to us
    if (__DEV__) {
      // $FlowFixMe[incompatible-use]
      const originalValue = parent[key];
      if (
        typeof originalValue === 'object' &&
        originalValue !== value &&
        !(originalValue instanceof Date)
      ) {
        if (objectName(originalValue) !== 'Object') {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              '%s objects are not supported.%s',
            objectName(originalValue),
            describeObjectForErrorMessage(parent, key),
          );
        } else {
          console.error(
            'Only plain objects can be passed to Server Functions from the Client. ' +
              'Objects with toJSON methods are not supported. Convert it manually ' +
              'to a simple value before passing it to props.%s',
            describeObjectForErrorMessage(parent, key),
          );
        }
      }
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'object') {
      // $FlowFixMe[method-unbinding]
      if (typeof value.then === 'function') {
        // We assume that any object with a .then property is a "Thenable" type,
        // or a Promise type. Either of which can be represented by a Promise.
        if (formData === null) {
          // Upgrade to use FormData to allow us to stream this value.
          formData = new FormData();
        }
        pendingParts++;
        const promiseId = nextPartId++;
        const thenable                = (value     );
        thenable.then(
          partValue => {
            const partJSON = JSON.stringify(partValue, resolveToJSON);
            // $FlowFixMe[incompatible-type] We know it's not null because we assigned it above.
            const data           = formData;
            // eslint-disable-next-line react-internal/safe-string-coercion
            data.append(formFieldPrefix + promiseId, partJSON);
            pendingParts--;
            if (pendingParts === 0) {
              resolve(data);
            }
          },
          reason => {
            // In the future we could consider serializing this as an error
            // that throws on the server instead.
            reject(reason);
          },
        );
        return serializePromiseID(promiseId);
      }
      // TODO: Should we the Object.prototype.toString.call() to test for cross-realm objects?
      if (value instanceof FormData) {
        if (formData === null) {
          // Upgrade to use FormData to allow us to use rich objects as its values.
          formData = new FormData();
        }
        const data           = formData;
        const refId = nextPartId++;
        // Copy all the form fields with a prefix for this reference.
        // These must come first in the form order because we assume that all the
        // fields are available before this is referenced.
        const prefix = formFieldPrefix + refId + '_';
        // $FlowFixMe[prop-missing]: FormData has forEach.
        value.forEach((originalValue               , originalKey        ) => {
          data.append(prefix + originalKey, originalValue);
        });
        return serializeFormDataReference(refId);
      }
      if (!isArray(value)) {
        const iteratorFn = getIteratorFn(value);
        if (iteratorFn) {
          return Array.from((value     ));
        }
      }

      if (__DEV__) {
        if (value !== null && !isArray(value)) {
          // Verify that this is a simple plain object.
          if ((value     ).$$typeof === REACT_ELEMENT_TYPE) {
            console.error(
              'React Element cannot be passed to Server Functions from the Client.%s',
              describeObjectForErrorMessage(parent, key),
            );
          } else if ((value     ).$$typeof === REACT_LAZY_TYPE) {
            console.error(
              'React Lazy cannot be passed to Server Functions from the Client.%s',
              describeObjectForErrorMessage(parent, key),
            );
          } else if ((value     ).$$typeof === REACT_PROVIDER_TYPE) {
            console.error(
              'React Context Providers cannot be passed to Server Functions from the Client.%s',
              describeObjectForErrorMessage(parent, key),
            );
          } else if (objectName(value) !== 'Object') {
            console.error(
              'Only plain objects can be passed to Client Components from Server Components. ' +
                '%s objects are not supported.%s',
              objectName(value),
              describeObjectForErrorMessage(parent, key),
            );
          } else if (!isSimpleObject(value)) {
            console.error(
              'Only plain objects can be passed to Client Components from Server Components. ' +
                'Classes or other objects with methods are not supported.%s',
              describeObjectForErrorMessage(parent, key),
            );
          } else if (Object.getOwnPropertySymbols) {
            const symbols = Object.getOwnPropertySymbols(value);
            if (symbols.length > 0) {
              console.error(
                'Only plain objects can be passed to Client Components from Server Components. ' +
                  'Objects with symbol properties like %s are not supported.%s',
                symbols[0].description,
                describeObjectForErrorMessage(parent, key),
              );
            }
          }
        }
      }

      // $FlowFixMe[incompatible-return]
      return value;
    }

    if (typeof value === 'string') {
      // TODO: Maybe too clever. If we support URL there's no similar trick.
      if (value[value.length - 1] === 'Z') {
        // Possibly a Date, whose toJSON automatically calls toISOString
        // $FlowFixMe[incompatible-use]
        const originalValue = parent[key];
        // $FlowFixMe[method-unbinding]
        if (originalValue instanceof Date) {
          return serializeDateFromDateJSON(value);
        }
      }

      return escapeStringValue(value);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return serializeNumber(value);
    }

    if (typeof value === 'undefined') {
      return serializeUndefined();
    }

    if (typeof value === 'function') {
      const metaData = knownServerReferences.get(value);
      if (metaData !== undefined) {
        const metaDataJSON = JSON.stringify(metaData, resolveToJSON);
        if (formData === null) {
          // Upgrade to use FormData to allow us to stream this value.
          formData = new FormData();
        }
        // The reference to this function came from the same client so we can pass it back.
        const refId = nextPartId++;
        // eslint-disable-next-line react-internal/safe-string-coercion
        formData.set(formFieldPrefix + refId, metaDataJSON);
        return serializeServerReferenceID(refId);
      }
      throw new Error(
        'Client Functions cannot be passed directly to Server Functions. ' +
          'Only Functions passed from the Server can be passed back again.',
      );
    }

    if (typeof value === 'symbol') {
      // $FlowFixMe[incompatible-type] `description` might be undefined
      const name         = value.description;
      if (Symbol.for(name) !== value) {
        throw new Error(
          'Only global symbols received from Symbol.for(...) can be passed to Server Functions. ' +
            `The symbol Symbol.for(${
              // $FlowFixMe[incompatible-type] `description` might be undefined
              value.description
            }) cannot be found among global symbols.`,
        );
      }
      return serializeSymbolReference(name);
    }

    if (typeof value === 'bigint') {
      return serializeBigInt(value);
    }

    throw new Error(
      `Type ${typeof value} is not supported as an argument to a Server Function.`,
    );
  }

  // $FlowFixMe[incompatible-type] it's not going to be undefined because we'll encode it.
  const json         = JSON.stringify(root, resolveToJSON);
  if (formData === null) {
    // If it's a simple data structure, we just use plain JSON.
    resolve(json);
  } else {
    // Otherwise, we use FormData to let us stream in the result.
    formData.set(formFieldPrefix + '0', json);
    if (pendingParts === 0) {
      // $FlowFixMe[incompatible-call] this has already been refined.
      resolve(formData);
    }
  }
}

export {createServerReference};
