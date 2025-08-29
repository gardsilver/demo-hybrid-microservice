import { existsSync } from 'fs';
import { join, normalize, sep } from 'path';

export class GrpcProtoPathHelper {
  public static existPaths(paths: string | string[]) {
    const checkPaths: string[] = typeof paths === 'string' ? [paths] : paths;

    for (const path of checkPaths) {
      if (!existsSync(path)) {
        throw new Error(`ProtoPathHelper: path is not exist! (${path}).`);
      }
    }
  }

  public static joinBase(baseDir: string, paths: string | string[]): string[] {
    const root = normalize(baseDir);
    const rootElements = GrpcProtoPathHelper.pathAsElements(root);

    return (typeof paths === 'string' ? [paths] : paths).map((path) => {
      const localPath = normalize(path);
      const localElements = GrpcProtoPathHelper.pathAsElements(localPath);

      if (
        rootElements.length <= localElements.length &&
        localElements.slice(0, rootElements.length).join(sep) === rootElements.join(sep)
      ) {
        return join(root, localElements.slice(rootElements.length).join(sep));
      }

      return join(root, localPath);
    });
  }

  private static pathAsElements(path: string): string[] {
    let elements = path.split(sep);

    if (elements[0] === '') {
      elements = elements.slice(1);
    }

    if (elements[elements.length - 1] === '') {
      elements = elements.slice(0, -1);
    }

    return elements;
  }
}
