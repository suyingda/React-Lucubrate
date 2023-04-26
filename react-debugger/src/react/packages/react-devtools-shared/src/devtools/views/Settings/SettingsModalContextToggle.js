/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import * as React from 'react';
import {useCallback, useContext, useMemo} from 'react';
import {SettingsModalContext} from './SettingsModalContext';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {StoreContext} from '../context';
import {useSubscription} from '../hooks';

export default function SettingsModalContextToggle()             {
  const {setIsModalShowing} = useContext(SettingsModalContext);
  const store = useContext(StoreContext);
  const {profilerStore} = store;

  const showFilterModal = useCallback(
    () => setIsModalShowing(true),
    [setIsModalShowing],
  );

  // Updating preferences while profiling is in progress could break things (e.g. filtering)
  // Explicitly disallow it for now.
  const isProfilingSubscription = useMemo(
    () => ({
      getCurrentValue: () => profilerStore.isProfiling,
      subscribe: (callback          ) => {
        profilerStore.addListener('isProfiling', callback);
        return () => profilerStore.removeListener('isProfiling', callback);
      },
    }),
    [profilerStore],
  );
  const isProfiling = useSubscription         (isProfilingSubscription);

  return (
    <Button
      disabled={isProfiling}
      onClick={showFilterModal}
      title="View settings">
      <ButtonIcon type="settings" />
    </Button>
  );
}
