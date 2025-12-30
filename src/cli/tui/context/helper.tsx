/** @jsxImportSource @opentui/solid */
/**
 * Context helper - Factory for creating simple contexts
 */

import { createContext, useContext, type JSX } from 'solid-js';

/**
 * Factory for creating typed contexts with providers
 */
export function createSimpleContext<T, Props = {}>(input: {
  name: string;
  init: ((props: Props) => T) | (() => T);
}) {
  const ctx = createContext<T>();

  type ProviderPropsWithChildren = Props & { children?: JSX.Element };

  return {
    provider: (props: ProviderPropsWithChildren) => {
      const init = input.init(props as Props);
      return <ctx.Provider value={init}>{props.children}</ctx.Provider>;
    },
    use() {
      const value = useContext(ctx);
      if (!value) {
        throw new Error(`${input.name} context must be used within a provider`);
      }
      return value;
    },
  };
}
