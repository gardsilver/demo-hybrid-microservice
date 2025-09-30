import {
  KafkaJSError,
  KafkaJSProtocolError,
  KafkaJSConnectionError,
  KafkaJSRequestTimeoutError,
  KafkaJSNumberOfRetriesExceeded,
  KafkaJSOffsetOutOfRange,
  KafkaJSTopicMetadataNotLoaded,
  KafkaJSStaleTopicMetadataAssignment,
  KafkaJSDeleteGroupsError,
  KafkaJSServerDoesNotSupportApiKey,
  KafkaJSDeleteTopicRecordsError,
  KafkaJSAggregateError,
  KafkaJSAlterPartitionReassignmentsError,
} from 'kafkajs';
import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

export class KafkaJsErrorObjectFormatter extends BaseErrorObjectFormatter<KafkaJSError | KafkaJSAggregateError> {
  isInstanceOf(obj: unknown): obj is KafkaJSError | KafkaJSAggregateError {
    return obj instanceof KafkaJSError || obj instanceof KafkaJSAggregateError;
  }

  transform(from: KafkaJSError | KafkaJSAggregateError): IKeyValue<unknown> {
    if (from instanceof KafkaJSAggregateError) {
      return {
        errors: this.unknownFormatter.transform(from.errors),
      };
    }

    let fields: IKeyValue<unknown> = {
      retriable: from.retriable,
      helpUrl: from.helpUrl,
      // KafkaJSConnectionClosedError
      host: 'host' in from ? from['host'] : undefined,
      port: 'port' in from ? from['port'] : undefined,
      // KafkaJSMemberIdRequired
      memberId: 'memberId' in from ? from['memberId'] : undefined,
      // KafkaJSCreateTopicError
      topic: 'topic' in from ? from['topic'] : undefined,
    };

    if (from instanceof KafkaJSProtocolError) {
      fields = {
        ...fields,
        type: from.type,
        code: from.code,
      };
    }

    if (from instanceof KafkaJSOffsetOutOfRange) {
      fields = {
        ...fields,
        topic: from.topic,
        partition: from.partition,
      };
    }

    if (from instanceof KafkaJSNumberOfRetriesExceeded) {
      fields = {
        ...fields,
        retryCount: from.retryCount,
        retryTime: from.retryTime,
      };
    }

    if (from instanceof KafkaJSConnectionError) {
      fields = {
        ...fields,
        broker: from.broker,
        code: 'code' in from ? from['code'] : undefined,
      };
    }

    if (from instanceof KafkaJSRequestTimeoutError) {
      fields = {
        ...fields,
        broker: from.broker,
        correlationId: from.correlationId,
        createdAt: from.createdAt,
        sentAt: from.sentAt,
        pendingDuration: from.pendingDuration,
      };
    }

    if (from instanceof KafkaJSTopicMetadataNotLoaded) {
      fields = {
        ...fields,
        topic: from.topic,
      };
    }

    if (from instanceof KafkaJSStaleTopicMetadataAssignment) {
      fields = {
        ...fields,
        topic: from.topic,
        unknownPartitions: from.unknownPartitions,
      };
    }

    if (from instanceof KafkaJSDeleteGroupsError) {
      fields = {
        ...fields,
        groups: from.groups,
      };
    }

    if (from instanceof KafkaJSServerDoesNotSupportApiKey) {
      fields = {
        ...fields,
        apiKey: from.apiKey,
        apiName: from.apiName,
      };
    }

    if (from instanceof KafkaJSDeleteTopicRecordsError) {
      fields = {
        ...fields,
        partitions: 'partitions' in from ? from['partitions'] : undefined,
      };
    }

    if (from instanceof KafkaJSAlterPartitionReassignmentsError) {
      fields = {
        ...fields,
        topic: from.topic,
        partition: from.partition,
      };
    }

    return fields;
  }
}
