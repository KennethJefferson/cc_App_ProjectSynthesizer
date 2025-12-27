/** @jsxImportSource @opentui/solid */

import { createContext, useContext, type JSX, type Accessor } from 'solid-js';

/**
 * Factory function for creating typed contexts with providers
 */
export function createSimpleContext<T, P = object>(config: {
  name: string;
  init: (props: P) => T;
}): {
  use: () => T;
  provider: (props: P & { children: JSX.Element }) => JSX.Element;
} {
  const Context = createContext<T | undefined>(undefined);

  function use(): T {
    const ctx = useContext(Context);
    if (ctx === undefined) {
      throw new Error(`${config.name} context must be used within its Provider`);
    }
    return ctx;
  }

  function provider(props: P & { children: JSX.Element }): JSX.Element {
    const value = config.init(props);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
  }

  return { use, provider };
}
