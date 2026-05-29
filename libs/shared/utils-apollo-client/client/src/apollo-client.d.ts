import '@apollo/client';
import type { HKT } from '@apollo/client/utilities';

declare module '@apollo/client' {
  interface PreserveDataHKT<TData = unknown> extends HKT {
    arg1: TData;
    return: this['arg1'];
  }

  export interface TypeOverrides {
    signatureStyle: 'classic';
    Complete: PreserveDataHKT;
    MaybeMasked: PreserveDataHKT;
    Partial: PreserveDataHKT;
    Streaming: PreserveDataHKT;
    Unmasked: PreserveDataHKT;
  }
}
