# DateTimestamp

## Описание
Набор часто используемых констант при работе в датой и временем. Содержит удобную и безопасную (предотвращает случайные мутации даты и времени) оболочку `DateTimestamp` позволяющую комфортно работать с датой и временем как в текстовом формате, так и с объектом даты и времени c поддержкой миллисекунд.


Например представлены преобразования даты и времени в форматы:

 * `DD.MM.YYYY[T]HH:mm:ss`
 * `DD.MM.YYYY[T]HH:mm:ssZ`
 * `YYYY-MM-DD HH:mm:ss`
 * `YYYY-MM-DD HH:mm:ssZ`
 * `YYYY-MM-DD[T]HH:mm:ss.SSSZ`

## Описание поддерживаемых форматов без необходимости явного указания формата
| Единица времени| Формат | Примеры | Примечание |
|---|---|---|---|
|Дата| `DATE_WORLD_STANDARD_FORMAT = 'YYYY-MM-DD'`<br>  `DATE_FORMAT = 'DD.MM.YYYY'`  | `'2025-12-31'` <br> `'31.12.2025'`| Возможный диапазон указания года: `[1900, 9999]` |
|Время|`TIME_FORMAT = 'HH:mm:ss'`<br> `'HH:mm'`<br> `'HH:mm:ss.SSS'` |`'23:12:45'`<br> `'23:12'`<br> `'23:12:45.657'`|-|
|OFFSET| `Z` <br> `+00:00` <br>`+000`<br> `+00` <br> `+0` | - <br> `'+03:00'` (`'+HH:mm'`) <br> `'+180'` (`'+sss'`:  `'+180'='+03:00'='+03'`)<br> `'+0'`|При использовании формата `+0` не рекомендуется  указывать число отличное от `'0'`. Не является корректным. <br> Например: `'01.01.2024 10:00:17+7'` будет приведено к виду `'2024-01-01T07:00:17+00:00'`|
|Дата и время <br> (Возможно комбинировать указанные выше форматы в произвольном виде. В качестве разделителя даты и времени допускается использование `'T'` или `' '`) | `DATE_TIME_FORMAT = 'DD.MM.YYYY HH:mm:ss'`<br> `DATE_TIME_WITHOUT_SECOND_FORMAT = 'DD.MM.YYYY HH:mm'`<br>  `DATE_TIME_WORLD_STANDARD_FORMAT = 'YYYY-MM-DD HH:mm:ss'`<br> `DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT = 'YYYY-MM-DD HH:mm'`<br>  `DATE_BASE_WITHOUT_SECOND_FORMAT = 'YYYY-MM-DD[T]HH:mmZ'`<br> `DATE_BASE_FORMAT = 'YYYY-MM-DD[T]HH:mm:ssZ'` <br> `DATE_BASE_FORMAT_WITH_MILLISECONDS = 'YYYY-MM-DD[T]HH:mm:ss.SSSZ'`| `'01.12.2025 23:12:45'` <br> `'01.12.2025 23:12'` <br> `'2025-12-31 23:12:45'` <br>`'2025-12-31 23:12'` <br>`'2025-12-31T23:12+03'` <br> `'2025-12-31T23:12:45+03'`<br> `'2025-12-31T23:12:45.657+03'`|  |

##  `DateTimestamp` 
 - `isValid()` Вернет `false`,если были переданы не корректные данные для установки нового значения даты времени.
 - `getMoment()` Вернет копию экземпляра `Moment` (**@see** `moment`).
 - `getUnix()` Количество миллисекунд кратных секундам с начала **Unix Epoch** (`1970-01-01T00:00:00.000+00`).
 - `getTimestamp()` Количество миллисекунд с начала **Unix Epoch** (`1970-01-01T00:00:00.000+00`).
 - `getMilliseconds()` Миллисекунды (`[0-999]`).
 - `diff()` Разница в миллисекундах между двумя объектами `DateTimestamp`.
 - `format()` Приводит `DateTimestamp` к указанному формату. По умолчанию используется `DATE_BASE_FORMAT='YYYY-MM-DD[T]HH:mm:ssZ'`.
 - `clone()` Возвращает копию `DateTimestamp`.
 - `setTimeToStartDay()` Устанавливает время на начало дня: `00:00:00.000`.
 - `setTimeToEndDay()` Устанавливает время на конец дня: `23:59:59.999`.
 - `getUtcOffset()` Возвращает **OFFSET**.
 - `setUtcOffset()` Устанавливает **OFFSET**.
 - `set()` Устанавливает указанную Дату и время.
 - `modify()` Изменяет Дату и время на указанный сдвиг. 

## `DateTimestampHelper`
 - `toTimestamp` Приводит  `DateTimestamp` к `Timestamp` (**@see** `google/protobuf/timestamp.proto`)
 - `fromTimestamp` Приводит `Timestamp` (**@see** `google/protobuf/timestamp.proto`) к  `DateTimestamp`
 - `parseOffset` Из даты время, указанных строкой, получает **OFFSET**.
 - `parseFormat` Из даты время, указанных строкой, определяет используемый формат.
 - `initClientTimezoneOffset` Из даты время, указанных строкой, определяет используемый **OFFSET**.
 
## Utils
 * `delay` - выполняет приостановку выполнения кода на указанное количество миллисекунд.
 * `promisesTimeout` - выбросит исключение `TimeoutError`, если длительность выполнения переданных `Promise` превысит заданный интервал в миллисекундах.
 