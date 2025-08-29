export class ExceptionHelper {
  public static stackFormat(stack?: unknown) {
    if (!stack) {
      return stack;
    }

    return typeof stack === 'string'
      ? stack
          ?.split('\n')
          ?.map((line) => line?.trim())
          ?.filter((line) => line || line !== '')
      : stack;
  }
}
