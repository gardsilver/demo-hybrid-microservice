export enum FieldTypes {
  ARRAY = '--array--',
  DEFAULT = '--default--',
}

export enum PruneMessages {
  LIMIT_COUNT_FIELDS = '--- Превышено количество полей ---',
  LIMIT_LENGTH = '...',
  LIMIT_LENGTH_ARRAY = '--- Превышено количество элементов ---',
  LIMIT_DEPTH = '--- Достигнута максимальная глубина вложения ---',
  FIELD_NAME_IS_LIMIT = '---',
}

export enum PruneMarkers {
  LIMIT_COUNT_FIELDS = 'err-log-count-field-max',
  LIMIT_LENGTH = 'err-log-length-max',
  LIMIT_LENGTH_ARRAY = 'err-log-length-array-max',
  LIMIT_DEPTH = 'err-log-depth-max',
}
