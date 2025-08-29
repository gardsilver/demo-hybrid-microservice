import { Metadata } from '@grpc/grpc-js';
import { IBaseHeaders } from 'tests/modules/http/http-common';

export const grpcMetadataFactory = {
  build: (headers?: IBaseHeaders): Metadata => {
    const metadata = new Metadata();

    for (const [k, v] of Object.entries(headers ?? {})) {
      if (Array.isArray(v)) {
        if (k.endsWith('-bin')) {
          metadata.set(k, Buffer.from(JSON.stringify(v), 'utf8'));
        } else {
          metadata.set(`${k}-bin`, Buffer.from(JSON.stringify(v), 'utf8'));
        }
      } else {
        if (k.endsWith('-bin')) {
          metadata.set(k, Buffer.from(v, 'utf8'));
        } else {
          metadata.set(k, v);
        }
      }
    }

    return metadata;
  },
};
