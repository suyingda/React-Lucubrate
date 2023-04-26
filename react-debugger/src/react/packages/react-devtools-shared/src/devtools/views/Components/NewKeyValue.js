/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import * as React from 'react';
import {useState} from 'react';
import Store from '../../store';
import EditableName from './EditableName';
import EditableValue from './EditableValue';
import {parseHookPathForEdit} from './utils';
import styles from './NewKeyValue.css';

                                              
                                                                     

              
                         
                
                  
                   
                                     
                               
               
                                                
  

export default function NewKeyValue({
  bridge,
  depth,
  hidden,
  hookID,
  inspectedElement,
  path,
  store,
  type,
}       )             {
  const [newPropKey, setNewPropKey] = useState        (0);
  const [newPropName, setNewPropName] = useState        ('');

  // $FlowFixMe[missing-local-annot]
  const overrideNewEntryName = (oldPath     , newPath) => {
    setNewPropName(newPath[newPath.length - 1]);
  };

  const overrideNewEntryValue = (
    newPath                        ,
    value     ,
  ) => {
    if (!newPropName) {
      return;
    }

    setNewPropName('');
    setNewPropKey(newPropKey + 1);

    const {id} = inspectedElement;
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      let basePath                         = newPath;
      if (hookID != null) {
        basePath = parseHookPathForEdit(basePath);
      }

      bridge.send('overrideValueAtPath', {
        type,
        hookID,
        id,
        path: basePath,
        rendererID,
        value,
      });
    }
  };

  return (
    <div
      key={newPropKey}
      hidden={hidden}
      style={{
        paddingLeft: `${(depth - 1) * 0.75}rem`,
      }}>
      <div className={styles.NewKeyValue}>
        <EditableName
          autoFocus={newPropKey > 0}
          className={styles.EditableName}
          overrideName={overrideNewEntryName}
          path={[]}
        />
        :&nbsp;
        <EditableValue
          className={styles.EditableValue}
          overrideValue={overrideNewEntryValue}
          path={[...path, newPropName]}
          value={''}
        />
      </div>
    </div>
  );
}
